-- =====================================================
-- MockExams — Migration 20260306000007
-- Objet : Correction deliberer_candidat — B4 + M2
-- =====================================================
-- Dépend de : 20260306000005_seuil_rattrapage.sql
--   (colonne examens.seuil_rattrapage requise)
--
-- Correctif B4 (certification) :
--   Le seuil de rattrapage était hardcodé dans deliberer_candidat
--   comme (seuil_phase2 - 200). Le PRD US-04 le définit comme
--   paramètre configurable. On lit désormais examens.seuil_rattrapage.
--   Si rattrapage_actif = true mais seuil_rattrapage IS NULL
--   → RATTRAPAGE non déclenché (guard explicite).
--
-- Correctif M2 (certification) :
--   En mode deux_phases, la décision finale était ADMIS/RATTRAPAGE/NON_ADMIS.
--   Le PRD §4.2 précise que la décision en phase 2 est binaire :
--   ADMIS ou NON_ADMIS. Le RATTRAPAGE ne s'applique qu'en mode unique
--   (avant la phase EPS). Suppression de la branche RATTRAPAGE du bloc deux_phases.
-- =====================================================

CREATE OR REPLACE FUNCTION deliberer_candidat(
  p_candidat_id  uuid,
  p_delibere_par uuid  -- profil qui lance la délibération
)
RETURNS resultat_status
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_examen_id         uuid;
  v_exam_status       exam_status;
  v_mode              deliberation_mode;
  v_seuil_ph1         smallint;
  v_seuil_ph2         smallint;
  v_seuil_rattrapage  smallint;
  v_rattrapage        boolean;
  v_eps_active        boolean;
  v_a_abs_abd         boolean;
  v_eps_inapte        boolean;
  v_moy_ph1           integer;
  v_moy_ph2           integer;
  v_statut_ph1        resultat_status;
  v_statut_final      resultat_status;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'deliberer_candidat : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  -- Charger les paramètres de l'examen (statut inclus pour la garde de phase)
  SELECT
    c.examen_id,
    e.status,
    e.mode_deliberation,
    e.seuil_phase1,
    e.seuil_phase2,
    e.seuil_rattrapage,
    e.rattrapage_actif,
    e.eps_active
  INTO v_examen_id, v_exam_status, v_mode, v_seuil_ph1, v_seuil_ph2, v_seuil_rattrapage, v_rattrapage, v_eps_active
  FROM candidats c
  JOIN examens e ON e.id = c.examen_id
  WHERE c.id = p_candidat_id;

  -- Garde de phase : délibération uniquement en DELIBERATION ou CORRECTION_POST_DELIBERATION
  IF v_exam_status NOT IN ('DELIBERATION', 'CORRECTION_POST_DELIBERATION') THEN
    RAISE EXCEPTION
      'deliberer_candidat : examen doit être en DELIBERATION ou CORRECTION_POST_DELIBERATION (statut: %)',
      v_exam_status;
  END IF;

  -- Vérifier présence d'un ABS ou ABD (toute discipline) → NON_ADMIS immédiat
  SELECT EXISTS (
    SELECT 1
    FROM saisies s
    JOIN lots l           ON l.id = s.lot_id
    JOIN candidat_lots cl ON cl.lot_id = l.id AND cl.candidat_id = p_candidat_id
    WHERE s.candidat_id   = p_candidat_id
      AND s.code_special  IN ('ABS', 'ABD')
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

  -- Vérifier INAPTE EPS (pour mode deux_phases)
  IF v_eps_active THEN
    SELECT EXISTS (
      SELECT 1
      FROM saisies s
      JOIN lots l           ON l.id = s.lot_id
      JOIN examen_disciplines ed ON ed.id = l.examen_discipline_id
      WHERE s.candidat_id  = p_candidat_id
        AND s.code_special = 'INAPTE'
        AND ed.type        = 'eps'
    ) INTO v_eps_inapte;
  END IF;

  -- ── Mode UNIQUE ─────────────────────────────────────────────────────────
  IF v_mode = 'unique' THEN
    v_moy_ph2 := calculer_moyenne_candidat(p_candidat_id, 2);

    IF v_moy_ph2 IS NULL THEN
      RAISE EXCEPTION
        'deliberer_candidat : notes manquantes pour le candidat % (mode unique)',
        p_candidat_id;
    END IF;

    -- B4 : seuil configurable + guard IS NOT NULL (rattrapage_actif sans seuil = NON_ADMIS)
    v_statut_final := CASE
      WHEN v_moy_ph2 >= v_seuil_ph2                                                    THEN 'ADMIS'
      WHEN v_rattrapage AND v_seuil_rattrapage IS NOT NULL
           AND v_moy_ph2 >= v_seuil_rattrapage                                         THEN 'RATTRAPAGE'
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

  -- ── Mode DEUX_PHASES ────────────────────────────────────────────────────
  -- Phase 1 : écrit obligatoire uniquement
  v_moy_ph1 := calculer_moyenne_candidat(p_candidat_id, 1);

  IF v_moy_ph1 IS NULL THEN
    RAISE EXCEPTION
      'deliberer_candidat : notes écrit manquantes pour le candidat % (phase 1)',
      p_candidat_id;
  END IF;

  v_statut_ph1 := CASE
    WHEN v_moy_ph1 >= v_seuil_ph1 THEN 'ADMIS'   -- admissible phase 2
    ELSE 'NON_ADMIS'
  END;

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

  -- Candidat non admissible : pas de phase 2
  IF v_statut_ph1 = 'NON_ADMIS' THEN
    RETURN 'NON_ADMIS';
  END IF;

  -- Phase 2 : toutes disciplines actives
  -- Cas EPS INAPTE : Moyenne_phase2 = Moyenne_phase1 → ADMIS automatique
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

    -- M2 : décision binaire en phase 2 (PRD §4.2) — RATTRAPAGE non applicable après EPS
    v_statut_final := CASE
      WHEN v_moy_ph2 >= v_seuil_ph2 THEN 'ADMIS'
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
