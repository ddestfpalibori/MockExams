-- ============================================================
-- Sprint 7 — Audit Log UI (US-24)
--
-- 1. RLS tutelle sur audit_log (lecture seule)
-- 2. RPC debloquer_consultation (admin uniquement)
-- ============================================================

-- ─── 1. Politique SELECT tutelle sur audit_log ───────────────────────────────
-- La politique existante "audit_log_select_admin" couvre is_admin().
-- On ajoute une politique distincte pour tutelle.

CREATE POLICY "audit_log_select_tutelle"
  ON audit_log FOR SELECT
  USING (is_tutelle());

-- ─── 2. RPC déblocage consultation publique ───────────────────────────────────
-- Réinitialise les tentatives et lockout d'un code d'accès bloqué.
-- SECURITY DEFINER : contourne le RLS de codes_acces.
-- Guard is_admin() : réservé à l'administrateur.

CREATE OR REPLACE FUNCTION debloquer_consultation(p_code_acces_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'debloquer_consultation : accès refusé (uid: %)', auth.uid();
  END IF;

  UPDATE codes_acces
  SET tentatives    = 0,
      lockout_until = NULL
  WHERE id = p_code_acces_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'debloquer_consultation : code d''accès % introuvable', p_code_acces_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION debloquer_consultation(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION debloquer_consultation(uuid) TO authenticated;
