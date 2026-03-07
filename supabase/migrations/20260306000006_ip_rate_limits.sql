-- =====================================================
-- MockExams — Migration 20260306000006
-- Objet : Rate limiting IP persisté en base de données
-- =====================================================
-- Correctif B1 (certification) :
--   Le rate limiting global par IP dans consultation-publique
--   utilisait un Map<string,...> en mémoire JS, inopérant sur
--   les runtimes serverless (cold start = Map vide).
--
-- Solution : table ip_rate_limits + fonction atomique check_ip_rate_limit.
-- Fenêtre glissante de 1 minute, max 20 requêtes par IP.
--
-- La clé stockée est un hash SHA-256 tronqué (16 hex) de l'IP
-- pour éviter de stocker des données personnelles (RGPD).
--
-- Nettoyage automatique : une entrée expirée (window_start + 2 min)
-- est réinitialisée à la prochaine requête de la même IP.
-- Un pg_cron optionnel peut passer DELETE monthly pour purger les IPs inactives.
-- =====================================================

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE ip_rate_limits (
  ip_hash      text        PRIMARY KEY,
  count        integer     NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ip_rate_limits IS
  'Rate limiting global par IP pour les endpoints publics (consultation-publique).
   ip_hash = SHA-256[:16] de l''IP + sel — jamais l''IP en clair (RGPD).';

-- ── Pas de RLS — accès uniquement via service_role + fonction SECURITY DEFINER

REVOKE ALL ON ip_rate_limits FROM PUBLIC;
GRANT ALL ON ip_rate_limits TO service_role;

-- ── Fonction atomique ─────────────────────────────────────────────────────────
-- Retourne TRUE si la requête est autorisée, FALSE si rate-limitée.
-- L'incrémentation et la vérification sont atomiques (INSERT ... ON CONFLICT).

CREATE OR REPLACE FUNCTION check_ip_rate_limit(
  p_ip_hash text,
  p_max     integer DEFAULT 20
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO ip_rate_limits (ip_hash, count, window_start)
  VALUES (p_ip_hash, 1, now())
  ON CONFLICT (ip_hash) DO UPDATE
    SET count        = CASE
                         WHEN ip_rate_limits.window_start + interval '1 minute' < now()
                         THEN 1                           -- nouvelle fenêtre, remise à 1
                         ELSE ip_rate_limits.count + 1    -- même fenêtre, incrément
                       END,
        window_start = CASE
                         WHEN ip_rate_limits.window_start + interval '1 minute' < now()
                         THEN now()                       -- ouvrir nouvelle fenêtre
                         ELSE ip_rate_limits.window_start -- maintenir la fenêtre courante
                       END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

COMMENT ON FUNCTION check_ip_rate_limit(text, integer) IS
  'Incrémente le compteur de l''IP et retourne TRUE si dans la limite.
   Atomique — sûr pour les runtimes serverless multi-instances.';

REVOKE EXECUTE ON FUNCTION check_ip_rate_limit(text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION check_ip_rate_limit(text, integer) TO service_role;
