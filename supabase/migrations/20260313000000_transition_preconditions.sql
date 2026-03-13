-- =====================================================
-- MockExams — Préconditions métier pour transitions de phase
-- Migration : 20260313000000_transition_preconditions.sql
-- BUG-01 : Le trigger check_exam_status_transition ne vérifiait
--          que l'ordre légal des phases, pas les données métier.
-- =====================================================
-- Préconditions ajoutées :
--   CORRECTION              → DELIBERATION : toutes les notes doivent être saisies
--   DELIBERE                → PUBLIE       : tous les candidats doivent avoir un résultat
--   CORRECTION_POST_DELIBERATION → DELIBERE : idem (F03 doit avoir été exécuté)
-- =====================================================

CREATE OR REPLACE FUNCTION check_exam_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_missing_notes bigint;
  v_total_candidats bigint;
  v_total_resultats bigint;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- ── 1. Vérification de l'ordre légal des transitions ──────────────────────
  IF NOT (
    (OLD.status = 'CONFIG'                         AND NEW.status = 'INSCRIPTIONS')              OR
    (OLD.status = 'INSCRIPTIONS'                   AND NEW.status = 'COMPOSITION')               OR
    (OLD.status = 'COMPOSITION'                    AND NEW.status = 'CORRECTION')                OR
    (OLD.status = 'CORRECTION'                     AND NEW.status = 'DELIBERATION')              OR
    (OLD.status = 'DELIBERATION'                   AND NEW.status = 'DELIBERE')                  OR
    (OLD.status = 'DELIBERE'                       AND NEW.status = 'CORRECTION_POST_DELIBERATION') OR
    (OLD.status = 'DELIBERE'                       AND NEW.status = 'PUBLIE')                    OR
    (OLD.status = 'CORRECTION_POST_DELIBERATION'   AND NEW.status = 'DELIBERE')                  OR
    (OLD.status = 'PUBLIE'                         AND NEW.status = 'CLOS')
  ) THEN
    RAISE EXCEPTION 'Transition d''état interdite : % → % (examen %)',
      OLD.status, NEW.status, OLD.id;
  END IF;

  -- ── 2. Préconditions métier ───────────────────────────────────────────────

  -- CORRECTION → DELIBERATION : aucune note manquante autorisée
  IF OLD.status = 'CORRECTION' AND NEW.status = 'DELIBERATION' THEN
    SELECT COUNT(*)
    INTO v_missing_notes
    FROM candidat_lots cl
    JOIN lots l ON l.id = cl.lot_id
    JOIN examen_disciplines ed ON ed.id = cl.examen_discipline_id
    LEFT JOIN candidat_choix_disciplines ccd
      ON ccd.candidat_id = cl.candidat_id
     AND ccd.groupe_choix_id = ed.groupe_choix_id
     AND ccd.examen_discipline_id = ed.id
    LEFT JOIN saisies s ON s.lot_id = cl.lot_id AND s.candidat_id = cl.candidat_id
    WHERE l.examen_id = OLD.id
      AND (ed.groupe_choix_id IS NULL OR ccd.candidat_id IS NOT NULL)
      AND s.note_centimes IS NULL
      AND s.code_special IS NULL;

    IF v_missing_notes > 0 THEN
      RAISE EXCEPTION 'Impossible de passer en DELIBERATION : % note(s) manquante(s). Toutes les notes doivent être saisies avant la délibération.',
        v_missing_notes;
    END IF;
  END IF;

  -- DELIBERE → PUBLIE : tous les candidats doivent avoir un résultat
  IF OLD.status = 'DELIBERE' AND NEW.status = 'PUBLIE' THEN
    SELECT COUNT(DISTINCT c.id)
    INTO v_total_candidats
    FROM candidats c
    WHERE c.examen_id = OLD.id;

    SELECT COUNT(DISTINCT r.candidat_id)
    INTO v_total_resultats
    FROM resultats r
    WHERE r.examen_id = OLD.id;

    IF v_total_resultats < v_total_candidats THEN
      RAISE EXCEPTION 'Impossible de publier : % candidat(s) sur % n''ont pas de résultat. Lancez la délibération d''abord.',
        v_total_candidats - v_total_resultats, v_total_candidats;
    END IF;
  END IF;

  -- CORRECTION_POST_DELIBERATION → DELIBERE : F03 doit avoir été exécuté
  -- Même garde que DELIBERE → PUBLIE : tous les candidats doivent avoir un résultat.
  -- Protège contre un admin qui bypasse l'UI et transite sans appeler F03.
  IF OLD.status = 'CORRECTION_POST_DELIBERATION' AND NEW.status = 'DELIBERE' THEN
    SELECT COUNT(DISTINCT c.id)
    INTO v_total_candidats
    FROM candidats c
    WHERE c.examen_id = OLD.id;

    SELECT COUNT(DISTINCT r.candidat_id)
    INTO v_total_resultats
    FROM resultats r
    WHERE r.examen_id = OLD.id;

    IF v_total_resultats < v_total_candidats THEN
      RAISE EXCEPTION 'Impossible de re-délibérer : % candidat(s) sur % sans résultat. Exécutez la délibération (F03) avant de confirmer.',
        v_total_candidats - v_total_resultats, v_total_candidats;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
