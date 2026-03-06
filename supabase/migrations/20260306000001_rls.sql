-- =====================================================
-- MockExams — Politiques RLS
-- Migration : 20260306000001_rls.sql
-- Version   : 2.0
-- Basé sur  : PRD v1.3 + Brief v2.6
-- =====================================================
-- Principe général :
--   admin              → accès total
--   chef_centre        → son/ses centre(s) uniquement
--   chef_etablissement → son/ses établissement(s) uniquement
--   tutelle            → lecture seule (résultats, stats)
--   correcteurs        → AUCUN compte Supabase — Edge Function (service_role) uniquement
--   anon               → RPC controlée uniquement (recherche_resultat_public)
--
-- Gardes de statut d'examen :
--   Les écritures sont bloquées quand l'examen est PUBLIE ou CLOS
--   sauf pour admin qui peut toujours corriger des anomalies
-- =====================================================


-- ==========================
-- HELPERS SECURITY DEFINER
-- SET search_path = public, pg_catalog prévient les attaques
-- par injection de search_path sur fonctions privilégiées
-- ==========================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_active = true)
$$;

CREATE OR REPLACE FUNCTION is_chef_centre()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'chef_centre' AND is_active = true)
$$;

CREATE OR REPLACE FUNCTION is_chef_etablissement()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'chef_etablissement' AND is_active = true)
$$;

CREATE OR REPLACE FUNCTION is_tutelle()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutelle' AND is_active = true)
$$;

CREATE OR REPLACE FUNCTION my_centre_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT centre_id FROM user_centres WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION my_etablissement_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT etablissement_id FROM user_etablissements WHERE user_id = auth.uid()
$$;

-- Vérifie que l'examen n'est pas encore fermé (garde d'écriture générique)
CREATE OR REPLACE FUNCTION examen_est_modifiable(p_examen_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (
    SELECT 1 FROM examens
    WHERE id = p_examen_id
      AND status NOT IN ('PUBLIE', 'CLOS')
  )
$$;


-- ==========================
-- ACTIVATION RLS
-- ==========================

ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE series                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplines                ENABLE ROW LEVEL SECURITY;
ALTER TABLE centres                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE etablissements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_centres               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_etablissements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE examens                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_series              ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_disciplines         ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_discipline_series   ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_centres             ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_etablissements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_liens               ENABLE ROW LEVEL SECURITY;
ALTER TABLE examen_lien_etablissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports_log                ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidats                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidat_choix_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE salles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidat_lots              ENABLE ROW LEVEL SECURITY;
ALTER TABLE codes_acces                ENABLE ROW LEVEL SECURITY;
ALTER TABLE saisies                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                  ENABLE ROW LEVEL SECURITY;


-- ==========================
-- profiles
-- ==========================

CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

-- Mise à jour de son propre profil — rôle non modifiable par soi-même
CREATE POLICY "profiles_update_self"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  USING (is_admin());


-- ==========================
-- Référentiels (lecture tous, écriture admin)
-- ==========================

CREATE POLICY "series_select"         ON series         FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "series_write_admin"    ON series         FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "disciplines_select"    ON disciplines    FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "disciplines_write"     ON disciplines    FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "centres_select"        ON centres        FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "centres_write_admin"   ON centres        FOR ALL    USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "etablissements_select" ON etablissements FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "etablissements_write"  ON etablissements FOR ALL    USING (is_admin()) WITH CHECK (is_admin());


-- ==========================
-- user_centres / user_etablissements
-- ==========================

CREATE POLICY "user_centres_select"
  ON user_centres FOR SELECT
  USING (is_admin() OR user_id = auth.uid());

CREATE POLICY "user_centres_write_admin"
  ON user_centres FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "user_etablissements_select"
  ON user_etablissements FOR SELECT
  USING (is_admin() OR user_id = auth.uid());

CREATE POLICY "user_etablissements_write_admin"
  ON user_etablissements FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());


-- ==========================
-- examens
-- ==========================

CREATE POLICY "examens_select"
  ON examens FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR (is_chef_centre() AND EXISTS (
      SELECT 1 FROM examen_centres ec
      WHERE ec.examen_id = examens.id AND ec.centre_id IN (SELECT my_centre_ids())
    ))
    OR (is_chef_etablissement() AND EXISTS (
      SELECT 1 FROM examen_etablissements ee
      WHERE ee.examen_id = examens.id AND ee.etablissement_id IN (SELECT my_etablissement_ids())
    ))
  );

CREATE POLICY "examens_write_admin"
  ON examens FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());


-- ==========================
-- Configuration examen
-- (examen_series, examen_disciplines, examen_discipline_series,
--  examen_centres, examen_etablissements)
-- ==========================

CREATE POLICY "examen_series_select"
  ON examen_series FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR EXISTS (SELECT 1 FROM examen_centres ec
               WHERE ec.examen_id = examen_series.examen_id
                 AND ec.centre_id IN (SELECT my_centre_ids()))
    OR EXISTS (SELECT 1 FROM examen_etablissements ee
               WHERE ee.examen_id = examen_series.examen_id
                 AND ee.etablissement_id IN (SELECT my_etablissement_ids()))
  );
CREATE POLICY "examen_series_write_admin"
  ON examen_series FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "examen_disciplines_select"
  ON examen_disciplines FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR EXISTS (SELECT 1 FROM examen_centres ec
               WHERE ec.examen_id = examen_disciplines.examen_id
                 AND ec.centre_id IN (SELECT my_centre_ids()))
    OR EXISTS (SELECT 1 FROM examen_etablissements ee
               WHERE ee.examen_id = examen_disciplines.examen_id
                 AND ee.etablissement_id IN (SELECT my_etablissement_ids()))
  );
CREATE POLICY "examen_disciplines_write_admin"
  ON examen_disciplines FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "examen_discipline_series_select"
  ON examen_discipline_series FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR EXISTS (
      SELECT 1 FROM examen_disciplines ed
      JOIN examen_centres ec ON ec.examen_id = ed.examen_id
      WHERE ed.id = examen_discipline_series.examen_discipline_id
        AND ec.centre_id IN (SELECT my_centre_ids())
    )
    OR EXISTS (
      SELECT 1 FROM examen_disciplines ed
      JOIN examen_etablissements ee ON ee.examen_id = ed.examen_id
      WHERE ed.id = examen_discipline_series.examen_discipline_id
        AND ee.etablissement_id IN (SELECT my_etablissement_ids())
    )
  );
CREATE POLICY "examen_discipline_series_write_admin"
  ON examen_discipline_series FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "examen_centres_select"
  ON examen_centres FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR (is_chef_centre() AND centre_id IN (SELECT my_centre_ids()))
    OR EXISTS (SELECT 1 FROM examen_etablissements ee
               WHERE ee.examen_id = examen_centres.examen_id
                 AND ee.etablissement_id IN (SELECT my_etablissement_ids()))
  );
CREATE POLICY "examen_centres_write_admin"
  ON examen_centres FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "examen_etablissements_select"
  ON examen_etablissements FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR (is_chef_centre()        AND centre_id        IN (SELECT my_centre_ids()))
    OR (is_chef_etablissement() AND etablissement_id IN (SELECT my_etablissement_ids()))
  );
CREATE POLICY "examen_etablissements_write_admin"
  ON examen_etablissements FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ==========================
-- examen_liens / examen_lien_etablissements (US-08)
-- ==========================
-- Lecture : admin, tutelle, chef_centre impliqué dans l'examen cible ou source,
--           chef_établissement impliqué dans le lien
-- Écriture : admin uniquement (opération sensible — héritage de cohorte)

CREATE POLICY "examen_liens_select"
  ON examen_liens FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR (is_chef_centre() AND (
      EXISTS (SELECT 1 FROM examen_centres ec
              WHERE ec.examen_id = examen_liens.examen_cible_id
                AND ec.centre_id IN (SELECT my_centre_ids()))
      OR EXISTS (SELECT 1 FROM examen_centres ec
                 WHERE ec.examen_id = examen_liens.examen_source_id
                   AND ec.centre_id IN (SELECT my_centre_ids()))
    ))
    OR (is_chef_etablissement() AND EXISTS (
      SELECT 1 FROM examen_lien_etablissements ele
      WHERE ele.lien_id         = examen_liens.id
        AND ele.etablissement_id IN (SELECT my_etablissement_ids())
    ))
  );

CREATE POLICY "examen_liens_write_admin"
  ON examen_liens FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "examen_lien_etablissements_select"
  ON examen_lien_etablissements FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR (is_chef_centre() AND EXISTS (
      SELECT 1 FROM examen_liens el
      JOIN examen_centres ec ON ec.examen_id = el.examen_cible_id
      WHERE el.id = examen_lien_etablissements.lien_id
        AND ec.centre_id IN (SELECT my_centre_ids())
    ))
    OR (is_chef_etablissement()
        AND etablissement_id IN (SELECT my_etablissement_ids()))
  );

CREATE POLICY "examen_lien_etablissements_write_admin"
  ON examen_lien_etablissements FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ==========================
-- imports_log
-- ==========================

CREATE POLICY "imports_log_select"
  ON imports_log FOR SELECT
  USING (
    is_admin()
    OR (is_chef_etablissement() AND etablissement_id IN (SELECT my_etablissement_ids()))
    OR (is_chef_centre() AND EXISTS (
      SELECT 1 FROM examen_etablissements ee
      WHERE ee.examen_id       = imports_log.examen_id
        AND ee.etablissement_id = imports_log.etablissement_id
        AND ee.centre_id       IN (SELECT my_centre_ids())
    ))
  );

CREATE POLICY "imports_log_insert"
  ON imports_log FOR INSERT
  WITH CHECK (
    is_admin()
    OR (
      is_chef_etablissement()
      AND etablissement_id IN (SELECT my_etablissement_ids())
      AND imported_by = auth.uid()
      AND is_heritage = false
      -- Garde de statut : import uniquement en phase INSCRIPTIONS
      AND examen_est_modifiable(examen_id)
      AND EXISTS (SELECT 1 FROM examens e
                  WHERE e.id = examen_id AND e.status = 'INSCRIPTIONS')
    )
  );

CREATE POLICY "imports_log_delete_admin"
  ON imports_log FOR DELETE USING (is_admin());


-- ==========================
-- candidats
-- ==========================

CREATE POLICY "candidats_select"
  ON candidats FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR (is_chef_centre()        AND centre_id        IN (SELECT my_centre_ids()))
    OR (is_chef_etablissement() AND etablissement_id IN (SELECT my_etablissement_ids()))
  );

-- Insert : uniquement en phase INSCRIPTIONS + établissement affecté à l'examen
CREATE POLICY "candidats_insert"
  ON candidats FOR INSERT
  WITH CHECK (
    is_admin()
    OR (
      is_chef_etablissement()
      AND etablissement_id IN (SELECT my_etablissement_ids())
      AND EXISTS (SELECT 1 FROM examens e
                  WHERE e.id = examen_id AND e.status = 'INSCRIPTIONS')
      -- Vérifier que l'établissement est bien affecté à cet examen
      AND EXISTS (SELECT 1 FROM examen_etablissements ee
                  WHERE ee.examen_id        = examen_id
                    AND ee.etablissement_id = etablissement_id)
    )
  );

-- Update : phases INSCRIPTIONS, COMPOSITION, CORRECTION (pas PUBLIE/CLOS)
-- Scope métier : chef_etablissement = ses établissements ; chef_centre = son centre
CREATE POLICY "candidats_update"
  ON candidats FOR UPDATE
  USING (
    is_admin()
    OR (is_chef_etablissement()
        AND etablissement_id IN (SELECT my_etablissement_ids())
        AND examen_est_modifiable(examen_id))
    OR (is_chef_centre()
        AND centre_id IN (SELECT my_centre_ids())
        AND examen_est_modifiable(examen_id))
  )
  WITH CHECK (
    is_admin()
    OR (is_chef_etablissement()
        AND etablissement_id IN (SELECT my_etablissement_ids())
        AND examen_est_modifiable(examen_id))
    OR (is_chef_centre()
        AND centre_id IN (SELECT my_centre_ids())
        AND examen_est_modifiable(examen_id))
  );

CREATE POLICY "candidats_delete_admin"
  ON candidats FOR DELETE USING (is_admin());

CREATE POLICY "candidat_choix_disciplines_select"
  ON candidat_choix_disciplines FOR SELECT
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM candidats c
               WHERE c.id = candidat_choix_disciplines.candidat_id
                 AND (c.etablissement_id IN (SELECT my_etablissement_ids())
                      OR c.centre_id IN (SELECT my_centre_ids())))
  );

CREATE POLICY "candidat_choix_disciplines_write"
  ON candidat_choix_disciplines FOR ALL
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM candidats c
               WHERE c.id = candidat_choix_disciplines.candidat_id
                 AND c.etablissement_id IN (SELECT my_etablissement_ids())
                 AND examen_est_modifiable(c.examen_id))
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (SELECT 1 FROM candidats c
               WHERE c.id = candidat_choix_disciplines.candidat_id
                 AND c.etablissement_id IN (SELECT my_etablissement_ids())
                 AND examen_est_modifiable(c.examen_id))
  );


-- ==========================
-- salles
-- ==========================

CREATE POLICY "salles_select"
  ON salles FOR SELECT
  USING (
    is_admin()
    OR (is_chef_centre() AND centre_id IN (SELECT my_centre_ids()))
    OR EXISTS (SELECT 1 FROM examen_etablissements ee
               WHERE ee.examen_id = salles.examen_id
                 AND ee.centre_id = salles.centre_id
                 AND ee.etablissement_id IN (SELECT my_etablissement_ids()))
  );

-- Écriture salles : phases CONFIG, INSCRIPTIONS, COMPOSITION uniquement
CREATE POLICY "salles_write"
  ON salles FOR ALL
  USING (
    is_admin()
    OR (
      is_chef_centre()
      AND centre_id IN (SELECT my_centre_ids())
      AND EXISTS (SELECT 1 FROM examens e
                  WHERE e.id = examen_id
                    AND e.status IN ('CONFIG', 'INSCRIPTIONS', 'COMPOSITION'))
    )
  )
  WITH CHECK (
    is_admin()
    OR (
      is_chef_centre()
      AND centre_id IN (SELECT my_centre_ids())
      AND EXISTS (SELECT 1 FROM examens e
                  WHERE e.id = examen_id
                    AND e.status IN ('CONFIG', 'INSCRIPTIONS', 'COMPOSITION'))
    )
  );


-- ==========================
-- lots
-- ==========================

CREATE POLICY "lots_select"
  ON lots FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR (is_chef_centre() AND centre_id IN (SELECT my_centre_ids()))
  );

CREATE POLICY "lots_write_admin"
  ON lots FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "candidat_lots_select"
  ON candidat_lots FOR SELECT
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM lots l
               WHERE l.id = candidat_lots.lot_id
                 AND l.centre_id IN (SELECT my_centre_ids()))
  );
CREATE POLICY "candidat_lots_write_admin"
  ON candidat_lots FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ==========================
-- codes_acces
-- ==========================
-- Les correcteurs n'ont PAS de compte Supabase.
-- Leurs opérations passent exclusivement par des Edge Functions (service_role).

CREATE POLICY "codes_acces_select"
  ON codes_acces FOR SELECT
  USING (
    is_admin()
    OR (is_chef_centre() AND EXISTS (
      SELECT 1 FROM lots l
      WHERE l.id = codes_acces.lot_id
        AND l.centre_id IN (SELECT my_centre_ids())
    ))
  );

-- ⚠️  code_hash : JAMAIS accessible en SELECT par les rôles applicatifs.
-- Mécanisme : REVOKE SELECT TABLE + GRANT SELECT colonnes (exclut code_hash).
-- service_role (Edge Function) conserve l'accès complet pour la vérification du hash.
REVOKE SELECT ON codes_acces FROM authenticated;
GRANT SELECT (
  id, lot_id, etablissement_id,
  expires_at, is_active, nb_connexions, used_at, lockout_until, tentatives,
  created_at
) ON codes_acces TO authenticated;
-- La RLS policy SELECT ci-dessus filtre les lignes ; la restriction colonne filtre code_hash.
-- Double protection : RLS (lignes) + column privilege (colonnes).

CREATE POLICY "codes_acces_write_admin"
  ON codes_acces FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ==========================
-- saisies
-- ==========================

CREATE POLICY "saisies_select"
  ON saisies FOR SELECT
  USING (
    is_admin()
    OR (is_chef_centre() AND EXISTS (
      SELECT 1 FROM lots l
      WHERE l.id = saisies.lot_id
        AND l.centre_id IN (SELECT my_centre_ids())
    ))
  );

-- Écriture saisies : phases CORRECTION, DELIBERATION, CORRECTION_POST_DELIBERATION uniquement
CREATE POLICY "saisies_write"
  ON saisies FOR ALL
  USING (
    is_admin()
    OR (is_chef_centre() AND EXISTS (
      SELECT 1 FROM lots l
      JOIN examens e ON e.id = l.examen_id
      WHERE l.id = saisies.lot_id
        AND l.centre_id IN (SELECT my_centre_ids())
        AND e.status IN ('CORRECTION', 'DELIBERATION', 'CORRECTION_POST_DELIBERATION')
    ))
  )
  WITH CHECK (
    is_admin()
    OR (is_chef_centre() AND EXISTS (
      SELECT 1 FROM lots l
      JOIN examens e ON e.id = l.examen_id
      WHERE l.id = saisies.lot_id
        AND l.centre_id IN (SELECT my_centre_ids())
        AND e.status IN ('CORRECTION', 'DELIBERATION', 'CORRECTION_POST_DELIBERATION')
    ))
  );


-- ==========================
-- resultats
-- ==========================

-- ⚠️  PAS d'accès anonyme direct à la table resultats.
-- La page publique passe obligatoirement par la RPC recherche_resultat_public()
-- qui contrôle l'accès par numero_table (et sera soumise au rate limiting
-- de l'Edge Function, cf. PRD §3.5).
CREATE POLICY "resultats_select"
  ON resultats FOR SELECT
  USING (
    is_admin() OR is_tutelle()
    OR (is_chef_centre() AND EXISTS (
      SELECT 1 FROM candidats c
      WHERE c.id = resultats.candidat_id
        AND c.centre_id IN (SELECT my_centre_ids())
    ))
    OR (is_chef_etablissement() AND EXISTS (
      SELECT 1 FROM candidats c
      WHERE c.id = resultats.candidat_id
        AND c.etablissement_id IN (SELECT my_etablissement_ids())
    ))
  );

-- Écriture résultats : admin uniquement (Edge Function délibération)
CREATE POLICY "resultats_write_admin"
  ON resultats FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- ==========================
-- audit_log
-- ==========================

-- Lecture : admin uniquement (données sensibles — opérations internes)
CREATE POLICY "audit_log_select_admin"
  ON audit_log FOR SELECT
  USING (is_admin());

-- Écriture : triggers SECURITY DEFINER uniquement (via log_audit())
-- Pas d'écriture directe autorisée, même pour admin
-- Note : les triggers log_audit() utilisent SECURITY DEFINER + service_role path


-- ==========================
-- FONCTION PUBLIQUE : Consultation des résultats
-- ==========================
-- Accessible sans authentification (auth.uid() IS NULL autorisé)
-- Retourne uniquement les informations non-sensibles (status, moyenne, numero_anonyme)
-- Le numero_table est connu du candidat via sa convocation
-- ⚠️  Le rate limiting / lockout (PRD §3.5) est géré par l'Edge Function appelante
--     (scope: numero_table + ip_hash, pas IP seule)

-- ⚠️  Paramètre : numero_anonyme (UNIQUE par examen — cf. UNIQUE(examen_id, numero_anonyme))
-- On n'utilise PAS numero_table car son unicité est (examen_id, centre_id, numero_table) :
-- le même numéro de table peut exister dans plusieurs centres d'un même examen.
-- Le numero_anonyme figure sur la convocation du candidat et est son identifiant de résultat.
CREATE OR REPLACE FUNCTION recherche_resultat_public(
  p_examen_id      uuid,
  p_numero_anonyme text
)
RETURNS TABLE (
  status           resultat_status,
  moyenne_centimes int,
  phase            smallint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
  SELECT
    r.status,
    r.moyenne_centimes,
    r.phase
  FROM resultats r
  JOIN candidats c ON c.id = r.candidat_id
  JOIN examens   e ON e.id = r.examen_id
  WHERE r.examen_id       = p_examen_id
    AND c.numero_anonyme  = p_numero_anonyme
    AND e.status          IN ('PUBLIE', 'CLOS')
    -- En mode deux_phases : retourner la phase finale (2), sinon la phase 1
    AND r.phase = (
      CASE WHEN e.mode_deliberation = 'deux_phases' THEN 2 ELSE 1 END
    )
$$;

-- Accès strict via Edge Function uniquement (service_role).
-- Empêche le contournement du rate limiting en appelant PostgREST /rpc directement.
REVOKE EXECUTE ON FUNCTION recherche_resultat_public(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION recherche_resultat_public(uuid, text) TO service_role;


-- ==========================
-- DURCISSEMENT EXECUTE : helpers RLS
-- ==========================
-- Par défaut Supabase/PostgreSQL accorde EXECUTE à PUBLIC sur toutes les fonctions.
-- On révoque et on n'accorde qu'aux rôles qui en ont besoin.
--
-- Les helpers sont appelés depuis les politiques RLS qui s'évaluent dans le
-- contexte du rôle courant (authenticated ou anon) → GRANT obligatoire sur ces deux.

REVOKE EXECUTE ON FUNCTION is_admin()                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_chef_centre()              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_chef_etablissement()       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_tutelle()                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION my_centre_ids()               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION my_etablissement_ids()        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION examen_est_modifiable(uuid)   FROM PUBLIC;

GRANT EXECUTE ON FUNCTION is_admin()                    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_chef_centre()              TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_chef_etablissement()       TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_tutelle()                  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION my_centre_ids()               TO authenticated, anon;
GRANT EXECUTE ON FUNCTION my_etablissement_ids()        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION examen_est_modifiable(uuid)   TO authenticated, anon;

-- recherche_resultat_public(uuid, text) déjà géré ci-dessus (GRANT TO service_role uniquement)
-- Fonctions déclenchées par triggers (SECURITY DEFINER) : pas de GRANT utilisateur nécessaire.


-- =====================================================
-- FIN DES POLITIQUES RLS v2.0
-- Migration suivante : 20260306000002_functions.sql
-- =====================================================
