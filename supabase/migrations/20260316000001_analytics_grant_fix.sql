-- ==============================================================================
-- Migration 20260316000001 — Hotfix : GRANT EXECUTE sur get_analytics_examen
-- ==============================================================================
-- REVOKE ALL FROM PUBLIC dans la migration précédente retirait aussi les droits
-- du service_role (non-superuser dans Supabase). Ce GRANT rétablit l'accès
-- exclusif pour l'Edge Function get-analytics qui tourne sous service_role.
-- ==============================================================================

GRANT EXECUTE ON FUNCTION get_analytics_examen(uuid, uuid, uuid, text) TO service_role;
