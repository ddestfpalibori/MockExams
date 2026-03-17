-- ============================================================
-- Sprint 6B — Interface Enseignant
--
-- 1. Rôle 'enseignant' dans l'enum user_role
-- 2. Table classes (entité indépendante par établissement)
-- 3. Colonne classe_id (nullable) sur candidats
-- 4. Table user_disciplines (affectation enseignant ↔ discipline + classe)
-- 5. Helpers RLS + politiques pour le rôle enseignant
-- ============================================================

-- ─── 1. Rôle enseignant ───────────────────────────────────────────────────────
-- (ALTER TYPE appliqué dans 20260317000000_add_enseignant_enum.sql — transaction séparée)

-- ─── 2. Table classes ────────────────────────────────────────────────────────

CREATE TABLE classes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid        NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  serie_id         uuid        REFERENCES series(id) ON DELETE SET NULL,
  libelle          text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (etablissement_id, libelle)
);

COMMENT ON TABLE classes IS
  'Classes physiques par établissement (ex : Tle D1, Tle D2, 3ème A, 3ème B).
   Entité indépendante d''un examen — réutilisée entre sessions.';

COMMENT ON COLUMN classes.serie_id IS
  'Série baccalauréat associée (NULL pour cycles sans série : 3ème, BEPC, CM2, etc.)';

COMMENT ON COLUMN classes.libelle IS
  'Libellé de la classe tel qu''il apparaît dans les fichiers Excel (ex : "Tle D1", "3ème A")';

-- ─── 3. classe_id sur candidats ──────────────────────────────────────────────

ALTER TABLE candidats
  ADD COLUMN classe_id uuid REFERENCES classes(id) ON DELETE SET NULL;

COMMENT ON COLUMN candidats.classe_id IS
  'Classe physique du candidat — optionnelle.
   Renseignée automatiquement lors de l''import Excel si une colonne "Classe" est présente.
   NULL = examen sans notion de classe.';

-- ─── 4. Table user_disciplines ───────────────────────────────────────────────

CREATE TABLE user_disciplines (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES profiles(id)           ON DELETE CASCADE,
  examen_discipline_id uuid        NOT NULL REFERENCES examen_disciplines(id) ON DELETE CASCADE,
  classe_id            uuid        REFERENCES classes(id) ON DELETE CASCADE,
  created_at           timestamptz NOT NULL DEFAULT now(),

  -- Un enseignant ne peut être affecté qu'une fois à la même (discipline, classe)
  -- NULLS NOT DISTINCT : deux NULL ne créent pas de doublon sur classe_id IS NULL
  UNIQUE NULLS NOT DISTINCT (user_id, examen_discipline_id, classe_id)
);

COMMENT ON TABLE user_disciplines IS
  'Affectation enseignant → discipline (+ classe optionnelle) par examen.
   classe_id NULL = enseignant voit tous les candidats de la discipline.
   classe_id renseigné = enseignant filtré sur sa classe uniquement.';

-- ─── 5. Helpers RLS ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_enseignant()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'enseignant'
  );
$$;

-- Retourne les examen_discipline_ids affectés à l'enseignant connecté
CREATE OR REPLACE FUNCTION my_examen_discipline_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT ARRAY(
    SELECT DISTINCT examen_discipline_id
    FROM user_disciplines
    WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_enseignant()            TO authenticated;
GRANT EXECUTE ON FUNCTION my_examen_discipline_ids() TO authenticated;

-- ─── 6. RLS — table classes ──────────────────────────────────────────────────

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- SELECT : tous les utilisateurs authentifiés (libellés non sensibles)
CREATE POLICY classes_select ON classes
  FOR SELECT TO authenticated
  USING (true);

-- INSERT / UPDATE / DELETE : admin (toutes classes) ou chef_etablissement (les siennes)
CREATE POLICY classes_write ON classes
  FOR ALL TO authenticated
  USING (
    is_admin()
    OR (
      is_chef_etablissement()
      AND EXISTS (
        SELECT 1 FROM user_etablissements ue
        WHERE ue.user_id = auth.uid()
          AND ue.etablissement_id = classes.etablissement_id
      )
    )
  )
  WITH CHECK (
    is_admin()
    OR (
      is_chef_etablissement()
      AND EXISTS (
        SELECT 1 FROM user_etablissements ue
        WHERE ue.user_id = auth.uid()
          AND ue.etablissement_id = classes.etablissement_id
      )
    )
  );

-- ─── 7. RLS — table user_disciplines ─────────────────────────────────────────

ALTER TABLE user_disciplines ENABLE ROW LEVEL SECURITY;

-- SELECT : admin voit tout, enseignant voit uniquement ses propres affectations
CREATE POLICY user_disciplines_select ON user_disciplines
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = auth.uid());

-- INSERT / UPDATE / DELETE : admin uniquement
CREATE POLICY user_disciplines_admin_write ON user_disciplines
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── 8. Politiques enseignant sur les tables existantes ──────────────────────
-- Note : on n'utilise PAS my_examen_discipline_ids() dans les policy expressions
-- car les fonctions retournant des tableaux (set-returning) sont interdites dans
-- les expressions RLS. On utilise des sous-requêtes EXISTS directes à la place.

-- examens : enseignant voit les examens de ses disciplines
CREATE POLICY enseignant_examens_select ON examens
  FOR SELECT TO authenticated
  USING (
    is_enseignant()
    AND EXISTS (
      SELECT 1
      FROM examen_disciplines ed
      JOIN user_disciplines ud ON ud.examen_discipline_id = ed.id
      WHERE ed.examen_id = examens.id
        AND ud.user_id = auth.uid()
    )
  );

-- examen_disciplines : enseignant voit uniquement ses disciplines affectées
CREATE POLICY enseignant_examen_disciplines_select ON examen_disciplines
  FOR SELECT TO authenticated
  USING (
    is_enseignant()
    AND EXISTS (
      SELECT 1 FROM user_disciplines ud
      WHERE ud.examen_discipline_id = examen_disciplines.id
        AND ud.user_id = auth.uid()
    )
  );

-- examen_discipline_series : enseignant voit les séries de ses disciplines
CREATE POLICY enseignant_examen_discipline_series_select ON examen_discipline_series
  FOR SELECT TO authenticated
  USING (
    is_enseignant()
    AND EXISTS (
      SELECT 1 FROM user_disciplines ud
      WHERE ud.examen_discipline_id = examen_discipline_series.examen_discipline_id
        AND ud.user_id = auth.uid()
    )
  );

-- lots : enseignant voit les lots de ses disciplines
-- (les lots sont anonymisés — pas de filtre par classe ici)
CREATE POLICY enseignant_lots_select ON lots
  FOR SELECT TO authenticated
  USING (
    is_enseignant()
    AND EXISTS (
      SELECT 1 FROM user_disciplines ud
      WHERE ud.examen_discipline_id = lots.examen_discipline_id
        AND ud.user_id = auth.uid()
    )
  );

-- saisies : enseignant voit les saisies de ses lots (données anonymisées)
CREATE POLICY enseignant_saisies_select ON saisies
  FOR SELECT TO authenticated
  USING (
    is_enseignant()
    AND EXISTS (
      SELECT 1
      FROM lots l
      JOIN user_disciplines ud ON ud.examen_discipline_id = l.examen_discipline_id
      WHERE l.id = saisies.lot_id
        AND ud.user_id = auth.uid()
    )
  );

-- candidat_lots : enseignant voit les liens candidat↔lot de ses disciplines
CREATE POLICY enseignant_candidat_lots_select ON candidat_lots
  FOR SELECT TO authenticated
  USING (
    is_enseignant()
    AND EXISTS (
      SELECT 1 FROM user_disciplines ud
      WHERE ud.examen_discipline_id = candidat_lots.examen_discipline_id
        AND ud.user_id = auth.uid()
    )
  );

-- candidats : enseignant voit ses candidats avec filtre classe optionnel
-- Logique : si user_disciplines.classe_id IS NULL → toute la discipline
--           si user_disciplines.classe_id est renseigné → uniquement cette classe
CREATE POLICY enseignant_candidats_select ON candidats
  FOR SELECT TO authenticated
  USING (
    is_enseignant()
    AND EXISTS (
      SELECT 1
      FROM user_disciplines ud
      JOIN candidat_lots cl
        ON cl.examen_discipline_id = ud.examen_discipline_id
        AND cl.candidat_id = candidats.id
      WHERE ud.user_id = auth.uid()
        AND (ud.classe_id IS NULL OR ud.classe_id = candidats.classe_id)
    )
  );

-- resultats : enseignant voit les résultats de ses candidats (post-délibération)
-- Via candidat_lots pour garantir que le candidat est bien dans la discipline de l'enseignant
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
      JOIN candidats c ON c.id = resultats.candidat_id
      WHERE ud.user_id = auth.uid()
        AND (ud.classe_id IS NULL OR c.classe_id = ud.classe_id)
    )
  );

-- ─── 9. Grants ───────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO authenticated;
GRANT SELECT, INSERT, DELETE ON user_disciplines TO authenticated;
