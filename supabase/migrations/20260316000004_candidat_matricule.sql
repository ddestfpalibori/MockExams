-- ==============================================================================
-- Migration 20260316000004 — Ajout colonne matricule dans candidats
-- ==============================================================================
-- Le matricule est optionnel : certains examens ne l'utilisent pas.
-- Il est fourni à l'import et affiché sur le relevé de notes si renseigné.
-- ==============================================================================

ALTER TABLE candidats
  ADD COLUMN IF NOT EXISTS matricule TEXT NULL;
