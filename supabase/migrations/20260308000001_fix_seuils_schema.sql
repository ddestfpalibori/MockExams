-- =====================================================
-- MockExams — Correctif Schéma Seuils
-- Migration : 20260308000001_fix_seuils_schema.sql
-- =====================================================
-- Contexte :
--   Les seuils sont stockés en centièmes d'un barème de 20 points
--   (ex : 900 = 9.00/20, 1000 = 10.00/20).
--   F01 retourne aussi en centièmes → comparaisons cohérentes.
--
-- Corrections :
--   1. Ajouter seuil_rattrapage (centièmes, nullable) — était absent du schéma
--   2. Remplacer le hardcode « seuil_phase2 - 200 » dans F02 par seuil_rattrapage
--      (avec fallback COALESCE pour compatibilité descendante)
-- =====================================================


-- ==========================
-- 1. Colonne seuil_rattrapage
-- ==========================
-- NULL = fallback automatique dans F02 (seuil_phase2 - 200 centièmes)

ALTER TABLE examens
  ADD COLUMN IF NOT EXISTS seuil_rattrapage smallint
    CHECK (seuil_rattrapage BETWEEN 0 AND 2000);


-- ==========================
-- 2. Mise à jour F02 : deliberer_candidat
-- ==========================
-- Remplace le hardcode (v_seuil_ph2 - 200) par COALESCE(v_seuil_rattr, v_seuil_ph2 - 200)
-- Comportement identique si seuil_rattrapage IS NULL.

CREATE OR REPLACE FUNCTION deliberer_candidat(
  p_candidat_id  uuid,
  p_delibere_par uuid
)
RETURNS resultat_status
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_examen_id        uuid;
  v_exam_status      exam_status;
  v_mode             deliberation_mode;
  v_seuil_ph1        smallint;
  v_seuil_ph2        smallint;
  v_seuil_rattr      smallint;   -- valeur DB (centièmes), peut être NULL
  v_seuil_rattr_eff  smallint;   -- valeur effective = COALESCE(v_seuil_rattr, v_seuil_ph2 - 200)
  v_rattrapage       boolean;
  v_eps_active       boolean;
  v_a_abs_abd        boolean;
  v_eps_inapte       boolean;
  v_moy_ph1          integer;
  v_moy_ph2          integer;
  v_statut_ph1       resultat_status;
  v_statut_final     resultat_status;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'deliberer_candidat : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  SELECT
    c.examen_id,
    e.status,
    e.mode_deliberation,
    e.seuil_phase1,
    e.seuil_phase2,
    e.seuil_rattrapage,
    e.rattrapage_actif,
    e.eps_active
  INTO v_examen_id, v_exam_status, v_mode,
       v_seuil_ph1, v_seuil_ph2, v_seuil_rattr,
       v_rattrapage, v_eps_active
  FROM candidats c
  JOIN examens e ON e.id = c.examen_id
  WHERE c.id = p_candidat_id;

  IF v_exam_status NOT IN ('DELIBERATION', 'CORRECTION_POST_DELIBERATION') THEN
    RAISE EXCEPTION
      'deliberer_candidat : examen doit être en DELIBERATION ou CORRECTION_POST_DELIBERATION (statut: %)',
      v_exam_status;
  END IF;

  -- Seuil effectif : fourni ou fallback = seuil_phase2 - 200 centièmes (= -2 pts/20)
  v_seuil_rattr_eff := COALESCE(v_seuil_rattr, v_seuil_ph2 - 200);

  -- ABS / ABD → NON_ADMIS immédiat
  SELECT EXISTS (
    SELECT 1
    FROM saisies s
    JOIN lots l           ON l.id = s.lot_id
    JOIN candidat_lots cl ON cl.lot_id = l.id AND cl.candidat_id = p_candidat_id
    WHERE s.candidat_id  = p_candidat_id
      AND s.code_special IN ('ABS', 'ABD')
  ) INTO v_a_abs_abd;

  IF v_a_abs_abd THEN
    INSERT INTO resultats (examen_id, candidat_id, phase, moyenne_centimes, status, delibere_par, delibere_at)
    VALUES (v_examen_id, p_candidat_id, 1, NULL, 'NON_ADMIS', p_delibere_par, now())
    ON CONFLICT (examen_id, candidat_id, phase) DO UPDATE
      SET moyenne_centimes = NULL,
          status           = 'NON_ADMIS',
          delibere_par     = p_delibere_par,
          delibere_at      = now();
    RETURN 'NON_ADMIS';
  END IF;

  -- INAPTE EPS
  IF v_eps_active THEN
    SELECT EXISTS (
      SELECT 1
      FROM saisies s
      JOIN lots l            ON l.id = s.lot_id
      JOIN examen_disciplines ed ON ed.id = l.examen_discipline_id
      WHERE s.candidat_id  = p_candidat_id
        AND s.code_special = 'INAPTE'
        AND ed.type        = 'eps'
    ) INTO v_eps_inapte;
  END IF;

  -- ── Mode UNIQUE ──────────────────────────────────────────────────────────────
  IF v_mode = 'unique' THEN
    v_moy_ph2 := calculer_moyenne_candidat(p_candidat_id, 2);

    IF v_moy_ph2 IS NULL THEN
      RAISE EXCEPTION
        'deliberer_candidat : notes manquantes pour le candidat % (mode unique)',
        p_candidat_id;
    END IF;

    v_statut_final := CASE
      WHEN v_moy_ph2 >= v_seuil_ph2                        THEN 'ADMIS'
      WHEN v_rattrapage AND v_moy_ph2 >= v_seuil_rattr_eff THEN 'RATTRAPAGE'
      ELSE 'NON_ADMIS'
    END;

    INSERT INTO resultats (examen_id, candidat_id, phase, moyenne_centimes, status, delibere_par, delibere_at)
    VALUES (v_examen_id, p_candidat_id, 1, v_moy_ph2, v_statut_final, p_delibere_par, now())
    ON CONFLICT (examen_id, candidat_id, phase) DO UPDATE
      SET moyenne_centimes = v_moy_ph2,
          status           = v_statut_final,
          delibere_par     = p_delibere_par,
          delibere_at      = now();

    RETURN v_statut_final;
  END IF;

  -- ── Mode DEUX_PHASES — Phase 1 ───────────────────────────────────────────────
  v_moy_ph1 := calculer_moyenne_candidat(p_candidat_id, 1);

  IF v_moy_ph1 IS NULL THEN
    RAISE EXCEPTION
      'deliberer_candidat : notes écrit manquantes pour le candidat % (phase 1)',
      p_candidat_id;
  END IF;

  v_statut_ph1 := CASE WHEN v_moy_ph1 >= v_seuil_ph1 THEN 'ADMIS' ELSE 'NON_ADMIS' END;

  INSERT INTO resultats (
    examen_id, candidat_id, phase, moyenne_centimes,
    status, admissible_phase1, delibere_par, delibere_at
  )
  VALUES (
    v_examen_id, p_candidat_id, 1, v_moy_ph1,
    v_statut_ph1, v_statut_ph1 = 'ADMIS', p_delibere_par, now()
  )
  ON CONFLICT (examen_id, candidat_id, phase) DO UPDATE
    SET moyenne_centimes  = v_moy_ph1,
        status            = v_statut_ph1,
        admissible_phase1 = v_statut_ph1 = 'ADMIS',
        delibere_par      = p_delibere_par,
        delibere_at       = now();

  IF v_statut_ph1 = 'NON_ADMIS' THEN
    RETURN 'NON_ADMIS';
  END IF;

  -- ── Mode DEUX_PHASES — Phase 2 ───────────────────────────────────────────────
  IF v_eps_inapte THEN
    v_moy_ph2      := v_moy_ph1;
    v_statut_final := 'ADMIS';
  ELSE
    v_moy_ph2 := calculer_moyenne_candidat(p_candidat_id, 2);

    IF v_moy_ph2 IS NULL THEN
      RAISE EXCEPTION
        'deliberer_candidat : notes phase 2 manquantes pour le candidat %',
        p_candidat_id;
    END IF;

    v_statut_final := CASE
      WHEN v_moy_ph2 >= v_seuil_ph2                        THEN 'ADMIS'
      WHEN v_rattrapage AND v_moy_ph2 >= v_seuil_rattr_eff THEN 'RATTRAPAGE'
      ELSE 'NON_ADMIS'
    END;
  END IF;

  INSERT INTO resultats (examen_id, candidat_id, phase, moyenne_centimes, status, delibere_par, delibere_at)
  VALUES (v_examen_id, p_candidat_id, 2, v_moy_ph2, v_statut_final, p_delibere_par, now())
  ON CONFLICT (examen_id, candidat_id, phase) DO UPDATE
    SET moyenne_centimes = v_moy_ph2,
        status           = v_statut_final,
        delibere_par     = p_delibere_par,
        delibere_at      = now();

  RETURN v_statut_final;
END;
$$;

-- Maintien des droits (identiques à la migration originale)
REVOKE EXECUTE ON FUNCTION deliberer_candidat(uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION deliberer_candidat(uuid, uuid) TO authenticated, service_role;
