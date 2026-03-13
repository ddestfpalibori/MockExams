-- ==============================================================================
-- Migration 20260313000002 — RLS saisies : accès lecture chef_etablissement
-- ==============================================================================
-- Contexte : chef_etablissement doit pouvoir consulter les notes de ses candidats
-- pour produire des exports résultats détaillés (M14).
-- La chaîne de jointure est :
--   saisies.lot_id → lots → examen_discipline_id → (via candidat_lots) → candidats.etablissement_id
-- On passe par candidat_lots car la saisie est liée au lot, et les candidats
-- affectés à un lot sont dans candidat_lots.
-- ==============================================================================

-- Supprimer l'ancienne policy SELECT pour la remplacer
DROP POLICY IF EXISTS "saisies_select" ON saisies;

-- Nouvelle policy : admin + chef_centre (inchangé) + chef_etablissement (nouveau)
CREATE POLICY "saisies_select"
  ON saisies FOR SELECT
  USING (
    is_admin()
    OR (is_chef_centre() AND EXISTS (
      SELECT 1 FROM lots l
      WHERE l.id = saisies.lot_id
        AND l.centre_id IN (SELECT my_centre_ids())
    ))
    OR (is_chef_etablissement() AND EXISTS (
      SELECT 1
      FROM candidat_lots cl
      JOIN candidats c ON c.id = cl.candidat_id
      WHERE cl.lot_id = saisies.lot_id
        AND cl.candidat_id = saisies.candidat_id
        AND c.etablissement_id IN (SELECT my_etablissement_ids())
    ))
  );
