-- =====================================================
-- MockExams — Hotfix purge examen definitif
-- Migration : 20260306000003_hotfix_purge_examen_definitif.sql
-- Objet     : corriger les points critiques de purger_examen_definitif
-- =====================================================
-- Correctifs inclus :
-- 1) Lock transactionnel acquis AVANT lecture statut (concurrence)
-- 2) Garde bloquante source_candidat_id inter-examens (FK auto-reference)
-- 3) Nettoyage audit_log etendu pour saisies/codes_acces via lot_id
-- =====================================================

CREATE OR REPLACE FUNCTION purger_examen_definitif(
  p_examen_id        uuid,
  p_confirmer        boolean DEFAULT false,
  p_supprimer_audit  boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_status                 exam_status;
  v_source_refs            int := 0;
  v_lot_ids_text           text[] := ARRAY[]::text[];
  v_deleted_examen_liens   int := 0;
  v_deleted_resultats      int := 0;
  v_deleted_saisies        int := 0;
  v_deleted_codes_acces    int := 0;
  v_deleted_candidat_lots  int := 0;
  v_deleted_choix          int := 0;
  v_deleted_lots           int := 0;
  v_deleted_candidats      int := 0;
  v_deleted_imports        int := 0;
  v_deleted_salles         int := 0;
  v_deleted_examen_disc    int := 0;
  v_deleted_examen_series  int := 0;
  v_deleted_examen_centres int := 0;
  v_deleted_examen_etabs   int := 0;
  v_deleted_examens        int := 0;
  v_deleted_audit          int := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'purger_examen_definitif : reserve aux administrateurs (uid: %)', auth.uid();
  END IF;

  IF NOT p_confirmer THEN
    RAISE EXCEPTION
      'purger_examen_definitif : confirmation explicite requise (p_confirmer=true) pour supprimer l''examen %',
      p_examen_id;
  END IF;

  -- Lock acquis avant toute lecture pour eviter les races concurrentes.
  PERFORM pg_advisory_xact_lock(
    ('x' || substring(replace(p_examen_id::text, '-', ''), 1, 8))::bit(32)::int,
    ('x' || substring(replace(p_examen_id::text, '-', ''), 9, 8))::bit(32)::int
  );

  SELECT status INTO v_status
  FROM examens
  WHERE id = p_examen_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purger_examen_definitif : examen % introuvable (ou deja purge en concurrent)', p_examen_id;
  END IF;

  IF v_status != 'CLOS' THEN
    RAISE EXCEPTION
      'purger_examen_definitif : examen % doit etre en CLOS (statut actuel: %)',
      p_examen_id, v_status;
  END IF;

  -- Bloquer la purge si des examens cibles referencent encore cet examen source.
  SELECT COUNT(*) INTO v_source_refs
  FROM candidats c_ref
  WHERE c_ref.examen_id != p_examen_id
    AND c_ref.source_candidat_id IN (
      SELECT id FROM candidats WHERE examen_id = p_examen_id
    );

  IF v_source_refs > 0 THEN
    RAISE EXCEPTION
      'purger_examen_definitif : % candidat(s) d''autres examens referencent encore cet examen via source_candidat_id — purger d''abord les examens cibles',
      v_source_refs;
  END IF;

  -- Snapshot des lots pour nettoyage audit des tables reliees par lot_id.
  SELECT COALESCE(array_agg(id::text), ARRAY[]::text[])
  INTO v_lot_ids_text
  FROM lots
  WHERE examen_id = p_examen_id;

  -- 1) Liens inter-examens
  DELETE FROM examen_liens
  WHERE examen_cible_id = p_examen_id
     OR examen_source_id = p_examen_id;
  GET DIAGNOSTICS v_deleted_examen_liens = ROW_COUNT;

  -- 2) Resultats
  DELETE FROM resultats
  WHERE examen_id = p_examen_id;
  GET DIAGNOSTICS v_deleted_resultats = ROW_COUNT;

  -- 3) Saisies / codes / affectations lots
  DELETE FROM saisies
  WHERE lot_id IN (SELECT id FROM lots WHERE examen_id = p_examen_id);
  GET DIAGNOSTICS v_deleted_saisies = ROW_COUNT;

  DELETE FROM codes_acces
  WHERE lot_id IN (SELECT id FROM lots WHERE examen_id = p_examen_id);
  GET DIAGNOSTICS v_deleted_codes_acces = ROW_COUNT;

  DELETE FROM candidat_lots
  WHERE lot_id IN (SELECT id FROM lots WHERE examen_id = p_examen_id);
  GET DIAGNOSTICS v_deleted_candidat_lots = ROW_COUNT;

  DELETE FROM candidat_choix_disciplines
  WHERE candidat_id IN (SELECT id FROM candidats WHERE examen_id = p_examen_id);
  GET DIAGNOSTICS v_deleted_choix = ROW_COUNT;

  -- 4) Coeur examen
  DELETE FROM lots
  WHERE examen_id = p_examen_id;
  GET DIAGNOSTICS v_deleted_lots = ROW_COUNT;

  DELETE FROM candidats
  WHERE examen_id = p_examen_id;
  GET DIAGNOSTICS v_deleted_candidats = ROW_COUNT;

  DELETE FROM imports_log
  WHERE examen_id = p_examen_id;
  GET DIAGNOSTICS v_deleted_imports = ROW_COUNT;

  DELETE FROM salles
  WHERE examen_id = p_examen_id;
  GET DIAGNOSTICS v_deleted_salles = ROW_COUNT;

  -- 5) Configuration examen
  DELETE FROM examen_disciplines
  WHERE examen_id = p_examen_id;
  GET DIAGNOSTICS v_deleted_examen_disc = ROW_COUNT;

  DELETE FROM examen_series
  WHERE examen_id = p_examen_id;
  GET DIAGNOSTICS v_deleted_examen_series = ROW_COUNT;

  DELETE FROM examen_etablissements
  WHERE examen_id = p_examen_id;
  GET DIAGNOSTICS v_deleted_examen_etabs = ROW_COUNT;

  DELETE FROM examen_centres
  WHERE examen_id = p_examen_id;
  GET DIAGNOSTICS v_deleted_examen_centres = ROW_COUNT;

  -- 6) Examen
  DELETE FROM examens
  WHERE id = p_examen_id;
  GET DIAGNOSTICS v_deleted_examens = ROW_COUNT;

  -- 7) Audit (optionnel)
  IF p_supprimer_audit THEN
    DELETE FROM audit_log a
    WHERE
      (a.table_name = 'examens' AND (
         a.record_id = p_examen_id
         OR a.old_data->>'id' = p_examen_id::text
         OR a.new_data->>'id' = p_examen_id::text
      ))
      OR (
        a.table_name IN ('resultats', 'imports_log', 'candidats', 'lots', 'salles',
                         'examen_series', 'examen_disciplines', 'examen_centres', 'examen_etablissements')
        AND (
          a.old_data->>'examen_id' = p_examen_id::text
          OR a.new_data->>'examen_id' = p_examen_id::text
        )
      )
      OR (
        a.table_name = 'saisies'
        AND (
          a.old_data->>'lot_id' = ANY(v_lot_ids_text)
          OR a.new_data->>'lot_id' = ANY(v_lot_ids_text)
        )
      )
      OR (
        a.table_name = 'codes_acces'
        AND (
          a.old_data->>'lot_id' = ANY(v_lot_ids_text)
          OR a.new_data->>'lot_id' = ANY(v_lot_ids_text)
        )
      );
    GET DIAGNOSTICS v_deleted_audit = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'examen_id', p_examen_id,
    'status_before', v_status,
    'deleted', jsonb_build_object(
      'examen_liens', v_deleted_examen_liens,
      'resultats', v_deleted_resultats,
      'saisies', v_deleted_saisies,
      'codes_acces', v_deleted_codes_acces,
      'candidat_lots', v_deleted_candidat_lots,
      'candidat_choix_disciplines', v_deleted_choix,
      'lots', v_deleted_lots,
      'candidats', v_deleted_candidats,
      'imports_log', v_deleted_imports,
      'salles', v_deleted_salles,
      'examen_disciplines', v_deleted_examen_disc,
      'examen_series', v_deleted_examen_series,
      'examen_etablissements', v_deleted_examen_etabs,
      'examen_centres', v_deleted_examen_centres,
      'examens', v_deleted_examens,
      'audit_log', v_deleted_audit
    ),
    'audit_purged', p_supprimer_audit
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION purger_examen_definitif(uuid, boolean, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION purger_examen_definitif(uuid, boolean, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION purger_examen_definitif(uuid, boolean, boolean) TO authenticated, service_role;
