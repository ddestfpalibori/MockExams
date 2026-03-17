-- ============================================================
-- Sprint 6C — Suivi Longitudinal Inter-Examens
--
-- 1. Index de recherche inverse sur source_candidat_id
-- 2. Fonction get_suivi_longitudinal(examen_cible_id)
--    Reconstruit la chaîne complète A→B→C via CTE récursive
--    sur source_candidat_id. Filtre par établissement pour
--    chef_etablissement (SECURITY DEFINER).
-- ============================================================

-- ─── 1. Index inverse ────────────────────────────────────────────────────────
-- Permet de retrouver efficacement les enfants d'un candidat hérité.

CREATE INDEX IF NOT EXISTS idx_candidats_source_candidat_id
  ON candidats(source_candidat_id)
  WHERE source_candidat_id IS NOT NULL;

-- ─── 2. Fonction get_suivi_longitudinal ──────────────────────────────────────

CREATE OR REPLACE FUNCTION get_suivi_longitudinal(p_examen_cible_id uuid)
RETURNS TABLE (
  candidat_id      uuid,       -- candidat dans l'examen cible (feuille de la chaîne)
  racine_id        uuid,       -- candidat racine (plus ancien ancêtre)
  etablissement_id uuid,
  etablissement_nom text,
  serie_id         uuid,
  serie_code       text,
  classe_id        uuid,
  classe_libelle   text,
  numero_anonyme   text,       -- numéro anonyme dans l'examen cible
  nb_etapes        int,        -- profondeur de la chaîne (2 = A→B, 3 = A→B→C…)
  etapes           jsonb       -- [{examen_id, code, annee, libelle, status,
                               --   moyenne_centimes, numero_anonyme, depth}]
                               -- ordonné du plus ancien (depth max) au plus récent (depth 0)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role       text;
  v_etab_ids   uuid[];
BEGIN
  -- Rôle de l'appelant (filtre établissement pour chef_etablissement)
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_role = 'chef_etablissement' THEN
    SELECT ARRAY(
      SELECT etablissement_id
      FROM user_etablissements
      WHERE user_id = auth.uid()
    ) INTO v_etab_ids;
  END IF;

  RETURN QUERY
  WITH RECURSIVE chaine AS (
    -- ── Cas de base : candidats hérités dans l'examen cible (depth = 0) ───────
    SELECT
      c.id    AS leaf_id,         -- reste constant pour toute la remontée
      c.id    AS current_id,      -- nœud courant (part de la feuille)
      c.source_candidat_id AS next_source,
      c.examen_id,
      0       AS depth
    FROM candidats c
    WHERE c.examen_id = p_examen_cible_id
      AND c.source_candidat_id IS NOT NULL
      -- Filtre établissement pour chef_etablissement
      AND (
        v_role IN ('admin', 'tutelle', 'enseignant')
        OR (v_role = 'chef_etablissement' AND c.etablissement_id = ANY(v_etab_ids))
      )

    UNION ALL

    -- ── Récursion : remonter vers l'ancêtre ───────────────────────────────────
    SELECT
      ch.leaf_id,
      c.id    AS current_id,
      c.source_candidat_id AS next_source,
      c.examen_id,
      ch.depth + 1
    FROM candidats c
    JOIN chaine ch ON c.id = ch.next_source
    WHERE ch.depth < 10   -- sécurité anti-boucle (max 10 générations)
  ),

  -- ── Enrichissement de chaque nœud avec exam + résultat ────────────────────
  chaine_enrichie AS (
    SELECT
      ch.leaf_id,
      ch.current_id,
      ch.depth,
      ch.next_source,
      e.id    AS examen_id,
      e.code  AS examen_code,
      e.annee,
      e.libelle AS examen_libelle,
      c_step.numero_anonyme,
      r.status,
      r.moyenne_centimes
    FROM chaine ch
    JOIN candidats  c_step ON c_step.id = ch.current_id
    JOIN examens    e      ON e.id = ch.examen_id
    LEFT JOIN resultats r  ON r.candidat_id = ch.current_id
  )

  -- ── Agrégation : une ligne par feuille ────────────────────────────────────
  SELECT
    c_cible.id                                          AS candidat_id,
    -- Racine = nœud sans ancêtre (next_source IS NULL, profondeur max)
    MAX(ce.current_id) FILTER (WHERE ce.next_source IS NULL) AS racine_id,
    c_cible.etablissement_id,
    etab.nom                                            AS etablissement_nom,
    c_cible.serie_id,
    s.code                                              AS serie_code,
    c_cible.classe_id,
    cl.libelle                                          AS classe_libelle,
    c_cible.numero_anonyme,
    COUNT(*)::int                                       AS nb_etapes,
    -- Étapes du plus ancien (depth max) au plus récent (depth 0)
    jsonb_agg(
      jsonb_build_object(
        'examen_id',       ce.examen_id,
        'code',            ce.examen_code,
        'annee',           ce.annee,
        'libelle',         ce.examen_libelle,
        'status',          ce.status,
        'moyenne_centimes', ce.moyenne_centimes,
        'numero_anonyme',  ce.numero_anonyme,
        'depth',           ce.depth
      )
      ORDER BY ce.depth DESC   -- du plus ancien (depth max) au plus récent (0)
    )                                                   AS etapes

  FROM chaine_enrichie ce
  JOIN candidats     c_cible ON c_cible.id = ce.leaf_id
  JOIN etablissements etab   ON etab.id   = c_cible.etablissement_id
  LEFT JOIN series   s       ON s.id      = c_cible.serie_id
  LEFT JOIN classes  cl      ON cl.id     = c_cible.classe_id

  GROUP BY
    c_cible.id, c_cible.etablissement_id, etab.nom,
    c_cible.serie_id, s.code,
    c_cible.classe_id, cl.libelle,
    c_cible.numero_anonyme;

END;
$$;

COMMENT ON FUNCTION get_suivi_longitudinal(uuid) IS
  'Retourne la chaîne longitudinale complète (A→B→C) pour chaque candidat hérité
   de l''examen cible. Chaque ligne contient le tableau des étapes (JSONB) du plus
   ancien examen au plus récent. Filtre établissement pour chef_etablissement.
   Sprint 6C (2026-03-17).';

GRANT EXECUTE ON FUNCTION get_suivi_longitudinal(uuid) TO authenticated;
