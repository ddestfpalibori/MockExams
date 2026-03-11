-- =====================================================
-- MockExams — Anonymat optionnel (mode table)
-- Migration : 20260311123000_anonymat_optionnel.sql
-- =====================================================

-- 1) Flag anonymat_actif
ALTER TABLE examens
  ADD COLUMN anonymat_actif boolean NOT NULL DEFAULT true;

-- 2) F05 : generer_anonymats_centre (mode anonymat ou mode table)
CREATE OR REPLACE FUNCTION generer_anonymats_centre(
  p_examen_id   uuid,
  p_centre_id   uuid
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_prefixe          text;
  v_debut            int;
  v_exam_status      exam_status;
  v_anonymat_actif   boolean;
  v_table_separator  text;
  v_centre_code      text;
  v_centre_code_u    text;
  v_deja_generes     int;
  v_position         int := 0;
  v_candidat_id      uuid;
  v_numero           text;
  v_nb_chiffres      int;
  v_nb_total         int;
  v_base             text;
  rec                record;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'generer_anonymats_centre : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  -- Charger paramètres d'examen
  SELECT anonymat_prefixe, anonymat_debut, status, anonymat_actif, table_separator
  INTO v_prefixe, v_debut, v_exam_status, v_anonymat_actif, v_table_separator
  FROM examens WHERE id = p_examen_id;

  -- Garde de phase : génération uniquement en COMPOSITION
  IF v_exam_status != 'COMPOSITION' THEN
    RAISE EXCEPTION
      'generer_anonymats_centre : examen % doit être en COMPOSITION (statut: %)',
      p_examen_id, v_exam_status;
  END IF;

  -- Mode table (anonymat désactivé) : utiliser numero_table_formate
  IF v_anonymat_actif IS FALSE THEN
    SELECT code INTO v_centre_code FROM centres WHERE id = p_centre_id;
    IF v_centre_code IS NULL OR v_centre_code = '' THEN
      RAISE EXCEPTION 'generer_anonymats_centre : code centre manquant (%)', p_centre_id;
    END IF;
    v_centre_code_u := upper(v_centre_code);

    -- Guard : numero_table doit être affecté
    IF EXISTS (
      SELECT 1 FROM candidats
      WHERE examen_id = p_examen_id
        AND centre_id = p_centre_id
        AND numero_anonyme IS NULL
        AND numero_table IS NULL
    ) THEN
      RAISE EXCEPTION
        'Numéros de table non affectés pour ce centre.';
    END IF;

    FOR rec IN
      SELECT c.id, v.numero_table_formate AS base
      FROM candidats c
      JOIN v_candidats_affichage v ON v.id = c.id
      LEFT JOIN salles s ON s.id = c.salle_id
      WHERE c.examen_id = p_examen_id
        AND c.centre_id = p_centre_id
        AND c.numero_anonyme IS NULL
      ORDER BY
        COALESCE(s.ordre, 9999) ASC,
        c.numero_table ASC NULLS LAST
    LOOP
      v_base := rec.base;
      IF v_base IS NULL THEN
        RAISE EXCEPTION
          'Numéro de table formaté introuvable pour un candidat.';
      END IF;

      IF upper(v_base) LIKE v_centre_code_u || v_table_separator || '%' THEN
        v_numero := upper(v_base);
      ELSE
        v_numero := v_centre_code_u || v_table_separator || upper(v_base);
      END IF;

      UPDATE candidats
      SET numero_anonyme = v_numero
      WHERE id = rec.id;

      v_position := v_position + 1;
    END LOOP;

    RETURN v_position;
  END IF;

  -- Mode anonymat (par défaut)
  SELECT COUNT(*) INTO v_nb_total
  FROM candidats WHERE examen_id = p_examen_id AND centre_id = p_centre_id;

  v_nb_chiffres := LENGTH((v_debut + v_nb_total - 1)::text);
  v_nb_chiffres := GREATEST(v_nb_chiffres, 3);

  SELECT COUNT(*) INTO v_deja_generes
  FROM candidats
  WHERE examen_id = p_examen_id
    AND centre_id = p_centre_id
    AND numero_anonyme IS NOT NULL;

  FOR v_candidat_id IN
    SELECT c.id
    FROM candidats c
    LEFT JOIN salles s ON s.id = c.salle_id
    WHERE c.examen_id = p_examen_id
      AND c.centre_id = p_centre_id
      AND c.numero_anonyme IS NULL
    ORDER BY
      COALESCE(s.ordre, 9999) ASC,
      c.numero_table ASC NULLS LAST
  LOOP
    v_position := v_position + 1;
    v_numero   := v_prefixe || LPAD((v_debut + v_deja_generes + v_position - 1)::text, v_nb_chiffres, '0');

    UPDATE candidats
    SET numero_anonyme = v_numero
    WHERE id = v_candidat_id;
  END LOOP;

  RETURN v_position;
END;
$$;
