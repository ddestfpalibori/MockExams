-- =====================================================
-- MockExams — Seed Staging (200 candidats)
-- Objectif : valider F03 deliberer_examen + volumétrie
-- Usage    : psql -f seed_staging.sql (sur DB staging uniquement)
-- Compatible avec : schema v2.1 (migration 20260306000000)
-- =====================================================

BEGIN;

-- ─── 1. Série ────────────────────────────────────────────────────────────────

INSERT INTO series (id, code, libelle) VALUES
  ('11111111-0000-0000-0000-000000000001', 'D', 'Série D — Sciences')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Disciplines (sans coefficient — il est dans examen_disciplines) ───────

INSERT INTO disciplines (id, code, libelle, type_defaut) VALUES
  ('22222222-0000-0000-0000-000000000001', 'MATH', 'Mathématiques',   'ecrit_obligatoire'),
  ('22222222-0000-0000-0000-000000000002', 'PC',   'Physique-Chimie', 'ecrit_obligatoire'),
  ('22222222-0000-0000-0000-000000000003', 'SVT',  'Sciences de la Vie', 'ecrit_obligatoire'),
  ('22222222-0000-0000-0000-000000000004', 'FR',   'Français',        'ecrit_obligatoire'),
  ('22222222-0000-0000-0000-000000000005', 'PHIL', 'Philosophie',     'ecrit_obligatoire'),
  ('22222222-0000-0000-0000-000000000006', 'EPS',  'EPS',             'ecrit_obligatoire')
ON CONFLICT (id) DO NOTHING;

-- ─── 3. Centre et établissements (sans centre_id — lien via examen_etablissements) ─

INSERT INTO centres (id, code, nom, ville) VALUES
  ('33333333-0000-0000-0000-000000000001', 'CPP', 'Centre Pilote Parakou', 'Parakou')
ON CONFLICT (id) DO NOTHING;

INSERT INTO etablissements (id, code, nom, ville) VALUES
  ('44444444-0000-0000-0000-000000000001', 'LMB',  'Lycée Mathieu Bouké', 'Parakou'),
  ('44444444-0000-0000-0000-000000000002', 'CEGB', 'CEG Bembèrèkè',       'Bembèrèkè')
ON CONFLICT (id) DO NOTHING;

-- ─── 4. Examen pilote ────────────────────────────────────────────────────────
-- status = 'CORRECTION' pour tester l'import de notes
-- seuil_phase1 = 900 (9.00/20), seuil_phase2 = 1000 (10.00/20)

INSERT INTO examens (id, code, libelle, annee, status, mode_deliberation,
                     seuil_phase1, seuil_phase2, eps_active, hmac_window_days) VALUES
  (
    '55555555-0000-0000-0000-000000000001',
    'EB-2026-PILOTE',
    'Examen Blanc Pilote 2026',
    2026,
    'CORRECTION',
    'unique',
    900,
    1000,
    true,
    90
  )
ON CONFLICT (id) DO NOTHING;

-- Association série ↔ examen
INSERT INTO examen_series (examen_id, serie_id) VALUES
  ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Association disciplines ↔ examen (coefficients dans examen_disciplines)
-- type = 'ecrit_obligatoire' sauf EPS
INSERT INTO examen_disciplines (id, examen_id, discipline_id, type, coefficient, bareme, ordre_affichage)
VALUES
  ('dd000001-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'ecrit_obligatoire', 5, 20, 1),
  ('dd000001-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'ecrit_obligatoire', 4, 20, 2),
  ('dd000001-0000-0000-0000-000000000003', '55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', 'ecrit_obligatoire', 4, 20, 3),
  ('dd000001-0000-0000-0000-000000000004', '55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004', 'ecrit_obligatoire', 3, 20, 4),
  ('dd000001-0000-0000-0000-000000000005', '55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000005', 'ecrit_obligatoire', 2, 20, 5),
  ('dd000001-0000-0000-0000-000000000006', '55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000006', 'ecrit_obligatoire', 2, 20, 6)
ON CONFLICT (examen_id, discipline_id) DO NOTHING;

-- Séries applicables : Série D pour toutes les disciplines
INSERT INTO examen_discipline_series (examen_discipline_id, serie_id)
VALUES
  ('dd000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001'),
  ('dd000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001'),
  ('dd000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001'),
  ('dd000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001'),
  ('dd000001-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001'),
  ('dd000001-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Association centre ↔ examen
INSERT INTO examen_centres (examen_id, centre_id) VALUES
  ('55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Association établissements ↔ examen (avec leur centre)
INSERT INTO examen_etablissements (examen_id, etablissement_id, centre_id) VALUES
  ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001'),
  ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ─── 5. Salles (avec examen_id requis) ───────────────────────────────────────

INSERT INTO salles (id, examen_id, centre_id, nom, capacite) VALUES
  ('66666666-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Salle A', 50),
  ('66666666-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Salle B', 50),
  ('66666666-0000-0000-0000-000000000003', '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Salle C', 50),
  ('66666666-0000-0000-0000-000000000004', '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Salle D', 50)
ON CONFLICT (examen_id, centre_id, nom) DO NOTHING;

-- ─── 6. Candidats (200) ──────────────────────────────────────────────────────
-- nom_enc / prenom_enc : valeurs placeholder (seed non chiffrées — staging seulement)
-- Distribution : 120 LMB + 80 CEGB
-- Cas limites : ABD (5), ABS Maths (10), note=10.00 (5), note=8.00 (5), INAPTE EPS (50)

DO $$
DECLARE
  v_examen_id  uuid := '55555555-0000-0000-0000-000000000001';
  v_serie_id   uuid := '11111111-0000-0000-0000-000000000001';
  v_etab_lmb   uuid := '44444444-0000-0000-0000-000000000001';
  v_etab_cegb  uuid := '44444444-0000-0000-0000-000000000002';
  v_centre_id  uuid := '33333333-0000-0000-0000-000000000001';
  v_candidat   uuid;
  i            int;
BEGIN
  FOR i IN 1..200 LOOP
    v_candidat := gen_random_uuid();

    INSERT INTO candidats (
      id, examen_id, etablissement_id, serie_id,
      nom_enc, prenom_enc,
      centre_id, salle_id, numero_table, numero_anonyme,
      candidat_fingerprint
    ) VALUES (
      v_candidat,
      v_examen_id,
      CASE WHEN i <= 120 THEN v_etab_lmb ELSE v_etab_cegb END,
      v_serie_id,
      -- Données d'identité en placeholder (seed staging seulement — pas de vraie clé AES)
      'placeholder_nom_' || i,
      'placeholder_prenom_' || i,
      v_centre_id,
      CASE
        WHEN i <=  50 THEN '66666666-0000-0000-0000-000000000001'::uuid
        WHEN i <= 100 THEN '66666666-0000-0000-0000-000000000002'::uuid
        WHEN i <= 150 THEN '66666666-0000-0000-0000-000000000003'::uuid
        ELSE               '66666666-0000-0000-0000-000000000004'::uuid
      END,
      i,                         -- numero_table unique dans le centre (1..200)
      LPAD(i::text, 4, '0'),   -- N° anonyme : 0001..0200
      -- Fingerprint fictif unique (seed seulement — normalement HMAC-SHA256 côté app)
      md5('seed-candidat-' || i)
    );
  END LOOP;
END $$;

-- ─── 7. Lots (1 par discipline — bon=1 pour simplicité seed) ─────────────────

INSERT INTO lots (id, examen_id, centre_id, examen_discipline_id, serie_id, lot_numero, nb_copies, status,
                  hmac_signature, generation_timestamp)
VALUES
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 1, 200, 'EN_ATTENTE', NULL, NULL),
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 1, 200, 'EN_ATTENTE', NULL, NULL),
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 1, 200, 'EN_ATTENTE', NULL, NULL),
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 1, 200, 'EN_ATTENTE', NULL, NULL),
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 1, 200, 'EN_ATTENTE', NULL, NULL),
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'dd000001-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', 1, 200, 'EN_ATTENTE', NULL, NULL);

-- ─── 8. candidat_lots (affectation de chaque candidat à chaque lot) ───────────

DO $$
DECLARE
  v_lot      record;
  v_candidat record;
  pos        int;
BEGIN
  FOR v_lot IN
    SELECT id, examen_discipline_id
    FROM lots
    WHERE examen_id = '55555555-0000-0000-0000-000000000001'
  LOOP
    pos := 0;
    FOR v_candidat IN
      SELECT id FROM candidats
      WHERE examen_id = '55555555-0000-0000-0000-000000000001'
      ORDER BY numero_anonyme
    LOOP
      pos := pos + 1;
      INSERT INTO candidat_lots (candidat_id, lot_id, examen_discipline_id, position_dans_lot)
      VALUES (v_candidat.id, v_lot.id, v_lot.examen_discipline_id, pos)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ─── 9. Saisies avec cas limites ──────────────────────────────────────────────
-- Colonnes réelles : lot_id, numero_anonyme, candidat_id, note_centimes, code_special
-- Cas couverts :
--   - ABD total            : candidats 0001-0005 → NON_ADMIS automatique (F02)
--   - ABS Maths seulement  : candidats 0006-0015 → NON_ADMIS auto (1 ABS = non admis)
--   - Note pile 10.00      : candidats 0016-0020 → ADMIS (seuil_phase2=1000)
--   - Note pile 8.00       : candidats 0021-0025 → dépend du mode rattrapage
--   - Notes aléatoires     : reste des candidats

DO $$
DECLARE
  v_lot       record;
  v_saisie    record;
  v_note_c    smallint;
  rang        int;
BEGIN
  FOR v_lot IN
    SELECT l.id AS lot_id, l.examen_discipline_id, d.code AS disc_code
    FROM lots l
    JOIN examen_disciplines ed ON ed.id = l.examen_discipline_id
    JOIN disciplines d ON d.id = ed.discipline_id
    WHERE l.examen_id = '55555555-0000-0000-0000-000000000001'
  LOOP
    rang := 0;
    FOR v_saisie IN
      SELECT cl.candidat_id, c.numero_anonyme,
             ROW_NUMBER() OVER (ORDER BY c.numero_anonyme) AS rn
      FROM candidat_lots cl
      JOIN candidats c ON c.id = cl.candidat_id
      WHERE cl.lot_id = v_lot.lot_id
      ORDER BY c.numero_anonyme
    LOOP
      rang := v_saisie.rn;

      IF rang BETWEEN 1 AND 5 THEN
        -- ABD sur toutes les disciplines
        INSERT INTO saisies (lot_id, numero_anonyme, candidat_id, code_special)
        VALUES (v_lot.lot_id, v_saisie.numero_anonyme, v_saisie.candidat_id, 'ABD')
        ON CONFLICT (lot_id, numero_anonyme) DO NOTHING;

      ELSIF rang BETWEEN 6 AND 15 AND v_lot.disc_code = 'MATH' THEN
        -- ABS uniquement sur Maths
        INSERT INTO saisies (lot_id, numero_anonyme, candidat_id, code_special)
        VALUES (v_lot.lot_id, v_saisie.numero_anonyme, v_saisie.candidat_id, 'ABS')
        ON CONFLICT (lot_id, numero_anonyme) DO NOTHING;

      ELSIF rang BETWEEN 6 AND 15 THEN
        -- Autres disciplines pour ces candidats : note normale
        v_note_c := (600 + (random() * 800)::int)::smallint; -- 6.00..14.00
        INSERT INTO saisies (lot_id, numero_anonyme, candidat_id, note_centimes)
        VALUES (v_lot.lot_id, v_saisie.numero_anonyme, v_saisie.candidat_id, v_note_c)
        ON CONFLICT (lot_id, numero_anonyme) DO NOTHING;

      ELSIF rang BETWEEN 16 AND 20 THEN
        -- Exactement 10.00 = 1000 centièmes
        INSERT INTO saisies (lot_id, numero_anonyme, candidat_id, note_centimes)
        VALUES (v_lot.lot_id, v_saisie.numero_anonyme, v_saisie.candidat_id, 1000)
        ON CONFLICT (lot_id, numero_anonyme) DO NOTHING;

      ELSIF rang BETWEEN 21 AND 25 THEN
        -- Exactement 8.00 = 800 centièmes
        INSERT INTO saisies (lot_id, numero_anonyme, candidat_id, note_centimes)
        VALUES (v_lot.lot_id, v_saisie.numero_anonyme, v_saisie.candidat_id, 800)
        ON CONFLICT (lot_id, numero_anonyme) DO NOTHING;

      ELSE
        -- Note aléatoire [6.00..18.00]
        v_note_c := (600 + (random() * 1200)::int)::smallint;
        INSERT INTO saisies (lot_id, numero_anonyme, candidat_id, note_centimes)
        VALUES (v_lot.lot_id, v_saisie.numero_anonyme, v_saisie.candidat_id, v_note_c)
        ON CONFLICT (lot_id, numero_anonyme) DO NOTHING;

      END IF;
    END LOOP;
  END LOOP;
END $$;

COMMIT;

-- ─── Vérification post-seed ──────────────────────────────────────────────────

SELECT 'Candidats'   AS table_name, count(*) AS nb FROM candidats   WHERE examen_id = '55555555-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Lots',       count(*) FROM lots         WHERE examen_id = '55555555-0000-0000-0000-000000000001'
UNION ALL
SELECT 'Candidat_lots', count(*) FROM candidat_lots WHERE lot_id IN (SELECT id FROM lots WHERE examen_id = '55555555-0000-0000-0000-000000000001')
UNION ALL
SELECT 'Saisies',    count(*) FROM saisies       WHERE lot_id IN (SELECT id FROM lots WHERE examen_id = '55555555-0000-0000-0000-000000000001')
UNION ALL
SELECT 'ABD',        count(*) FROM saisies       WHERE code_special = 'ABD' AND lot_id IN (SELECT id FROM lots WHERE examen_id = '55555555-0000-0000-0000-000000000001')
UNION ALL
SELECT 'ABS',        count(*) FROM saisies       WHERE code_special = 'ABS' AND lot_id IN (SELECT id FROM lots WHERE examen_id = '55555555-0000-0000-0000-000000000001');
