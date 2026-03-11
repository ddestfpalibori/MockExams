-- Smoke test for anonymat_optionnel (manual run)
-- Usage: run in a dev database with service_role, then ROLLBACK.
-- This script is intentionally self-contained and non-destructive.

BEGIN;

-- Minimal fixtures
INSERT INTO series (code, libelle) VALUES ('T', 'Test') ON CONFLICT (code) DO NOTHING;
INSERT INTO etablissements (code, nom) VALUES ('E-T', 'Etab Test') ON CONFLICT (code) DO NOTHING;
INSERT INTO centres (code, nom) VALUES ('C-T', 'Centre Test') ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  v_examen_id uuid;
  v_centre_id uuid;
  v_etab_id uuid;
  v_serie_id uuid;
  v_count int;
BEGIN
  SELECT id INTO v_centre_id FROM centres WHERE code = 'C-T';
  SELECT id INTO v_etab_id FROM etablissements WHERE code = 'E-T';
  SELECT id INTO v_serie_id FROM series WHERE code = 'T';

  INSERT INTO examens (code, libelle, annee, anonymat_actif, status)
  VALUES ('EXAM-TEST', 'Examen Test', 2026, false, 'COMPOSITION')
  RETURNING id INTO v_examen_id;

  -- Create 2 candidates without numero_table => should fail on F05
  INSERT INTO candidats (examen_id, etablissement_id, serie_id, nom_enc, prenom_enc)
  VALUES
    (v_examen_id, v_etab_id, v_serie_id, 'x', 'y'),
    (v_examen_id, v_etab_id, v_serie_id, 'x2', 'y2');

  BEGIN
    PERFORM generer_anonymats_centre(v_examen_id, v_centre_id);
    RAISE EXCEPTION 'FAIL: expected exception for missing table numbers';
  EXCEPTION WHEN OTHERS THEN
    -- expected
    NULL;
  END;

  -- Assign numero_table and centre_id, then regenerate (numéros distincts)
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
    FROM candidats
    WHERE examen_id = v_examen_id
  )
  UPDATE candidats c
  SET centre_id = v_centre_id,
      numero_table = r.rn
  FROM ranked r
  WHERE c.id = r.id;

  v_count := generer_anonymats_centre(v_examen_id, v_centre_id);
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'FAIL: expected 2 anonymats, got %', v_count;
  END IF;

  -- Idempotence: second run should generate 0
  v_count := generer_anonymats_centre(v_examen_id, v_centre_id);
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: expected 0 on idempotent run, got %', v_count;
  END IF;
END $$;

ROLLBACK;
