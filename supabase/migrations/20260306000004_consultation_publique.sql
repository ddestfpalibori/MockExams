-- =====================================================
-- MockExams — Migration 20260306000004
-- Objet : Support consultation publique des résultats
-- =====================================================
-- Ajouts :
--   1. codes_acces.candidat_id  — lier un code à un candidat individuel
--   2. consultation_tentatives  — lockout par (examen_id, numero_anonyme, ip_hash)
--      conformément au Brief §4.8.4
-- =====================================================

-- ── 1. Lier codes_acces à un candidat individuel ─────────────────────────────
--
-- Contexte (Brief §4.9.5) :
--   Modèle B (défaut) : 1 code par élève — distribué nominativement par l'établissement
--   Modèle A          : 1 code par numéro anonyme — liste affichée au centre
--
-- Dans les deux cas, la consultation publique = candidat individuel → code 1:1

ALTER TABLE codes_acces
  ADD COLUMN candidat_id uuid REFERENCES candidats(id);

-- Index pour la recherche de consultation publique :
--   SELECT * FROM codes_acces WHERE code_hash = ? AND candidat_id IN
--     (SELECT id FROM candidats WHERE examen_id = ? AND numero_anonyme = ?)
CREATE INDEX idx_codes_acces_candidat ON codes_acces(candidat_id)
  WHERE candidat_id IS NOT NULL;

-- ── 2. Table de lockout consultation publique ─────────────────────────────────
--
-- Lockout par (examen_id, numero_anonyme, ip_hash) — PAS par IP seule
-- Raison : IP partagée (réseau école, 4G NAT) ne doit pas bloquer tous les élèves
--
-- Barème (Brief §4.8.4) :
--   Tentatives 1-5   : réponse normale
--   Tentative 6      : blocage 1 heure
--   Tentatives 7-9   : blocage 24 heures
--   Tentative 10+    : blocage 72 heures + signalement audit log

CREATE TABLE consultation_tentatives (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id       uuid        NOT NULL REFERENCES examens(id),
  -- Numéro anonyme tenté (pas nécessairement valide — peut être une énumération)
  numero_anonyme  text        NOT NULL,
  -- Hash SHA-256 de l'IP (tronqué à 16 hex = 64 bits — suffisant pour lockout)
  ip_hash         text        NOT NULL,
  tentatives      int         NOT NULL DEFAULT 1 CHECK (tentatives > 0),
  lockout_until   timestamptz,
  derniere_tentative  timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (examen_id, numero_anonyme, ip_hash)
);

CREATE INDEX idx_consultation_tentatives_lookup
  ON consultation_tentatives (examen_id, numero_anonyme, ip_hash);

CREATE INDEX idx_consultation_tentatives_lockout
  ON consultation_tentatives (lockout_until)
  WHERE lockout_until IS NOT NULL;

-- Audit log sur les blocages 72h (signalement obligatoire — Brief §4.8.4)
CREATE TRIGGER trg_audit_consultation_tentatives
  AFTER INSERT OR UPDATE ON consultation_tentatives
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ── 3. RLS sur consultation_tentatives ───────────────────────────────────────
-- Lecture/écriture via service_role uniquement (Edge Function)
ALTER TABLE consultation_tentatives ENABLE ROW LEVEL SECURITY;

-- Aucune policy anon/authenticated — accès exclusif via Edge Function (service_role)
-- REVOKE explicite pour éviter tout accès direct
REVOKE ALL ON consultation_tentatives FROM anon, authenticated;
GRANT ALL ON consultation_tentatives TO service_role;

-- Même règle pour la colonne candidat_id ajoutée à codes_acces
-- (RLS déjà activé sur codes_acces dans 20260306000001_rls.sql)
