-- ============================================================
-- Sprint 6C — Correctifs audit certification
--
-- CRIT-01 : supprimer 'enseignant' du filtre get_suivi_longitudinal
--           (rôle sans accès UI qui pouvait appeler la RPC directement)
-- HIGH-01 : REVOKE EXECUTE FROM PUBLIC + ajout service_role au GRANT
-- MED-01  : MAX(uuid) → ARRAY_AGG()[1] pour racine_id (sémantique correcte)
-- ============================================================

CREATE OR REPLACE FUNCTION get_suivi_longitudinal(p_examen_cible_id uuid)
RETURNS TABLE (
  candidat_id      uuid,
  racine_id        uuid,
  etablissement_id uuid,
  etablissement_nom text,
  serie_id         uuid,
  serie_code       text,
  classe_id        uuid,
  classe_libelle   text,
  numero_anonyme   text,
  nb_etapes        int,
  etapes           jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role       text;
  v_etab_ids   uuid[];
BEGIN
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
    SELECT
      c.id    AS leaf_id,
      c.id    AS current_id,
      c.source_candidat_id AS next_source,
      c.examen_id,
      0       AS depth
    FROM candidats c
    WHERE c.examen_id = p_examen_cible_id
      AND c.source_candidat_id IS NOT NULL
      -- CRIT-01 : 'enseignant' retiré — seuls admin/tutelle/chef_etablissement autorisés
      AND (
        v_role IN ('admin', 'tutelle')
        OR (v_role = 'chef_etablissement' AND c.etablissement_id = ANY(v_etab_ids))
      )

    UNION ALL

    SELECT
      ch.leaf_id,
      c.id    AS current_id,
      c.source_candidat_id AS next_source,
      c.examen_id,
      ch.depth + 1
    FROM candidats c
    JOIN chaine ch ON c.id = ch.next_source
    WHERE ch.depth < 10
  ),

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

  SELECT
    c_cible.id                                          AS candidat_id,
    -- MED-01 : ARRAY_AGG()[1] remplace MAX(uuid) — sémantique correcte
    (ARRAY_AGG(ce.current_id) FILTER (WHERE ce.next_source IS NULL))[1] AS racine_id,
    c_cible.etablissement_id,
    etab.nom                                            AS etablissement_nom,
    c_cible.serie_id,
    s.code                                              AS serie_code,
    c_cible.classe_id,
    cl.libelle                                          AS classe_libelle,
    c_cible.numero_anonyme,
    COUNT(*)::int                                       AS nb_etapes,
    jsonb_agg(
      jsonb_build_object(
        'examen_id',        ce.examen_id,
        'code',             ce.examen_code,
        'annee',            ce.annee,
        'libelle',          ce.examen_libelle,
        'status',           ce.status,
        'moyenne_centimes', ce.moyenne_centimes,
        'numero_anonyme',   ce.numero_anonyme,
        'depth',            ce.depth
      )
      ORDER BY ce.depth DESC
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

-- HIGH-01 : REVOKE PUBLIC + GRANT explicite
REVOKE EXECUTE ON FUNCTION get_suivi_longitudinal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_suivi_longitudinal(uuid) TO authenticated, service_role;
