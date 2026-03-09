-- =====================================================
-- Migration : 20260309000000_advanced_table_numbers.sql
-- Contenu   : Préfixes alphanumériques et continuité globale
-- =====================================================

-- 1. Types ENUM
CREATE TYPE table_prefix_mode AS ENUM ('AUCUN', 'FIXE', 'CENTRE', 'COMMUNE', 'DEPARTEMENT');
CREATE TYPE table_continuity_scope AS ENUM ('CENTRE', 'DEPARTEMENT', 'EXAMEN');

-- 2. Mise à jour de la table examens
ALTER TABLE public.examens
ADD COLUMN table_prefix_type      table_prefix_mode     NOT NULL DEFAULT 'CENTRE',
ADD COLUMN table_prefix_valeur    text,
ADD COLUMN table_separator        text                  NOT NULL DEFAULT '-',
ADD COLUMN table_padding          integer               NOT NULL DEFAULT 4 CHECK (table_padding BETWEEN 1 AND 10),
ADD COLUMN table_continuity_scope table_continuity_scope NOT NULL DEFAULT 'CENTRE';

-- 3. Mise à jour de la table centres
ALTER TABLE public.centres
ADD COLUMN code_departement text,
ADD COLUMN code_commune     text;

-- 4. Fonction affecter_candidats_salles (F04) — avec fix IS NOT DISTINCT FROM
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
  v_position_salle    int  := 0;
  v_table_debut       int;
  v_regle             affectation_rule;
  v_nb_affecter       int;
  v_continuity        table_continuity_scope;
  v_dept_code         text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'affecter_candidats_salles : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  -- Charger config examen
  SELECT status, table_continuity_scope INTO v_exam_status, v_continuity
  FROM examens WHERE id = p_examen_id;

  IF v_exam_status != 'COMPOSITION' THEN
    RAISE EXCEPTION 'affecter_candidats_salles : examen % doit être en COMPOSITION (statut: %)', p_examen_id, v_exam_status;
  END IF;

  -- Calcul de l'offset de départ (Continuité)
  IF v_continuity = 'CENTRE' THEN
    v_table_debut := 1;
  ELSE
    -- Récupérer le code département du centre actuel
    SELECT code_departement INTO v_dept_code FROM centres WHERE id = p_centre_id;

    -- Calculer la capacité totale des centres "précédents" rattachés à cet examen.
    -- Tri stable par centres.code (nomenclature métier).
    -- IS NOT DISTINCT FROM : gère correctement NULL = NULL (PostgreSQL)
    SELECT COALESCE(SUM(s.capacite), 0) + 1 INTO v_table_debut
    FROM examen_centres ec
    JOIN centres c ON c.id = ec.centre_id
    JOIN salles s ON s.centre_id = c.id AND s.examen_id = p_examen_id
    WHERE ec.examen_id = p_examen_id
      AND c.id != p_centre_id
      AND c.code < (SELECT code FROM centres WHERE id = p_centre_id)
      AND (
        v_continuity = 'EXAMEN'
        OR (v_continuity = 'DEPARTEMENT' AND c.code_departement IS NOT DISTINCT FROM v_dept_code)
      );
  END IF;

  -- Affectation par salle
  FOR v_salle IN
    SELECT id, capacite, ordre, regle_affectation, nom
    FROM salles
    WHERE examen_id = p_examen_id AND centre_id = p_centre_id
    ORDER BY ordre ASC
  LOOP
    v_regle          := v_salle.regle_affectation;
    v_position_salle := 0;

    FOR v_candidat_id IN
      SELECT c.id
      FROM candidats c
      WHERE c.examen_id = p_examen_id
        AND c.centre_id = p_centre_id
        AND c.salle_id  IS NULL
      ORDER BY
        CASE WHEN v_regle = 'alphabetique'      THEN c.nom_enc                END ASC,
        CASE WHEN v_regle = 'par_etablissement' THEN c.etablissement_id::text END ASC,
        CASE WHEN v_regle = 'numero_anonyme'    THEN c.numero_anonyme         END ASC,
        c.id ASC
      LIMIT v_salle.capacite
    LOOP
      v_position_salle := v_position_salle + 1;

      UPDATE candidats
      SET
        salle_id     = v_salle.id,
        numero_table = v_table_debut + v_position_salle - 1
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

-- 5. Vue v_candidats_affichage — avec fix NULL numero_table
--    COALESCE sur numero_table::text → NULL si non affecté (pas de formatage partiel)
CREATE OR REPLACE VIEW v_candidats_affichage AS
SELECT
  c.*,
  CASE
    WHEN c.numero_table IS NULL THEN NULL  -- non affecté → pas de numéro formaté
    WHEN e.table_prefix_type = 'AUCUN' THEN c.numero_table::text
    ELSE
      COALESCE(
        CASE
          WHEN e.table_prefix_type = 'FIXE'        THEN e.table_prefix_valeur
          WHEN e.table_prefix_type = 'CENTRE'       THEN ct.code
          WHEN e.table_prefix_type = 'COMMUNE'      THEN ct.code_commune
          WHEN e.table_prefix_type = 'DEPARTEMENT'  THEN ct.code_departement
        END,
        ''
      ) || e.table_separator || LPAD(c.numero_table::text, e.table_padding, '0')
  END AS numero_table_formate
FROM candidats c
JOIN examens e ON e.id = c.examen_id
LEFT JOIN centres ct ON ct.id = c.centre_id;
