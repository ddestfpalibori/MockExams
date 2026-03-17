-- ============================================================
-- Correction audit Sprint 6B — HIGH-01
--
-- Problème : la policy enseignant_resultats_select permettait
-- à un enseignant avec une affectation (classe_id IS NULL) sur
-- une discipline de voir TOUS les résultats de l'examen, y compris
-- ceux de candidats appartenant à d'autres disciplines.
--
-- Correction : passer par candidat_lots pour relier le résultat
-- à la discipline de l'enseignant, comme c'est fait pour
-- enseignant_candidats_select.
-- ============================================================

-- Supprimer l'ancienne policy fuyante
DROP POLICY IF EXISTS enseignant_resultats_select ON resultats;

-- Nouvelle policy : le résultat doit appartenir à un candidat
-- qui est dans un lot d'une des disciplines de l'enseignant,
-- avec filtre classe si applicable.
CREATE POLICY enseignant_resultats_select ON resultats
  FOR SELECT TO authenticated
  USING (
    is_enseignant()
    AND EXISTS (
      SELECT 1
      FROM user_disciplines ud
      JOIN candidat_lots cl
        ON cl.examen_discipline_id = ud.examen_discipline_id
        AND cl.candidat_id = resultats.candidat_id
      JOIN candidats c
        ON c.id = resultats.candidat_id
      WHERE ud.user_id = auth.uid()
        AND (ud.classe_id IS NULL OR c.classe_id = ud.classe_id)
    )
  );

COMMENT ON POLICY enseignant_resultats_select ON resultats IS
  'Enseignant voit uniquement les résultats de candidats dans SES disciplines (via candidat_lots).
   Si classe_id IS NULL : tous les candidats de la discipline.
   Si classe_id renseigné : uniquement les candidats de cette classe.
   Correction audit HIGH-01 Sprint 6B (2026-03-17).';
