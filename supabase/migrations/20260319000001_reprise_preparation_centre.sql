-- ============================================================
-- Sprint 8 — Reprise preparation centre
--
-- Permet a un admin ou a un chef de centre de reprendre une
-- preparation de composition deja faite hors application.
--
-- V1 :
-- - phase COMPOSITION uniquement
-- - matching strict par matricule
-- - modes validate_only / fill_only / overwrite_confirmed
-- - tout ou rien pour les modes d'ecriture
-- - pas de reassignment inter-centres
-- ============================================================

CREATE OR REPLACE FUNCTION reprendre_preparation_centre(
  p_examen_id uuid,
  p_centre_id uuid,
  p_mode text,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_exam_status exam_status;
  v_lines jsonb := '[]'::jsonb;
  v_updated int := 0;
  v_ignored int := 0;
  v_errors int := 0;
  v_conflicts int := 0;

  v_seen_matricules text[] := ARRAY[]::text[];
  v_seen_num_tables int[] := ARRAY[]::int[];
  v_seen_num_anonymes text[] := ARRAY[]::text[];

  rec record;
  v_row_index int;
  v_matricule text;
  v_numero_table int;
  v_numero_anonyme text;
  v_salle_nom text;

  v_candidat_count int;
  v_candidat_id uuid;
  v_existing_centre_id uuid;
  v_existing_salle_id uuid;
  v_existing_numero_table int;
  v_existing_numero_anonyme text;

  v_salle_count int;
  v_salle_id uuid;

  v_target_centre_id uuid;
  v_target_salle_id uuid;
  v_target_numero_table int;
  v_target_numero_anonyme text;

  v_message text;
  v_status text;
  v_action text;
  v_has_error boolean;
  v_has_conflict boolean;
  v_has_change boolean;
BEGIN
  IF p_mode NOT IN ('validate_only', 'fill_only', 'overwrite_confirmed') THEN
    RAISE EXCEPTION 'reprendre_preparation_centre : mode invalide (%)', p_mode;
  END IF;

  IF NOT (is_admin() OR is_chef_centre_de(p_centre_id)) THEN
    RAISE EXCEPTION
      'reprendre_preparation_centre : acces refuse (uid: %, centre: %)',
      auth.uid(), p_centre_id;
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) != 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'reprendre_preparation_centre : p_rows doit etre un tableau jsonb non vide';
  END IF;

  IF jsonb_array_length(p_rows) > 1000 THEN
    RAISE EXCEPTION 'reprendre_preparation_centre : trop de lignes (max 1000)';
  END IF;

  SELECT status INTO v_exam_status
  FROM examens
  WHERE id = p_examen_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reprendre_preparation_centre : examen % introuvable', p_examen_id;
  END IF;

  IF v_exam_status != 'COMPOSITION' THEN
    RAISE EXCEPTION
      'reprendre_preparation_centre : examen % doit etre en COMPOSITION (statut: %)',
      p_examen_id, v_exam_status;
  END IF;

  -- ── 1. Validation complete + construction du rapport ────────────────────
  FOR rec IN
    SELECT *
    FROM jsonb_to_recordset(p_rows) AS x(
      row_index int,
      matricule text,
      numero_table int,
      numero_anonyme text,
      salle_nom text
    )
  LOOP
    v_row_index := rec.row_index;
    v_matricule := NULLIF(BTRIM(rec.matricule), '');
    v_numero_table := rec.numero_table;
    v_numero_anonyme := NULLIF(UPPER(BTRIM(rec.numero_anonyme)), '');
    v_salle_nom := NULLIF(BTRIM(rec.salle_nom), '');

    v_message := NULL;
    v_status := 'ok';
    v_action := CASE WHEN p_mode = 'validate_only' THEN 'would_update' ELSE 'updated' END;
    v_has_error := false;
    v_has_conflict := false;
    v_has_change := false;

    IF v_row_index IS NULL THEN
      v_has_error := true;
      v_message := 'row_index manquant';
    ELSIF v_matricule IS NULL THEN
      v_has_error := true;
      v_message := 'matricule manquant';
    ELSIF v_numero_table IS NULL OR v_numero_table <= 0 THEN
      v_has_error := true;
      v_message := 'numero_table invalide';
    END IF;

    IF NOT v_has_error THEN
      IF v_matricule = ANY(v_seen_matricules) THEN
        v_has_error := true;
        v_message := 'matricule en doublon dans le fichier';
      ELSE
        v_seen_matricules := array_append(v_seen_matricules, v_matricule);
      END IF;
    END IF;

    IF NOT v_has_error THEN
      IF v_numero_table = ANY(v_seen_num_tables) THEN
        v_has_error := true;
        v_message := 'numero_table en doublon dans le fichier';
      ELSE
        v_seen_num_tables := array_append(v_seen_num_tables, v_numero_table);
      END IF;
    END IF;

    IF NOT v_has_error AND v_numero_anonyme IS NOT NULL THEN
      IF v_numero_anonyme = ANY(v_seen_num_anonymes) THEN
        v_has_error := true;
        v_message := 'numero_anonyme en doublon dans le fichier';
      ELSE
        v_seen_num_anonymes := array_append(v_seen_num_anonymes, v_numero_anonyme);
      END IF;
    END IF;

    IF NOT v_has_error THEN
      SELECT COUNT(*)
      INTO v_candidat_count
      FROM candidats c
      WHERE c.examen_id = p_examen_id
        AND c.matricule = v_matricule;

      IF v_candidat_count = 0 THEN
        v_has_error := true;
        v_message := 'candidat introuvable';
      ELSIF v_candidat_count > 1 THEN
        v_has_error := true;
        v_message := 'matching ambigu : plusieurs candidats pour ce matricule';
      ELSE
        SELECT c.id, c.centre_id, c.salle_id, c.numero_table, c.numero_anonyme
        INTO v_candidat_id, v_existing_centre_id, v_existing_salle_id, v_existing_numero_table, v_existing_numero_anonyme
        FROM candidats c
        WHERE c.examen_id = p_examen_id
          AND c.matricule = v_matricule;
      END IF;
    END IF;

    IF NOT v_has_error AND v_existing_centre_id IS NOT NULL AND v_existing_centre_id != p_centre_id THEN
      v_has_error := true;
      v_message := 'candidat deja affecte a un autre centre';
    END IF;

    v_salle_id := NULL;
    IF NOT v_has_error AND v_salle_nom IS NOT NULL THEN
      SELECT COUNT(*), MIN(s.id)
      INTO v_salle_count, v_salle_id
      FROM salles s
      WHERE s.examen_id = p_examen_id
        AND s.centre_id = p_centre_id
        AND LOWER(BTRIM(s.nom)) = LOWER(BTRIM(v_salle_nom));

      IF v_salle_count = 0 THEN
        v_has_error := true;
        v_message := 'salle introuvable';
      ELSIF v_salle_count > 1 THEN
        v_has_error := true;
        v_message := 'salle ambigue apres normalisation';
      END IF;
    END IF;

    IF NOT v_has_error THEN
      v_target_centre_id := COALESCE(v_existing_centre_id, p_centre_id);
      v_target_salle_id := v_existing_salle_id;
      v_target_numero_table := v_existing_numero_table;
      v_target_numero_anonyme := v_existing_numero_anonyme;

      CASE p_mode
        WHEN 'validate_only' THEN
          v_target_salle_id := COALESCE(v_salle_id, v_existing_salle_id);
          v_target_numero_table := v_numero_table;
          v_target_numero_anonyme := COALESCE(v_numero_anonyme, v_existing_numero_anonyme);
        WHEN 'fill_only' THEN
          IF v_existing_salle_id IS NULL AND v_salle_id IS NOT NULL THEN
            v_target_salle_id := v_salle_id;
          ELSIF v_existing_salle_id IS NOT NULL AND v_salle_id IS NOT NULL AND v_existing_salle_id != v_salle_id THEN
            v_has_conflict := true;
            v_message := 'salle deja renseignee avec une autre valeur';
          END IF;

          IF v_existing_numero_table IS NULL THEN
            v_target_numero_table := v_numero_table;
          ELSIF v_existing_numero_table != v_numero_table THEN
            v_has_conflict := true;
            v_message := 'numero_table deja renseigne avec une autre valeur';
          END IF;

          IF v_numero_anonyme IS NOT NULL THEN
            IF v_existing_numero_anonyme IS NULL THEN
              v_target_numero_anonyme := v_numero_anonyme;
            ELSIF v_existing_numero_anonyme != v_numero_anonyme THEN
              v_has_conflict := true;
              v_message := 'numero_anonyme deja renseigne avec une autre valeur';
            END IF;
          END IF;
        WHEN 'overwrite_confirmed' THEN
          IF v_salle_id IS NOT NULL THEN
            v_target_salle_id := v_salle_id;
          END IF;
          v_target_numero_table := v_numero_table;
          IF v_numero_anonyme IS NOT NULL THEN
            v_target_numero_anonyme := v_numero_anonyme;
          END IF;
      END CASE;
    END IF;

    IF NOT v_has_error AND NOT v_has_conflict THEN
      IF v_target_numero_table IS NOT NULL THEN
        PERFORM 1
        FROM candidats c
        WHERE c.examen_id = p_examen_id
          AND c.centre_id = v_target_centre_id
          AND c.numero_table = v_target_numero_table
          AND c.id != v_candidat_id;

        IF FOUND THEN
          v_has_conflict := true;
          v_message := 'numero_table deja utilise par un autre candidat';
        END IF;
      END IF;

      IF NOT v_has_conflict AND v_target_numero_anonyme IS NOT NULL THEN
        PERFORM 1
        FROM candidats c
        WHERE c.examen_id = p_examen_id
          AND c.numero_anonyme = v_target_numero_anonyme
          AND c.id != v_candidat_id;

        IF FOUND THEN
          v_has_conflict := true;
          v_message := 'numero_anonyme deja utilise par un autre candidat';
        END IF;
      END IF;
    END IF;

    IF NOT v_has_error AND NOT v_has_conflict THEN
      v_has_change :=
        v_target_centre_id IS DISTINCT FROM v_existing_centre_id
        OR v_target_salle_id IS DISTINCT FROM v_existing_salle_id
        OR v_target_numero_table IS DISTINCT FROM v_existing_numero_table
        OR v_target_numero_anonyme IS DISTINCT FROM v_existing_numero_anonyme;

      IF NOT v_has_change THEN
        v_status := 'ignored';
        v_action := CASE
          WHEN p_mode = 'validate_only' THEN 'none'
          ELSE 'ignored_existing_values'
        END;
        v_message := 'aucune modification necessaire';
        v_ignored := v_ignored + 1;
      ELSE
        v_status := 'ok';
        v_action := CASE
          WHEN p_mode = 'validate_only' THEN 'would_update'
          ELSE 'updated'
        END;
        v_message := CASE
          WHEN p_mode = 'validate_only' THEN 'ligne valide, mise a jour possible'
          ELSE 'mise a jour prete a etre appliquee'
        END;
      END IF;
    ELSIF v_has_conflict THEN
      v_status := 'conflict';
      v_action := 'none';
      v_conflicts := v_conflicts + 1;
    ELSE
      v_status := 'error';
      v_action := 'none';
      v_errors := v_errors + 1;
    END IF;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'row_index', v_row_index,
        'matricule', v_matricule,
        'status', v_status,
        'action', v_action,
        'message', v_message
      )
    );
  END LOOP;

  -- ── 2. Ecriture tout ou rien ─────────────────────────────────────────────
  IF p_mode IN ('fill_only', 'overwrite_confirmed') THEN
    IF v_errors > 0 OR v_conflicts > 0 THEN
      RETURN jsonb_build_object(
        'mode', p_mode,
        'updated', 0,
        'ignored', v_ignored,
        'errors', v_errors,
        'conflicts', v_conflicts,
        'lines', v_lines
      );
    END IF;

    FOR rec IN
      SELECT *
      FROM jsonb_to_recordset(p_rows) AS x(
        row_index int,
        matricule text,
        numero_table int,
        numero_anonyme text,
        salle_nom text
      )
    LOOP
      v_matricule := NULLIF(BTRIM(rec.matricule), '');
      v_numero_table := rec.numero_table;
      v_numero_anonyme := NULLIF(UPPER(BTRIM(rec.numero_anonyme)), '');
      v_salle_nom := NULLIF(BTRIM(rec.salle_nom), '');

      SELECT c.id, c.centre_id, c.salle_id, c.numero_table, c.numero_anonyme
      INTO v_candidat_id, v_existing_centre_id, v_existing_salle_id, v_existing_numero_table, v_existing_numero_anonyme
      FROM candidats c
      WHERE c.examen_id = p_examen_id
        AND c.matricule = v_matricule;

      v_salle_id := NULL;
      IF v_salle_nom IS NOT NULL THEN
        SELECT MIN(s.id)
        INTO v_salle_id
        FROM salles s
        WHERE s.examen_id = p_examen_id
          AND s.centre_id = p_centre_id
          AND LOWER(BTRIM(s.nom)) = LOWER(BTRIM(v_salle_nom));
      END IF;

      v_target_centre_id := COALESCE(v_existing_centre_id, p_centre_id);
      v_target_salle_id := v_existing_salle_id;
      v_target_numero_table := v_existing_numero_table;
      v_target_numero_anonyme := v_existing_numero_anonyme;

      IF p_mode = 'fill_only' THEN
        IF v_existing_salle_id IS NULL AND v_salle_id IS NOT NULL THEN
          v_target_salle_id := v_salle_id;
        END IF;
        IF v_existing_numero_table IS NULL THEN
          v_target_numero_table := v_numero_table;
        END IF;
        IF v_existing_numero_anonyme IS NULL AND v_numero_anonyme IS NOT NULL THEN
          v_target_numero_anonyme := v_numero_anonyme;
        END IF;
      ELSE
        IF v_salle_id IS NOT NULL THEN
          v_target_salle_id := v_salle_id;
        END IF;
        v_target_numero_table := v_numero_table;
        IF v_numero_anonyme IS NOT NULL THEN
          v_target_numero_anonyme := v_numero_anonyme;
        END IF;
      END IF;

      IF v_target_centre_id IS DISTINCT FROM v_existing_centre_id
         OR v_target_salle_id IS DISTINCT FROM v_existing_salle_id
         OR v_target_numero_table IS DISTINCT FROM v_existing_numero_table
         OR v_target_numero_anonyme IS DISTINCT FROM v_existing_numero_anonyme
      THEN
        UPDATE candidats
        SET
          centre_id = v_target_centre_id,
          salle_id = v_target_salle_id,
          numero_table = v_target_numero_table,
          numero_anonyme = v_target_numero_anonyme
        WHERE id = v_candidat_id;

        v_updated := v_updated + 1;
      END IF;
    END LOOP;

    -- Remplacer l'action/message des lignes ok pour refleter l'application effective.
    v_lines := (
      SELECT jsonb_agg(
        CASE
          WHEN elem->>'status' = 'ok' AND elem->>'action' = 'would_update' THEN
            jsonb_set(
              jsonb_set(elem, '{action}', '"updated"'::jsonb),
              '{message}', '"mise a jour appliquee"'::jsonb
            )
          ELSE elem
        END
        ORDER BY ord
      )
      FROM jsonb_array_elements(v_lines) WITH ORDINALITY AS t(elem, ord)
    );
  END IF;

  RETURN jsonb_build_object(
    'mode', p_mode,
    'updated', v_updated,
    'ignored', v_ignored,
    'errors', v_errors,
    'conflicts', v_conflicts,
    'lines', COALESCE(v_lines, '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION reprendre_preparation_centre(uuid, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reprendre_preparation_centre(uuid, uuid, text, jsonb) TO authenticated, service_role;
