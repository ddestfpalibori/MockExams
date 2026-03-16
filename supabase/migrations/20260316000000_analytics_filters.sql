-- ==============================================================================
-- Migration 20260316000000 — Analytics filters + par_commune dimension
-- ==============================================================================
-- 1. DROP et recréation de get_analytics_examen avec 4 paramètres
--    (3 filtres optionnels : centre_id, etablissement_id, code_commune)
-- 2. Ajout de code_commune dans par_centre
-- 3. Nouvelle dimension par_commune
-- ==============================================================================

-- ── Suppression de l'ancienne signature ───────────────────────────────────────

DROP FUNCTION IF EXISTS get_analytics_examen(uuid);

-- ── Nouvelle fonction avec filtres ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_analytics_examen(
  p_examen_id       uuid,
  p_centre_id       uuid DEFAULT NULL,
  p_etablissement_id uuid DEFAULT NULL,
  p_code_commune    text DEFAULT NULL
)
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
  v_communes      jsonb;
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

  -- ── Matérialisation du résultat final par candidat ────────────────────────
  -- Filtres appliqués : centre, établissement, commune (optionnels).
  CREATE TEMP TABLE _final_r ON COMMIT DROP AS
    SELECT DISTINCT ON (r.candidat_id)
      r.candidat_id,
      r.moyenne_centimes,
      r.status
    FROM resultats r
    JOIN candidats c ON c.id = r.candidat_id
    LEFT JOIN centres ce ON ce.id = c.centre_id
    WHERE r.examen_id = p_examen_id
      AND (p_centre_id IS NULL OR c.centre_id = p_centre_id)
      AND (p_etablissement_id IS NULL OR c.etablissement_id = p_etablissement_id)
      AND (p_code_commune IS NULL OR ce.code_commune = p_code_commune)
    ORDER BY r.candidat_id, r.phase DESC;

  CREATE INDEX ON _final_r (candidat_id);
  ANALYZE _final_r;

  -- phase1_r : candidats orientés rattrapage avant éventuels rattrapages
  CREATE TEMP TABLE _phase1_r ON COMMIT DROP AS
    SELECT r.candidat_id, r.status
    FROM resultats r
    JOIN candidats c ON c.id = r.candidat_id
    LEFT JOIN centres ce ON ce.id = c.centre_id
    WHERE r.examen_id = p_examen_id
      AND r.phase = 1
      AND (p_centre_id IS NULL OR c.centre_id = p_centre_id)
      AND (p_etablissement_id IS NULL OR c.etablissement_id = p_etablissement_id)
      AND (p_code_commune IS NULL OR ce.code_commune = p_code_commune);

  CREATE INDEX ON _phase1_r (candidat_id);
  ANALYZE _phase1_r;

  -- ── Stats globales ────────────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'total',               COUNT(*),
    'admis',               COUNT(*) FILTER (WHERE fr.status = 'ADMIS'),
    'rattrapage_initial',  (SELECT COUNT(*) FROM _phase1_r WHERE status = 'RATTRAPAGE'),
    'non_admis',           COUNT(*) FILTER (WHERE fr.status = 'NON_ADMIS'),
    'taux_reussite',       CASE WHEN COUNT(*) > 0
                             THEN ROUND(100.0 * COUNT(*) FILTER (WHERE fr.status = 'ADMIS') / COUNT(*), 1)
                             ELSE 0 END,
    'taux_rattrapage',     CASE WHEN COUNT(*) > 0
                             THEN ROUND(100.0 * (SELECT COUNT(*) FROM _phase1_r WHERE status = 'RATTRAPAGE') / COUNT(*), 1)
                             ELSE 0 END,
    'moyenne',             ROUND(AVG(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2),
    'mediane',             ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL))::numeric / 100, 2),
    'ecart_type',          ROUND(STDDEV(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2),
    'note_min',            ROUND(MIN(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2),
    'note_max',            ROUND(MAX(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2)
  ) INTO v_global
  FROM _final_r fr;

  -- ── Distribution des moyennes (buckets de 1 point : 0→1, ..., 19→20 inclus) ─
  SELECT COALESCE(jsonb_agg(row ORDER BY bucket_centimes), '[]'::jsonb)
  INTO v_distribution
  FROM (
    SELECT
      (FLOOR(moyenne_centimes / 100.0) * 100)::int AS bucket_centimes,
      COUNT(*)::int                                 AS count
    FROM _final_r
    WHERE moyenne_centimes IS NOT NULL
    GROUP BY bucket_centimes
  ) row;

  -- ── Par discipline ─────────────────────────────────────────────────────────
  -- Filtres appliqués via JOIN candidats + centres (même périmètre que _final_r)
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
    JOIN lots l               ON l.id  = s.lot_id
    JOIN examen_disciplines ed ON ed.id = l.examen_discipline_id
    JOIN disciplines d         ON d.id  = ed.discipline_id
    JOIN candidats c           ON c.id  = s.candidat_id
    LEFT JOIN centres ce       ON ce.id = c.centre_id
    WHERE l.examen_id = p_examen_id
      AND (p_centre_id IS NULL OR c.centre_id = p_centre_id)
      AND (p_etablissement_id IS NULL OR c.etablissement_id = p_etablissement_id)
      AND (p_code_commune IS NULL OR ce.code_commune = p_code_commune)
    GROUP BY d.id, d.libelle, d.code, ed.coefficient, ed.id
  ) sub;

  -- ── Par série ──────────────────────────────────────────────────────────────
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
    FROM _final_r fr
    JOIN candidats c       ON c.id = fr.candidat_id
    JOIN series s          ON s.id = c.serie_id
    LEFT JOIN _phase1_r p1 ON p1.candidat_id = fr.candidat_id
    GROUP BY s.id, s.code, s.libelle
  ) sub;

  -- ── Par sexe ───────────────────────────────────────────────────────────────
  WITH stats_sexe AS (
    SELECT
      c.sexe,
      COUNT(*)                                                   AS total,
      COUNT(*) FILTER (WHERE fr.status = 'ADMIS')               AS admis,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(100.0 * COUNT(*) FILTER (WHERE fr.status = 'ADMIS') / COUNT(*), 1)
        ELSE 0
      END                                                        AS taux_reussite,
      ROUND(AVG(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2) AS moyenne
    FROM _final_r fr
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
    FROM _final_r fr
    JOIN candidats c      ON c.id = fr.candidat_id
    JOIN etablissements e ON e.id = c.etablissement_id
    GROUP BY e.id, e.nom, e.ville, e.type_milieu
  ) sub;

  -- ── Par centre ─────────────────────────────────────────────────────────────
  -- Inclut code_commune pour permettre le filtrage côté frontend
  SELECT COALESCE(jsonb_agg(c_row ORDER BY (c_row->>'taux_reussite')::numeric DESC), '[]'::jsonb)
  INTO v_centres
  FROM (
    SELECT jsonb_build_object(
      'centre_id',     ce.id,
      'nom',           ce.nom,
      'ville',         ce.ville,
      'code_commune',  ce.code_commune,
      'total',         COUNT(*),
      'admis',         COUNT(*) FILTER (WHERE fr.status = 'ADMIS'),
      'taux_reussite', CASE WHEN COUNT(*) > 0
                         THEN ROUND(100.0 * COUNT(*) FILTER (WHERE fr.status = 'ADMIS') / COUNT(*), 1)
                         ELSE 0 END,
      'moyenne',       ROUND(AVG(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2)
    ) AS c_row
    FROM _final_r fr
    JOIN candidats c ON c.id = fr.candidat_id
    JOIN centres ce  ON ce.id = c.centre_id
    WHERE c.centre_id IS NOT NULL
    GROUP BY ce.id, ce.nom, ce.ville, ce.code_commune
  ) sub;

  -- ── Par commune ────────────────────────────────────────────────────────────
  SELECT COALESCE(jsonb_agg(com_row ORDER BY (com_row->>'taux_reussite')::numeric DESC), '[]'::jsonb)
  INTO v_communes
  FROM (
    SELECT jsonb_build_object(
      'code_commune',  ce.code_commune,
      -- MAX() car plusieurs centres d'une même commune peuvent avoir
      -- des valeurs ville légèrement différentes (casse, espaces) ;
      -- on retient la valeur la plus fréquente/arbitraire plutôt que
      -- de créer des doublons par commune.
      'ville',         MAX(ce.ville),
      'total',         COUNT(*),
      'admis',         COUNT(*) FILTER (WHERE fr.status = 'ADMIS'),
      'taux_reussite', CASE WHEN COUNT(*) > 0
                         THEN ROUND(100.0 * COUNT(*) FILTER (WHERE fr.status = 'ADMIS') / COUNT(*), 1)
                         ELSE 0 END,
      'moyenne',       ROUND(AVG(fr.moyenne_centimes) FILTER (WHERE fr.moyenne_centimes IS NOT NULL)::numeric / 100, 2)
    ) AS com_row
    FROM _final_r fr
    JOIN candidats c ON c.id = fr.candidat_id
    JOIN centres ce  ON ce.id = c.centre_id
    WHERE ce.code_commune IS NOT NULL
    GROUP BY ce.code_commune
  ) sub;

  -- ── Par milieu (si données disponibles) ───────────────────────────────────
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
    FROM _final_r fr
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
    'par_commune',       COALESCE(v_communes,      '[]'),
    'par_milieu',        COALESCE(v_milieux,       '[]')
  );
END;
$$;

-- Restreindre l'accès direct : la fonction est appelée exclusivement
-- via l'Edge Function get-analytics (service_role).
REVOKE ALL ON FUNCTION get_analytics_examen(uuid, uuid, uuid, text) FROM PUBLIC;
