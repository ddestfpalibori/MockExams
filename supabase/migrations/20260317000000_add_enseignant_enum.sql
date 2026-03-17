-- ============================================================
-- Sprint 6B — Pré-requis : ajout de la valeur 'enseignant'
--              à l'enum user_role.
--
-- DOIT être dans une migration séparée (transaction distincte)
-- car PostgreSQL interdit d'utiliser une nouvelle valeur d'enum
-- dans la même transaction où elle est ajoutée.
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'enseignant';
