-- =====================================================
-- MockExams — SEC-04 : Ouvrir F04/F05/F06 aux chefs de centre
-- Migration : 20260313000001_sec04_chef_centre_rpcs.sql
-- =====================================================
-- Probleme : F04/F05/F06 exigent is_admin() strict.
--   Les chefs de centre ne peuvent pas piloter la phase Composition
--   sur leurs propres centres.
-- Solution : helper is_chef_centre_de(p_centre_id) + guards elargis.
-- =====================================================

-- ── Helper : chef de centre actif ET affecte a ce centre ────────────────────

CREATE OR REPLACE FUNCTION is_chef_centre_de(p_centre_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_centres uc ON uc.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role = 'chef_centre'
      AND p.is_active = true
      AND uc.centre_id = p_centre_id
  )
$$;


-- ── F04 : affecter_candidats_salles — guard elargi ─────────────────────────

CREATE OR REPLACE FUNCTION affecter_candidats_salles(
  p_examen_id   uuid,
  p_centre_id   uuid
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_salle             RECORD;
  v_exam_status       exam_status;
  v_candidat_id       uuid;
  v_position_globale  int  := 0;
  v_position_salle    int  := 0;
  v_table_debut       int  := 1;
  v_regle             affectation_rule;
  v_nb_affecter       int;
BEGIN
  IF NOT (is_admin() OR is_chef_centre_de(p_centre_id)) THEN
    RAISE EXCEPTION 'affecter_candidats_salles : acces refuse (uid: %)', auth.uid();
  END IF;

  SELECT status INTO v_exam_status FROM examens WHERE id = p_examen_id;
  IF v_exam_status != 'COMPOSITION' THEN
    RAISE EXCEPTION
      'affecter_candidats_salles : examen % doit etre en COMPOSITION (statut: %)',
      p_examen_id, v_exam_status;
  END IF;

  FOR v_salle IN
    SELECT id, capacite, ordre, regle_affectation, nom
    FROM salles
    WHERE examen_id = p_examen_id AND centre_id = p_centre_id
    ORDER BY ordre ASC
  LOOP
    v_regle        := v_salle.regle_affectation;
    v_position_salle := 0;

    FOR v_candidat_id IN
      SELECT c.id
      FROM candidats c
      WHERE c.examen_id       = p_examen_id
        AND c.centre_id       = p_centre_id
        AND c.salle_id        IS NULL
      ORDER BY
        CASE WHEN v_regle = 'alphabetique'      THEN c.nom_enc                END ASC,
        CASE WHEN v_regle = 'par_etablissement' THEN c.etablissement_id::text END ASC,
        CASE WHEN v_regle = 'numero_anonyme'    THEN c.numero_anonyme         END ASC,
        c.id ASC
      LIMIT v_salle.capacite
    LOOP
      v_position_globale := v_position_globale + 1;
      v_position_salle   := v_position_salle   + 1;

      UPDATE candidats
      SET
        salle_id      = v_salle.id,
        numero_table  = v_table_debut + v_position_salle - 1
      WHERE id = v_candidat_id;
    END LOOP;

    v_table_debut := v_table_debut + v_salle.capacite;
  END LOOP;

  SELECT COUNT(*) INTO v_nb_affecter
  FROM candidats
  WHERE examen_id = p_examen_id AND centre_id = p_centre_id AND salle_id IS NOT NULL;

  RETURN v_nb_affecter;
END;
$$;


-- ── F05 : generer_anonymats_centre — guard elargi ──────────────────────────

CREATE OR REPLACE FUNCTION generer_anonymats_centre(
  p_examen_id   uuid,
  p_centre_id   uuid
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_prefixe       text;
  v_debut         int;
  v_exam_status   exam_status;
  v_deja_generes  int;
  v_position      int := 0;
  v_candidat_id   uuid;
  v_numero        text;
  v_nb_chiffres   int;
  v_nb_total      int;
BEGIN
  IF NOT (is_admin() OR is_chef_centre_de(p_centre_id)) THEN
    RAISE EXCEPTION 'generer_anonymats_centre : acces refuse (uid: %)', auth.uid();
  END IF;

  SELECT anonymat_prefixe, anonymat_debut, status
  INTO v_prefixe, v_debut, v_exam_status
  FROM examens WHERE id = p_examen_id;

  IF v_exam_status != 'COMPOSITION' THEN
    RAISE EXCEPTION
      'generer_anonymats_centre : examen % doit etre en COMPOSITION (statut: %)',
      p_examen_id, v_exam_status;
  END IF;

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


-- ── F06 : creer_lots_centre — guard elargi ─────────────────────────────────

CREATE OR REPLACE FUNCTION creer_lots_centre(
  p_examen_id             uuid,
  p_centre_id             uuid,
  p_examen_discipline_id  uuid,
  p_serie_id              uuid  DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_bon              smallint;
  v_taille_ref       smallint;
  v_exam_status      exam_status;
  v_position         int := 0;
  v_lot_numero       smallint;
  v_lot_id           uuid;
  v_candidat_id      uuid;
  v_max_lot          int := 0;
  rec                RECORD;
BEGIN
  IF NOT (is_admin() OR is_chef_centre_de(p_centre_id)) THEN
    RAISE EXCEPTION 'creer_lots_centre : acces refuse (uid: %)', auth.uid();
  END IF;

  SELECT anonymat_bon, taille_salle_ref, status
  INTO v_bon, v_taille_ref, v_exam_status
  FROM examens WHERE id = p_examen_id;

  IF v_exam_status != 'COMPOSITION' THEN
    RAISE EXCEPTION
      'creer_lots_centre : examen % doit etre en COMPOSITION (statut: %)',
      p_examen_id, v_exam_status;
  END IF;

  FOR rec IN
    SELECT c.id AS candidat_id
    FROM candidats c
    LEFT JOIN salles s ON s.id = c.salle_id
    WHERE c.examen_id = p_examen_id
      AND c.centre_id = p_centre_id
      AND (p_serie_id IS NULL OR c.serie_id = p_serie_id)
      AND c.numero_table IS NOT NULL
    ORDER BY
      COALESCE(s.ordre, 9999) ASC,
      c.numero_table          ASC
  LOOP
    v_position := v_position + 1;

    v_lot_numero := CASE
      WHEN v_bon = 1 THEN
        ((v_position - 1) / v_taille_ref + 1)::smallint
      ELSE
        (((v_position - 1) % v_bon) + 1)::smallint
    END;

    v_max_lot := GREATEST(v_max_lot, v_lot_numero);

    INSERT INTO lots (examen_id, centre_id, examen_discipline_id, serie_id, lot_numero, nb_copies)
    VALUES (p_examen_id, p_centre_id, p_examen_discipline_id, p_serie_id, v_lot_numero, 0)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_lot_id;

    IF v_lot_id IS NULL THEN
      SELECT id INTO v_lot_id
      FROM lots
      WHERE centre_id             = p_centre_id
        AND examen_discipline_id  = p_examen_discipline_id
        AND lot_numero            = v_lot_numero
        AND (serie_id = p_serie_id OR (serie_id IS NULL AND p_serie_id IS NULL));
    END IF;

    INSERT INTO candidat_lots (candidat_id, lot_id, examen_discipline_id, position_dans_lot)
    VALUES (rec.candidat_id, v_lot_id, p_examen_discipline_id, v_position)
    ON CONFLICT (candidat_id, examen_discipline_id) DO UPDATE
      SET lot_id            = EXCLUDED.lot_id,
          position_dans_lot = EXCLUDED.position_dans_lot;

  END LOOP;

  UPDATE lots l
  SET nb_copies = (
    SELECT COUNT(*) FROM candidat_lots cl WHERE cl.lot_id = l.id
  )
  WHERE l.centre_id            = p_centre_id
    AND l.examen_discipline_id = p_examen_discipline_id
    AND (l.serie_id = p_serie_id OR (l.serie_id IS NULL AND p_serie_id IS NULL));

  RETURN v_max_lot;
END;
$$;


-- ── Permissions : is_chef_centre_de accessible aux authentifies ─────────────

REVOKE EXECUTE ON FUNCTION is_chef_centre_de(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_chef_centre_de(uuid) TO authenticated, service_role;
