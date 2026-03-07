-- =====================================================
-- MockExams — Migration 20260306000005
-- Objet : Seuil de rattrapage configurable par examen
-- =====================================================
-- Correctif B4 (certification) :
--   Le seuil de rattrapage était hardcodé dans deliberer_candidat
--   comme (seuil_phase2 - 200). Le PRD US-04 le définit comme
--   paramètre configurable à la création de l'examen.
--
-- Valeur NULL = rattrapage désactivé (cohérent avec rattrapage_actif=false)
-- Valeur 800  = seuil à 8.00/20 (exemple courant)
-- Contrainte : seuil_rattrapage < seuil_phase2 (sinon aucun sens métier)
-- =====================================================

ALTER TABLE examens
  ADD COLUMN seuil_rattrapage smallint
    CHECK (seuil_rattrapage BETWEEN 0 AND 2000),
  ADD CONSTRAINT chk_seuil_rattrapage_inferieur_phase2
    CHECK (seuil_rattrapage IS NULL OR seuil_rattrapage < seuil_phase2);

COMMENT ON COLUMN examens.seuil_rattrapage IS
  'Seuil minimum (centièmes) pour décision RATTRAPAGE. NULL si rattrapage non utilisé. Doit être < seuil_phase2.';
