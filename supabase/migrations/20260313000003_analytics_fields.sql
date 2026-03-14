-- ==============================================================================
-- Migration 20260313000003 — Analytics M13
-- ==============================================================================
-- 1. Champs optionnels pour désagrégation géographique et scolaire
-- 2. Fonction PostgreSQL get_analytics_examen(uuid) → jsonb
-- ==============================================================================

-- ── Champs optionnels établissements ─────────────────────────────────────────

ALTER TABLE etablissements
  ADD COLUMN IF NOT EXISTS type_milieu text
    CHECK (type_milieu IN ('urbain', 'semi_urbain', 'rural'));

-- ── Champs optionnels candidats ───────────────────────────────────────────────

ALTER TABLE candidats
  ADD COLUMN IF NOT EXISTS classe text;
  -- Exemple : 'Terminale D', 'Terminale C', 'Terminale A4'

-- ── Fonction analytics principale ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_analytics_examen(p_examen_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_examen        record;
  v_global        jsonb;
  v_distribution  jsonb;
  v_disciplines   jsonb;
  v_series        jsonb;
  v_sexe          jsonb;
  v_etabs         jsonb;
  v_centres       jsonb;
  v_milieux       jsonb;
BEGIN
  -- ── Vérification examen ───────────────────────────────────────────────────
  SELECT id, libelle, annee, status
  INTO v_examen
  FROM examens
  WHERE id = p_examen_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Examen introuvable : %', p_examen_id
      USING ERRCODE = 'P0002';
  END IF;

  -- ── Stats globales ────────────────────────────────────────────────────────
  -- Résultat final = dernière phase par candidat (phase 2 si rattrapage effectué)
  WITH final_r AS (
    SELECT DISTINCT ON (r.candidat_id)
      r.candidat_id,
      r.moyenne_centimes,
      r.status,
      r.phase
    FROM resultats r
    WHERE r.examen_id = p_examen_id
    ORDER BY r.candidat_id, r.phase DESC
  ),
  phase1_r AS (
    SELECT status FROM resultats
    WHERE examen_id = p_examen_id AND phase = 1
  )
  SELECT jsonb_build_object(
    'total',               COUNT(*),
    'admis',               COUNT(*) FILTER (WHERE fr.status = 'ADMIS'),
    'rattrapage_initial',  (SELECT COUNT(*) FROM phase1_r WHERE status = 'RATTRAPAGE'),
    'non_admis',           COUNT(*) FILTER (WHERE fr.status = 'NON_ADMIS'),
    'taux_reussite',       CASE WHEN COUNT(*) > 0
                             THEN ROUND(100.0 * COUNT(*) FILTER (WHERE fr.status = 'ADMIS') / COUNT(*), 1)
                             ELSE 0 END,
    'taux_rattrapage',     CASE WHEN COUNT(*) > 0
                             THEN ROUND(100.0 * (SELECT COUNT(*) FROM phase1_r WHERE status = 'RATTRAPAGE') / COUNT(*), 1)
                             ELSE 0 END,
    'moyenne',             ROUND(AVG(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2),
    'mediane',             ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL))::numeric / 100, 2),
    'ecart_type',          ROUND(STDDEV(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2),
    'note_min',            ROUND(MIN(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2),
    'note_max',            ROUND(MAX(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2)
  ) INTO v_global
  FROM final_r fr;

  -- ── Distribution des moyennes (buckets de 1 point : 0→1, ..., 19→20 inclus) ─
  -- Note : bucket_centimes = 0..2000. Le frontend gère 21 tranches (0–1 à 20/20).
  WITH final_r AS (
    SELECT DISTINCT ON (candidat_id)
      moyenne_centimes
    FROM resultats
    WHERE examen_id = p_examen_id AND moyenne_centimes IS NOT NULL
    ORDER BY candidat_id, phase DESC
  )
  SELECT COALESCE(jsonb_agg(row ORDER BY bucket_centimes), '[]'::jsonb)
  INTO v_distribution
  FROM (
    SELECT
      (FLOOR(moyenne_centimes / 100.0) * 100)::int AS bucket_centimes,
      COUNT(*)::int                                 AS count
    FROM final_r
    GROUP BY bucket_centimes
  ) row;

  -- ── Par discipline ─────────────────────────────────────────────────────────
  SELECT COALESCE(jsonb_agg(d_row ORDER BY (d_row->>'coefficient')::numeric DESC), '[]'::jsonb)
  INTO v_disciplines
  FROM (
    SELECT jsonb_build_object(
      'discipline_id',        d.id,
      'examen_discipline_id', ed.id,
      'libelle',              d.libelle,
      'code',                 d.code,
      'coefficient',          ed.coefficient,
      'nb_notes',             COUNT(*) FILTER (WHERE s.note_centimes IS NOT NULL),
      'nb_absents',           COUNT(*) FILTER (WHERE s.code_special = 'ABS'),
      'nb_sous_moyenne',      COUNT(*) FILTER (WHERE s.note_centimes IS NOT NULL AND s.note_centimes < 1000),
      'moyenne',              CASE
                                WHEN COUNT(*) FILTER (WHERE s.note_centimes IS NOT NULL) > 0
                                THEN ROUND(AVG(s.note_centimes) FILTER (WHERE s.note_centimes IS NOT NULL)::numeric / 100, 2)
                                ELSE NULL
                              END,
      'taux_echec',           CASE
                                WHEN COUNT(*) FILTER (WHERE s.note_centimes IS NOT NULL) > 0
                                THEN ROUND(100.0
                                  * COUNT(*) FILTER (WHERE s.note_centimes IS NOT NULL AND s.note_centimes < 1000)
                                  / NULLIF(COUNT(*) FILTER (WHERE s.note_centimes IS NOT NULL), 0), 1)
                                ELSE 0
                              END
    ) AS d_row
    FROM saisies s
    JOIN lots l          ON l.id  = s.lot_id
    JOIN examen_disciplines ed ON ed.id = l.examen_discipline_id
    JOIN disciplines d   ON d.id  = ed.discipline_id
    WHERE l.examen_id = p_examen_id
    GROUP BY d.id, d.libelle, d.code, ed.coefficient, ed.id
  ) sub;

  -- ── Par série ──────────────────────────────────────────────────────────────
  -- rattrapage = candidats ayant été orientés rattrapage en phase 1
  -- (cohérent avec rattrapage_initial du global, ≠ statut final)
  WITH final_r AS (
    SELECT DISTINCT ON (r.candidat_id)
      r.candidat_id, r.moyenne_centimes, r.status
    FROM resultats r
    WHERE r.examen_id = p_examen_id
    ORDER BY r.candidat_id, r.phase DESC
  ),
  phase1_r AS (
    SELECT candidat_id, status
    FROM resultats
    WHERE examen_id = p_examen_id AND phase = 1
  )
  SELECT COALESCE(jsonb_agg(s_row ORDER BY (s_row->>'taux_reussite')::numeric DESC), '[]'::jsonb)
  INTO v_series
  FROM (
    SELECT jsonb_build_object(
      'serie_id',      s.id,
      'code',          s.code,
      'libelle',       s.libelle,
      'total',         COUNT(*),
      'admis',         COUNT(*) FILTER (WHERE fr.status = 'ADMIS'),
      'rattrapage',    COUNT(*) FILTER (WHERE p1.status = 'RATTRAPAGE'),
      'non_admis',     COUNT(*) FILTER (WHERE fr.status = 'NON_ADMIS'),
      'taux_reussite', CASE WHEN COUNT(*) > 0
                         THEN ROUND(100.0 * COUNT(*) FILTER (WHERE fr.status = 'ADMIS') / COUNT(*), 1)
                         ELSE 0 END,
      'moyenne',       ROUND(AVG(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2)
    ) AS s_row
    FROM final_r fr
    JOIN candidats c   ON c.id = fr.candidat_id
    JOIN series s      ON s.id = c.serie_id
    LEFT JOIN phase1_r p1 ON p1.candidat_id = fr.candidat_id
    GROUP BY s.id, s.code, s.libelle
  ) sub;

  -- ── Par sexe ───────────────────────────────────────────────────────────────
  -- CTE intermédiaire pour éviter l'imbrication d'aggregates (jsonb_object_agg
  -- ne peut pas contenir COUNT/AVG directement — erreur PostgreSQL runtime).
  WITH final_r AS (
    SELECT DISTINCT ON (r.candidat_id)
      r.candidat_id, r.moyenne_centimes, r.status
    FROM resultats r
    WHERE r.examen_id = p_examen_id
    ORDER BY r.candidat_id, r.phase DESC
  ),
  stats_sexe AS (
    SELECT
      c.sexe,
      COUNT(*)                                                   AS total,
      COUNT(*) FILTER (WHERE fr.status = 'ADMIS')               AS admis,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(100.0 * COUNT(*) FILTER (WHERE fr.status = 'ADMIS') / COUNT(*), 1)
        ELSE 0
      END                                                        AS taux_reussite,
      ROUND(AVG(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2) AS moyenne
    FROM final_r fr
    JOIN candidats c ON c.id = fr.candidat_id
    WHERE c.sexe IN ('M', 'F')
    GROUP BY c.sexe
  )
  SELECT COALESCE(
    jsonb_object_agg(
      sexe,
      jsonb_build_object(
        'total',         total,
        'admis',         admis,
        'taux_reussite', taux_reussite,
        'moyenne',       moyenne
      )
    ),
    '{}'::jsonb
  ) INTO v_sexe
  FROM stats_sexe;

  -- ── Par établissement ──────────────────────────────────────────────────────
  WITH final_r AS (
    SELECT DISTINCT ON (r.candidat_id)
      r.candidat_id, r.moyenne_centimes, r.status
    FROM resultats r
    WHERE r.examen_id = p_examen_id
    ORDER BY r.candidat_id, r.phase DESC
  )
  SELECT COALESCE(jsonb_agg(e_row ORDER BY (e_row->>'taux_reussite')::numeric DESC), '[]'::jsonb)
  INTO v_etabs
  FROM (
    SELECT jsonb_build_object(
      'etablissement_id', e.id,
      'nom',              e.nom,
      'ville',            e.ville,
      'type_milieu',      e.type_milieu,
      'total',            COUNT(*),
      'admis',            COUNT(*) FILTER (WHERE fr.status = 'ADMIS'),
      'taux_reussite',    CASE WHEN COUNT(*) > 0
                            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE fr.status = 'ADMIS') / COUNT(*), 1)
                            ELSE 0 END,
      'moyenne',          ROUND(AVG(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2)
    ) AS e_row
    FROM final_r fr
    JOIN candidats c      ON c.id = fr.candidat_id
    JOIN etablissements e ON e.id = c.etablissement_id
    GROUP BY e.id, e.nom, e.ville, e.type_milieu
  ) sub;

  -- ── Par centre ─────────────────────────────────────────────────────────────
  WITH final_r AS (
    SELECT DISTINCT ON (r.candidat_id)
      r.candidat_id, r.moyenne_centimes, r.status
    FROM resultats r
    WHERE r.examen_id = p_examen_id
    ORDER BY r.candidat_id, r.phase DESC
  )
  SELECT COALESCE(jsonb_agg(c_row ORDER BY (c_row->>'taux_reussite')::numeric DESC), '[]'::jsonb)
  INTO v_centres
  FROM (
    SELECT jsonb_build_object(
      'centre_id',     ce.id,
      'nom',           ce.nom,
      'ville',         ce.ville,
      'total',         COUNT(*),
      'admis',         COUNT(*) FILTER (WHERE fr.status = 'ADMIS'),
      'taux_reussite', CASE WHEN COUNT(*) > 0
                         THEN ROUND(100.0 * COUNT(*) FILTER (WHERE fr.status = 'ADMIS') / COUNT(*), 1)
                         ELSE 0 END,
      'moyenne',       ROUND(AVG(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2)
    ) AS c_row
    FROM final_r fr
    JOIN candidats c ON c.id = fr.candidat_id
    JOIN centres ce  ON ce.id = c.centre_id
    WHERE c.centre_id IS NOT NULL
    GROUP BY ce.id, ce.nom, ce.ville
  ) sub;

  -- ── Par milieu (si données disponibles) ───────────────────────────────────
  WITH final_r AS (
    SELECT DISTINCT ON (r.candidat_id)
      r.candidat_id, r.moyenne_centimes, r.status
    FROM resultats r
    WHERE r.examen_id = p_examen_id
    ORDER BY r.candidat_id, r.phase DESC
  )
  SELECT COALESCE(jsonb_agg(m_row ORDER BY (m_row->>'taux_reussite')::numeric DESC), '[]'::jsonb)
  INTO v_milieux
  FROM (
    SELECT jsonb_build_object(
      'type_milieu',   COALESCE(e.type_milieu, 'non_renseigne'),
      'total',         COUNT(*),
      'admis',         COUNT(*) FILTER (WHERE fr.status = 'ADMIS'),
      'taux_reussite', CASE WHEN COUNT(*) > 0
                         THEN ROUND(100.0 * COUNT(*) FILTER (WHERE fr.status = 'ADMIS') / COUNT(*), 1)
                         ELSE 0 END,
      'moyenne',       ROUND(AVG(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2)
    ) AS m_row
    FROM final_r fr
    JOIN candidats c      ON c.id = fr.candidat_id
    JOIN etablissements e ON e.id = c.etablissement_id
    GROUP BY e.type_milieu
  ) sub;

  -- ── Résultat final ─────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'examen_id',         v_examen.id,
    'examen_libelle',    v_examen.libelle,
    'examen_annee',      v_examen.annee,
    'global',            COALESCE(v_global,       '{}'),
    'distribution',      COALESCE(v_distribution, '[]'),
    'par_discipline',    COALESCE(v_disciplines,  '[]'),
    'par_serie',         COALESCE(v_series,        '[]'),
    'par_sexe',          COALESCE(v_sexe,          '{}'),
    'par_etablissement', COALESCE(v_etabs,         '[]'),
    'par_centre',        COALESCE(v_centres,       '[]'),
    'par_milieu',        COALESCE(v_milieux,       '[]')
  );
END;
$$;

-- Restreindre l'accès direct : la fonction est appelée exclusivement
-- via l'Edge Function get-analytics (service_role).
REVOKE ALL ON FUNCTION get_analytics_examen(uuid) FROM PUBLIC;
