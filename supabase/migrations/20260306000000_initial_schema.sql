-- =====================================================
-- MockExams — Schéma Initial
-- Migration : 20260306000000_initial_schema.sql
-- Version   : 2.1 (corrections post-review expert v2)
-- Basé sur  : PRD v1.3 + Brief v2.6
-- PostgreSQL : 15+ requis (NULLS NOT DISTINCT sur index unique)
-- =====================================================
-- Contenu   : extensions, enums, tables, index,
--             fonctions de validation, triggers métier,
--             triggers updated_at
-- RLS       : 20260306000001_rls.sql
-- =====================================================


-- ==========================
-- EXTENSIONS
-- ==========================

-- pgcrypto : gen_random_uuid() + encode/digest (HMAC codes_acces)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==========================
-- ENUMS
-- ==========================

-- 4 rôles I1 (cf. PRD M01)
-- Correcteurs : PAS de compte — accès via codes_acces (Edge Function uniquement)
-- SUPER_ADMIN et GESTIONNAIRE_EXAMEN distincts → I2
CREATE TYPE user_role AS ENUM (
  'admin',               -- DDEST-FP — accès total à tous les examens
  'chef_centre',         -- Chef de centre — accès à son/ses centre(s)
  'chef_etablissement',  -- Directeur d'école — import candidats de son établissement
  'tutelle'              -- Inspection/Tutelle — lecture seule (statistiques, résultats)
);

-- Machine d'états : 9 états (cf. PRD §3.1)
-- Transitions valides (toutes irréversibles sauf DELIBERE ↔ CORRECTION_POST_DELIBERATION) :
--   CONFIG → INSCRIPTIONS → COMPOSITION → CORRECTION
--   → DELIBERATION → DELIBERE ⇄ CORRECTION_POST_DELIBERATION → PUBLIE → CLOS
CREATE TYPE exam_status AS ENUM (
  'CONFIG',
  'INSCRIPTIONS',
  'COMPOSITION',
  'CORRECTION',
  'DELIBERATION',
  'DELIBERE',
  'CORRECTION_POST_DELIBERATION',
  'PUBLIE',
  'CLOS'
);

CREATE TYPE discipline_type AS ENUM (
  'ecrit_obligatoire',
  'oral',        -- Modèle A (séparé) ou B (composante écrit), cf. oral_model
  'eps',
  'facultatif'   -- Option 1 (bonus pur) ou 2 (normal), cf. facultatif_option
);

CREATE TYPE oral_model AS ENUM ('A', 'B');
CREATE TYPE facultatif_option AS ENUM ('1', '2');
CREATE TYPE deliberation_mode AS ENUM ('unique', 'deux_phases');
CREATE TYPE resultat_status AS ENUM ('ADMIS', 'NON_ADMIS', 'RATTRAPAGE');

CREATE TYPE lot_status AS ENUM (
  'EN_ATTENTE',
  'EN_COURS',
  'TERMINE',
  'VERIFIE'
);

-- B : nominatif par établissement (défaut) | A : anonyme par lot
CREATE TYPE distribution_model AS ENUM ('A', 'B');

CREATE TYPE affectation_rule AS ENUM (
  'alphabetique',
  'numero_anonyme',
  'par_etablissement'
);


-- ==========================
-- PROFILS UTILISATEURS
-- ==========================

CREATE TABLE profiles (
  id          uuid       PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role  NOT NULL,
  nom         text       NOT NULL,
  prenom      text       NOT NULL,
  telephone   text,
  is_active   boolean    NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


-- ==========================
-- RÉFÉRENTIELS
-- ==========================

CREATE TABLE series (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL UNIQUE,
  libelle     text        NOT NULL,
  ordre       smallint    NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE disciplines (
  id           uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text            NOT NULL UNIQUE,
  libelle      text            NOT NULL,
  type_defaut  discipline_type NOT NULL DEFAULT 'ecrit_obligatoire',
  created_at   timestamptz     NOT NULL DEFAULT now()
);

CREATE TABLE centres (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL UNIQUE,
  nom         text        NOT NULL,
  ville       text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE etablissements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL UNIQUE,
  nom         text        NOT NULL,
  ville       text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


-- ==========================
-- AFFECTATIONS UTILISATEURS
-- ==========================

CREATE TABLE user_centres (
  user_id    uuid  NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  centre_id  uuid  NOT NULL REFERENCES centres(id)   ON DELETE CASCADE,
  PRIMARY KEY (user_id, centre_id)
);

CREATE TABLE user_etablissements (
  user_id           uuid  NOT NULL REFERENCES profiles(id)       ON DELETE CASCADE,
  etablissement_id  uuid  NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, etablissement_id)
);

-- Validation des rôles dans les tables d'affectation
CREATE OR REPLACE FUNCTION check_role_chef_centre()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id AND role = 'chef_centre') THEN
    RAISE EXCEPTION 'user_centres : profil % doit avoir le rôle chef_centre', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_role_chef_etablissement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.user_id AND role = 'chef_etablissement') THEN
    RAISE EXCEPTION 'user_etablissements : profil % doit avoir le rôle chef_etablissement', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_role_chef_centre
  BEFORE INSERT OR UPDATE ON user_centres
  FOR EACH ROW EXECUTE FUNCTION check_role_chef_centre();

CREATE TRIGGER trg_check_role_chef_etablissement
  BEFORE INSERT OR UPDATE ON user_etablissements
  FOR EACH ROW EXECUTE FUNCTION check_role_chef_etablissement();


-- ==========================
-- EXAMENS
-- ==========================

CREATE TABLE examens (
  id       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code     text        NOT NULL UNIQUE,
  libelle  text        NOT NULL,
  annee    smallint    NOT NULL,
  status   exam_status NOT NULL DEFAULT 'CONFIG',

  -- Paramètres moteur délibération (cf. Brief §4.1.6)
  mode_deliberation  deliberation_mode  NOT NULL DEFAULT 'unique',
  seuil_phase1       smallint  NOT NULL DEFAULT 900   CHECK (seuil_phase1  BETWEEN 0 AND 2000),
  seuil_phase2       smallint  NOT NULL DEFAULT 1000  CHECK (seuil_phase2  BETWEEN 0 AND 2000),
  oral_actif         boolean   NOT NULL DEFAULT false,
  eps_active         boolean   NOT NULL DEFAULT false,
  facultatif_actif   boolean   NOT NULL DEFAULT false,
  rattrapage_actif   boolean   NOT NULL DEFAULT false,

  -- Paramètres anonymat (cf. Brief §4.9.1)
  anonymat_prefixe   text     NOT NULL DEFAULT 'C',
  anonymat_debut     int      NOT NULL DEFAULT 1,
  anonymat_bon       smallint NOT NULL DEFAULT 5 CHECK (anonymat_bon IN (1, 3, 5)),
  taille_salle_ref   smallint NOT NULL DEFAULT 30 CHECK (taille_salle_ref > 0),

  -- Distribution codes d'accès (cf. Brief §4.9.5)
  distribution_model  distribution_model  NOT NULL DEFAULT 'B',

  -- Fenêtre anti-replay HMAC (cf. PRD §3.4) — durée en jours
  hmac_window_days  smallint  NOT NULL DEFAULT 90 CHECK (hmac_window_days > 0),

  -- Dates clés
  date_composition_debut  date,
  date_composition_fin    date,
  date_deliberation       date,
  date_publication        date,

  created_by  uuid         REFERENCES profiles(id),
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- ── Machine d'états : transitions autorisées (cf. PRD §3.1) ──────────────────
-- Toutes les transitions non listées sont interdites
CREATE OR REPLACE FUNCTION check_exam_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  IF NOT (
    (OLD.status = 'CONFIG'                         AND NEW.status = 'INSCRIPTIONS')              OR
    (OLD.status = 'INSCRIPTIONS'                   AND NEW.status = 'COMPOSITION')               OR
    (OLD.status = 'COMPOSITION'                    AND NEW.status = 'CORRECTION')                OR
    (OLD.status = 'CORRECTION'                     AND NEW.status = 'DELIBERATION')              OR
    (OLD.status = 'DELIBERATION'                   AND NEW.status = 'DELIBERE')                  OR
    (OLD.status = 'DELIBERE'                       AND NEW.status = 'CORRECTION_POST_DELIBERATION') OR
    (OLD.status = 'DELIBERE'                       AND NEW.status = 'PUBLIE')                    OR
    (OLD.status = 'CORRECTION_POST_DELIBERATION'   AND NEW.status = 'DELIBERE')                  OR
    (OLD.status = 'PUBLIE'                         AND NEW.status = 'CLOS')
  ) THEN
    RAISE EXCEPTION 'Transition d''état interdite : % → % (examen %)',
      OLD.status, NEW.status, OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_exam_status_transition
  BEFORE UPDATE OF status ON examens
  FOR EACH ROW EXECUTE FUNCTION check_exam_status_transition();


-- ==========================
-- CONFIGURATION DE L'EXAMEN
-- ==========================

-- Séries autorisées pour un examen (liste explicite)
-- Nécessaire pour valider candidats.serie_id et lot.serie_id
CREATE TABLE examen_series (
  examen_id  uuid  NOT NULL REFERENCES examens(id)  ON DELETE CASCADE,
  serie_id   uuid  NOT NULL REFERENCES series(id),
  PRIMARY KEY (examen_id, serie_id)
);

-- Disciplines configurées pour un examen
CREATE TABLE examen_disciplines (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id       uuid            NOT NULL REFERENCES examens(id) ON DELETE CASCADE,
  discipline_id   uuid            NOT NULL REFERENCES disciplines(id),
  type            discipline_type NOT NULL,
  coefficient     smallint        NOT NULL CHECK (coefficient > 0),
  bareme          smallint        NOT NULL DEFAULT 20 CHECK (bareme > 0),

  -- Matières au choix : même groupe_choix_id = alternatives mutuellement exclusives
  groupe_choix_id  uuid,  -- null = discipline obligatoire

  -- Options par type
  oral_model        oral_model,
  facultatif_option facultatif_option,
  seuil_facultatif  smallint CHECK (seuil_facultatif BETWEEN 0 AND 2000),

  -- ── Contraintes de cohérence type ↔ options ──────────────────────────────
  CONSTRAINT chk_oral_model_absent_hors_oral
    CHECK (type = 'oral' OR oral_model IS NULL),
  CONSTRAINT chk_oral_model_present_si_oral
    CHECK (type != 'oral' OR oral_model IS NOT NULL),
  CONSTRAINT chk_facultatif_option_absent_hors_facultatif
    CHECK (type = 'facultatif' OR facultatif_option IS NULL),
  CONSTRAINT chk_facultatif_option_present_si_facultatif
    CHECK (type != 'facultatif' OR facultatif_option IS NOT NULL),
  -- seuil requis pour Option 1 (bonus pur), interdit sinon
  CONSTRAINT chk_seuil_facultatif_option1_requis
    CHECK (facultatif_option != '1' OR seuil_facultatif IS NOT NULL),
  CONSTRAINT chk_seuil_facultatif_absent_hors_option1
    CHECK (facultatif_option = '1' OR seuil_facultatif IS NULL),

  ordre_affichage  smallint  NOT NULL DEFAULT 0,

  UNIQUE (examen_id, discipline_id)
);

-- Séries applicables à une discipline dans un examen
-- Absence de ligne = discipline applicable à TOUTES les séries de l'examen
CREATE TABLE examen_discipline_series (
  examen_discipline_id  uuid  NOT NULL REFERENCES examen_disciplines(id) ON DELETE CASCADE,
  serie_id              uuid  NOT NULL REFERENCES series(id),
  PRIMARY KEY (examen_discipline_id, serie_id)
);

-- Centres participant à un examen
CREATE TABLE examen_centres (
  examen_id  uuid  NOT NULL REFERENCES examens(id)  ON DELETE CASCADE,
  centre_id  uuid  NOT NULL REFERENCES centres(id),
  PRIMARY KEY (examen_id, centre_id)
);

-- Établissements participant à un examen + leur centre d'affectation
-- FK composite garantit que le centre est dans l'examen (cf. PRD finding #7 v1)
CREATE TABLE examen_etablissements (
  examen_id         uuid  NOT NULL REFERENCES examens(id)         ON DELETE CASCADE,
  etablissement_id  uuid  NOT NULL REFERENCES etablissements(id),
  centre_id         uuid  NOT NULL REFERENCES centres(id),
  CONSTRAINT fk_etab_centre_dans_examen
    FOREIGN KEY (examen_id, centre_id) REFERENCES examen_centres (examen_id, centre_id),
  PRIMARY KEY (examen_id, etablissement_id)
);


-- ==========================
-- LIEN INTER-EXAMENS (US-08 / M16)
-- ==========================
-- Permet à un sous-ensemble d'établissements d'un examen source de
-- déclencher un nouvel examen (examen cible) uniquement pour leurs élèves.
-- Exemple : 5 établissements sur 60 organisent un rattrapage spécifique.

CREATE TABLE examen_liens (
  id                uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_cible_id   uuid  NOT NULL REFERENCES examens(id) ON DELETE CASCADE,
  examen_source_id  uuid  NOT NULL REFERENCES examens(id),

  -- 'tous'               : hériter tous les candidats des établissements ciblés
  -- 'non_admis_uniquement': hériter uniquement NON_ADMIS + RATTRAPAGE (traité comme NON_ADMIS)
  mode_heritage  text  NOT NULL DEFAULT 'tous'
    CHECK (mode_heritage IN ('tous', 'non_admis_uniquement')),

  created_at  timestamptz  NOT NULL DEFAULT now(),

  -- Un examen cible n'a qu'une seule source (simplification I1)
  UNIQUE (examen_cible_id),
  -- Éviter l'auto-référence
  CONSTRAINT chk_lien_pas_autoref CHECK (examen_cible_id != examen_source_id)
);

-- Sous-ensemble d'établissements concernés par le lien.
-- Absence de lignes = hériter TOUS les établissements de l'examen source.
CREATE TABLE examen_lien_etablissements (
  lien_id           uuid  NOT NULL REFERENCES examen_liens(id) ON DELETE CASCADE,
  etablissement_id  uuid  NOT NULL REFERENCES etablissements(id),
  PRIMARY KEY (lien_id, etablissement_id)
);

-- Validation : l'établissement ciblé doit appartenir à l'examen source du lien
CREATE OR REPLACE FUNCTION check_lien_etablissement_source_coherence()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public, pg_catalog AS $$
DECLARE
  v_examen_source_id uuid;
BEGIN
  SELECT examen_source_id INTO v_examen_source_id
  FROM examen_liens
  WHERE id = NEW.lien_id;

  IF NOT EXISTS (
    SELECT 1
    FROM examen_etablissements ee
    WHERE ee.examen_id = v_examen_source_id
      AND ee.etablissement_id = NEW.etablissement_id
  ) THEN
    RAISE EXCEPTION
      'examen_lien_etablissements : établissement % absent de l''examen source % (lien %)',
      NEW.etablissement_id, v_examen_source_id, NEW.lien_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_lien_etablissement_source
  BEFORE INSERT OR UPDATE OF lien_id, etablissement_id ON examen_lien_etablissements
  FOR EACH ROW EXECUTE FUNCTION check_lien_etablissement_source_coherence();

-- Trigger : l'examen source doit être PUBLIE ou CLOS au moment de la création du lien
CREATE OR REPLACE FUNCTION check_lien_source_termine()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public, pg_catalog AS $$
DECLARE
  v_status exam_status;
BEGIN
  SELECT status INTO v_status FROM examens WHERE id = NEW.examen_source_id;
  IF v_status NOT IN ('PUBLIE', 'CLOS') THEN
    RAISE EXCEPTION
      'examen_liens : l''examen source % doit être PUBLIE ou CLOS (statut actuel : %)',
      NEW.examen_source_id, v_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_lien_source_termine
  BEFORE INSERT OR UPDATE OF examen_source_id ON examen_liens
  FOR EACH ROW EXECUTE FUNCTION check_lien_source_termine();


-- ==========================
-- CANDIDATS
-- ==========================

CREATE TABLE imports_log (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id                 uuid        NOT NULL REFERENCES examens(id),
  etablissement_id          uuid        NOT NULL REFERENCES etablissements(id),
  imported_by               uuid        NOT NULL REFERENCES profiles(id),
  fichier_nom               text,
  nb_candidats_fichier      int         NOT NULL DEFAULT 0,

  -- Déclaration légale (cochée avant validation par le chef d'établissement)
  import_legal_confirmed     boolean      NOT NULL DEFAULT false,
  import_legal_confirmed_at  timestamptz,
  import_legal_confirmed_by  uuid         REFERENCES profiles(id),

  nb_succes      int   NOT NULL DEFAULT 0,
  nb_erreurs     int   NOT NULL DEFAULT 0,
  erreurs_detail jsonb,

  -- Vrai si cet import est issu d'un héritage inter-examens (US-08)
  is_heritage  boolean  NOT NULL DEFAULT false,

  created_at  timestamptz  NOT NULL DEFAULT now(),

  -- FK composite : garantit que l'établissement est bien affecté à l'examen
  CONSTRAINT fk_imports_log_examen_etab
    FOREIGN KEY (examen_id, etablissement_id)
    REFERENCES examen_etablissements (examen_id, etablissement_id)
);

-- Candidats (~8 000 par examen)
--
-- ⚠️  DONNÉES PII CHIFFRÉES (AES-256-GCM, cf. Brief §4.x)
-- Colonnes *_enc : valeur = base64(iv || ciphertext || tag)
-- Chiffrement/déchiffrement : Edge Function uniquement (clé SUPABASE_CANDIDATES_KEY)
-- Recherche : via numero_anonyme, numero_table ou candidat_fingerprint
-- Déduplication : candidat_fingerprint = HMAC-SHA256(nom_lower|prenom_lower|ddn, SECRET)
CREATE TABLE candidats (
  id                uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id         uuid      NOT NULL REFERENCES examens(id),
  etablissement_id  uuid      NOT NULL REFERENCES etablissements(id),
  import_id         uuid      REFERENCES imports_log(id),

  -- Identité chiffrée
  nom_enc             text  NOT NULL,
  prenom_enc          text  NOT NULL,
  date_naissance_enc  text,
  lieu_naissance_enc  text,
  sexe                char(1)  CHECK (sexe IN ('M', 'F')),

  -- Fingerprint non-réversible pour déduplication
  candidat_fingerprint  text,

  -- Série (validée contre examen_series par trigger)
  serie_id  uuid  NOT NULL REFERENCES series(id),

  -- Affectation salle (remplis à COMPOSITION)
  centre_id     uuid      REFERENCES centres(id),
  salle_id      uuid,     -- FK ajoutée après CREATE TABLE salles
  numero_table  smallint, -- Global au centre, pas par salle

  -- Anonymat (généré à COMPOSITION, cf. Brief §4.9.1)
  numero_anonyme  text,

  UNIQUE (examen_id, numero_anonyme),
  UNIQUE (examen_id, centre_id, numero_table),

  -- Héritage inter-examens (US-08) : référence au candidat source
  -- NULL si candidat inscrit normalement (pas hérité)
  source_candidat_id  uuid  REFERENCES candidats(id),

  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- Validation : serie_id doit être configurée pour l'examen
CREATE OR REPLACE FUNCTION check_candidat_serie_valide()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM examen_series
    WHERE examen_id = NEW.examen_id
      AND serie_id  = NEW.serie_id
  ) THEN
    RAISE EXCEPTION
      'candidats : la série % n''est pas configurée pour l''examen %',
      NEW.serie_id, NEW.examen_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_candidat_serie
  BEFORE INSERT OR UPDATE OF serie_id, examen_id ON candidats
  FOR EACH ROW EXECUTE FUNCTION check_candidat_serie_valide();

-- Choix de discipline pour les matières au choix
CREATE TABLE candidat_choix_disciplines (
  candidat_id           uuid  NOT NULL REFERENCES candidats(id)          ON DELETE CASCADE,
  groupe_choix_id       uuid  NOT NULL,
  examen_discipline_id  uuid  NOT NULL REFERENCES examen_disciplines(id),
  PRIMARY KEY (candidat_id, groupe_choix_id)
);

-- Validation : la discipline doit appartenir au bon examen et au bon groupe
CREATE OR REPLACE FUNCTION check_choix_discipline_coherence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_examen_id uuid;
BEGIN
  SELECT examen_id INTO v_examen_id FROM candidats WHERE id = NEW.candidat_id;

  IF NOT EXISTS (
    SELECT 1 FROM examen_disciplines
    WHERE id               = NEW.examen_discipline_id
      AND examen_id        = v_examen_id
      AND groupe_choix_id  = NEW.groupe_choix_id
  ) THEN
    RAISE EXCEPTION
      'candidat_choix_disciplines : discipline % invalide pour le groupe % (examen %)',
      NEW.examen_discipline_id, NEW.groupe_choix_id, v_examen_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_choix_discipline
  BEFORE INSERT OR UPDATE ON candidat_choix_disciplines
  FOR EACH ROW EXECUTE FUNCTION check_choix_discipline_coherence();


-- ==========================
-- COMPOSITION (Salles)
-- ==========================

CREATE TABLE salles (
  id                uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id         uuid             NOT NULL REFERENCES examens(id) ON DELETE CASCADE,
  centre_id         uuid             NOT NULL REFERENCES centres(id),
  nom               text             NOT NULL,
  capacite          smallint         NOT NULL CHECK (capacite > 0),
  regle_affectation affectation_rule NOT NULL DEFAULT 'alphabetique',
  ordre             smallint         NOT NULL DEFAULT 0,
  -- Salle ordre=k → tables (sum_cap_precedentes + 1)..(sum_cap_precedentes + capacite)
  UNIQUE (examen_id, centre_id, nom)
);

ALTER TABLE candidats
  ADD CONSTRAINT fk_candidats_salle
  FOREIGN KEY (salle_id) REFERENCES salles(id);

-- FK composite : garantit que l'établissement d'un candidat est bien affecté à l'examen.
-- Ajouté via ALTER TABLE car examen_etablissements est créé avant candidats dans la migration.
ALTER TABLE candidats
  ADD CONSTRAINT fk_candidats_examen_etab
  FOREIGN KEY (examen_id, etablissement_id)
  REFERENCES examen_etablissements (examen_id, etablissement_id);


-- ==========================
-- ANONYMAT & LOTS
-- ==========================

-- Lots de correction (cf. Brief §4.9.2 — Algorithme bons)
-- Clé canonique : (centre_id, examen_discipline_id, serie_id, lot_numero)
CREATE TABLE lots (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id             uuid        NOT NULL REFERENCES examens(id),
  centre_id             uuid        NOT NULL REFERENCES centres(id),
  examen_discipline_id  uuid        NOT NULL REFERENCES examen_disciplines(id),
  -- ⚠️  examen_id doit correspondre à examen_disciplines.examen_id → trigger ci-dessous

  serie_id     uuid       REFERENCES series(id),
  -- null = lot valable toutes séries pour cette discipline

  lot_numero   smallint    NOT NULL CHECK (lot_numero > 0),
  nb_copies    smallint    NOT NULL CHECK (nb_copies > 0),
  status       lot_status  NOT NULL DEFAULT 'EN_ATTENTE',

  -- HMAC anti-replay (cf. PRD §3.4)
  -- Signé par Edge Function : centre_id|examen_id|lot_numero|nb_eleves|generation_timestamp
  -- ⚠️  Requis avant tout import de notes (cf. trigger trg_hmac_avant_correction)
  hmac_signature        text,
  generation_timestamp  timestamptz,

  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- Unicité canonique avec serie_id nullable (PostgreSQL 15+ : NULLS NOT DISTINCT)
CREATE UNIQUE INDEX idx_lots_canonical_key
  ON lots (centre_id, examen_discipline_id, lot_numero, serie_id)
  NULLS NOT DISTINCT;

-- Validation : examen_id doit correspondre à examen_discipline_id.examen_id
CREATE OR REPLACE FUNCTION check_lot_examen_coherence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM examen_disciplines
    WHERE id        = NEW.examen_discipline_id
      AND examen_id = NEW.examen_id
  ) THEN
    RAISE EXCEPTION
      'lots : examen_discipline % n''appartient pas à l''examen %',
      NEW.examen_discipline_id, NEW.examen_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_lot_examen
  BEFORE INSERT OR UPDATE OF examen_id, examen_discipline_id ON lots
  FOR EACH ROW EXECUTE FUNCTION check_lot_examen_coherence();

-- Validation : HMAC requis avant toute transition hors EN_ATTENTE
CREATE OR REPLACE FUNCTION check_hmac_avant_correction()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'EN_ATTENTE' AND NEW.status != 'EN_ATTENTE' THEN
    IF NEW.hmac_signature IS NULL OR NEW.generation_timestamp IS NULL THEN
      RAISE EXCEPTION
        'lots : hmac_signature et generation_timestamp requis avant de passer de EN_ATTENTE à % (lot %)',
        NEW.status, NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hmac_avant_correction
  BEFORE UPDATE OF status ON lots
  FOR EACH ROW EXECUTE FUNCTION check_hmac_avant_correction();

-- Guard anti-replay : generation_timestamp doit être dans la fenêtre hmac_window_days
-- Sans ce guard, un lot dont le HMAC a expiré pourrait quand même passer en correction
-- si l'Edge Function ne vérifie pas (défense en profondeur côté DB).
CREATE OR REPLACE FUNCTION check_lot_hmac_window()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_window smallint;
BEGIN
  -- Appliquer uniquement lors d'une transition vers un état actif (hors EN_ATTENTE)
  IF OLD.status != 'EN_ATTENTE' OR NEW.status = 'EN_ATTENTE' THEN
    RETURN NEW;
  END IF;
  -- Si pas encore de timestamp (géré par check_hmac_avant_correction), ignorer
  IF NEW.generation_timestamp IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT hmac_window_days INTO v_window
  FROM examens WHERE id = NEW.examen_id;

  -- Rejeter timestamp trop ancien (HMAC expiré)
  IF NEW.generation_timestamp < now() - (v_window || ' days')::interval THEN
    RAISE EXCEPTION
      'lots : HMAC expiré — generation_timestamp (%) antérieur à la fenêtre de % jours (lot %)',
      NEW.generation_timestamp, v_window, NEW.id;
  END IF;

  -- Rejeter timestamp futur (horloge avancée ou falsification)
  -- Tolérance de 5 minutes pour dérive d'horloge entre serveurs
  IF NEW.generation_timestamp > now() + interval '5 minutes' THEN
    RAISE EXCEPTION
      'lots : generation_timestamp (%) dans le futur — falsification possible (lot %)',
      NEW.generation_timestamp, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_lot_hmac_window
  BEFORE UPDATE OF status ON lots
  FOR EACH ROW EXECUTE FUNCTION check_lot_hmac_window();

-- Affectation candidat → lot (résultat algorithme bons, cf. Brief §4.9.3)
-- Invariant métier : 1 candidat = 1 lot par discipline (garanti par UNIQUE ci-dessous)
-- Sur réexécution de creer_lots_centre, ON CONFLICT met à jour le lot (pas de doublons).
CREATE TABLE candidat_lots (
  candidat_id           uuid      NOT NULL REFERENCES candidats(id)            ON DELETE CASCADE,
  lot_id                uuid      NOT NULL REFERENCES lots(id)                  ON DELETE CASCADE,
  -- Dénormalisé depuis lots.examen_discipline_id pour permettre la contrainte d'unicité.
  -- Synchronisation garantie par trigger trg_check_candidat_lot_discipline_coherence ci-dessous.
  examen_discipline_id  uuid      NOT NULL REFERENCES examen_disciplines(id),
  position_dans_lot     smallint  NOT NULL CHECK (position_dans_lot > 0),
  PRIMARY KEY (candidat_id, lot_id),
  UNIQUE (lot_id, position_dans_lot),
  -- Garantie : 1 candidat ne peut être dans qu'un seul lot pour une discipline donnée
  UNIQUE (candidat_id, examen_discipline_id)
);

-- Trigger : candidat_lots.examen_discipline_id doit correspondre à lots.examen_discipline_id
-- Sans ce trigger, un INSERT/UPDATE admin hors fonction pourrait créer une incohérence silencieuse.
CREATE OR REPLACE FUNCTION check_candidat_lot_discipline_coherence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lots l
    WHERE l.id                   = NEW.lot_id
      AND l.examen_discipline_id = NEW.examen_discipline_id
  ) THEN
    RAISE EXCEPTION
      'candidat_lots : examen_discipline_id % ne correspond pas à lots.examen_discipline_id du lot % (incohérence)',
      NEW.examen_discipline_id, NEW.lot_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_candidat_lot_discipline_coherence
  BEFORE INSERT OR UPDATE OF lot_id, examen_discipline_id ON candidat_lots
  FOR EACH ROW EXECUTE FUNCTION check_candidat_lot_discipline_coherence();


-- ==========================
-- CORRECTION
-- ==========================

-- Codes d'accès pour les correcteurs (sans compte Supabase)
--
-- ⚠️  SÉCURITÉ DU HASH
-- code_hash = encode(hmac(code_brut, PEPPER_SECRET, 'sha256'), 'hex')
-- Jamais SHA-256 direct (vulnérable à brute-force offline si fuite DB).
-- Le PEPPER_SECRET est une variable d'environnement Edge Function.
-- La vérification se fait via Edge Function uniquement (pas de lookup SQL direct).
CREATE TABLE codes_acces (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id            uuid        NOT NULL REFERENCES lots(id),
  etablissement_id  uuid        REFERENCES etablissements(id),
  -- null = Modèle A (anonyme) | non-null = Modèle B (nominatif)
  -- Cohérence avec examens.distribution_model vérifiée par trigger ci-dessous

  code_hash   text         NOT NULL UNIQUE,  -- HMAC-SHA256(code_brut, PEPPER) en hex
  expires_at  timestamptz  NOT NULL,
  is_active   boolean      NOT NULL DEFAULT true,
  nb_connexions  int       NOT NULL DEFAULT 0,
  used_at     timestamptz,
  lockout_until  timestamptz,
  tentatives  int          NOT NULL DEFAULT 0,

  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- Validation : etablissement_id cohérent avec le modèle de distribution de l'examen
CREATE OR REPLACE FUNCTION check_code_acces_distribution_model()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_model distribution_model;
BEGIN
  SELECT e.distribution_model INTO v_model
  FROM lots l
  JOIN examens e ON e.id = l.examen_id
  WHERE l.id = NEW.lot_id;

  IF v_model = 'A' AND NEW.etablissement_id IS NOT NULL THEN
    RAISE EXCEPTION
      'codes_acces : modèle A (anonyme) — etablissement_id doit être NULL (lot %, étab %)',
      NEW.lot_id, NEW.etablissement_id;
  END IF;

  IF v_model = 'B' AND NEW.etablissement_id IS NULL THEN
    RAISE EXCEPTION
      'codes_acces : modèle B (nominatif) — etablissement_id est requis (lot %)',
      NEW.lot_id;
  END IF;

  -- Modèle B : l'établissement doit être affecté au centre du lot pour cet examen
  IF v_model = 'B' AND NEW.etablissement_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM lots l
      JOIN examen_etablissements ee ON ee.examen_id = l.examen_id
                                   AND ee.centre_id = l.centre_id
      WHERE l.id                 = NEW.lot_id
        AND ee.etablissement_id  = NEW.etablissement_id
    ) THEN
      RAISE EXCEPTION
        'codes_acces : établissement % n''est pas affecté au centre du lot % dans cet examen',
        NEW.etablissement_id, NEW.lot_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_code_acces_distribution
  BEFORE INSERT OR UPDATE ON codes_acces
  FOR EACH ROW EXECUTE FUNCTION check_code_acces_distribution_model();

-- Saisies de notes
-- Une ligne par (candidat × discipline) au sein d'un lot
-- Le correcteur ne voit que le numero_anonyme — jamais l'identité
CREATE TABLE saisies (
  id              uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id          uuid  NOT NULL REFERENCES lots(id),
  numero_anonyme  text  NOT NULL,

  -- candidat_id résolu par l'Edge Function lors de la saisie
  -- (lookup candidat_lots JOIN candidats WHERE numero_anonyme = ?)
  -- Garantit l'intégrité sans exposer l'identité au correcteur (cf. RLS)
  candidat_id     uuid  NOT NULL REFERENCES candidats(id),

  code_acces_id   uuid  REFERENCES codes_acces(id),

  -- note_centimes : 0-2000 (0 = note zéro valide)
  -- code_special  : ABS (absent) ou ABD (abandon) → NON ADMIS automatique
  -- Les deux NULL = note pas encore saisie
  note_centimes  smallint  CHECK (note_centimes BETWEEN 0 AND 2000),
  code_special   text      CHECK (code_special IN ('ABS', 'ABD')),
  CONSTRAINT chk_note_xor
    CHECK (num_nonnulls(note_centimes, code_special) <= 1),

  saisi_at     timestamptz  NOT NULL DEFAULT now(),
  verifie_par  uuid         REFERENCES profiles(id),
  verifie_at   timestamptz,

  UNIQUE (lot_id, numero_anonyme),
  UNIQUE (lot_id, candidat_id)
);

-- Validation : numero_anonyme ∈ lot ET cohérent avec candidat_id
CREATE OR REPLACE FUNCTION check_saisie_coherence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM candidat_lots cl
    JOIN candidats c ON c.id = cl.candidat_id
    WHERE cl.lot_id        = NEW.lot_id
      AND c.numero_anonyme = NEW.numero_anonyme
      AND c.id             = NEW.candidat_id
  ) THEN
    RAISE EXCEPTION
      'saisies : numéro anonyme % ou candidat_id % incohérent avec le lot %',
      NEW.numero_anonyme, NEW.candidat_id, NEW.lot_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_saisie_coherence
  BEFORE INSERT OR UPDATE ON saisies
  FOR EACH ROW EXECUTE FUNCTION check_saisie_coherence();

-- Validation : code_acces_id doit appartenir au même lot que la saisie
CREATE OR REPLACE FUNCTION check_saisie_code_acces_lot()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code_acces_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM codes_acces ca
      WHERE ca.id     = NEW.code_acces_id
        AND ca.lot_id = NEW.lot_id
    ) THEN
      RAISE EXCEPTION
        'saisies : code_acces_id % n''appartient pas au lot % (cohérence code/lot)',
        NEW.code_acces_id, NEW.lot_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_saisie_code_acces_lot
  BEFORE INSERT OR UPDATE OF code_acces_id, lot_id ON saisies
  FOR EACH ROW EXECUTE FUNCTION check_saisie_code_acces_lot();


-- ==========================
-- DÉLIBÉRATION
-- ==========================

CREATE TABLE resultats (
  id           uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id    uuid             NOT NULL REFERENCES examens(id),
  candidat_id  uuid             NOT NULL REFERENCES candidats(id),
  phase        smallint         NOT NULL DEFAULT 1 CHECK (phase IN (1, 2)),

  -- Moyenne pondérée en centièmes (cf. PRD §3.3)
  -- ROUND(SUM(note_i × coeff_i × 100) / SUM(coeff_i))
  moyenne_centimes  int,

  status             resultat_status  NOT NULL,
  admissible_phase1  boolean,

  delibere_at    timestamptz,
  delibere_par   uuid  REFERENCES profiles(id),
  revision_motif text,

  UNIQUE (examen_id, candidat_id, phase)
);

-- Validation : resultats.examen_id doit correspondre à candidats.examen_id
CREATE OR REPLACE FUNCTION check_resultat_examen_coherence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM candidats c
    WHERE c.id        = NEW.candidat_id
      AND c.examen_id = NEW.examen_id
  ) THEN
    RAISE EXCEPTION
      'resultats : candidat_id % n''appartient pas à l''examen %',
      NEW.candidat_id, NEW.examen_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_resultat_examen
  BEFORE INSERT OR UPDATE OF examen_id, candidat_id ON resultats
  FOR EACH ROW EXECUTE FUNCTION check_resultat_examen_coherence();

-- Validation : candidats.salle_id doit appartenir au même examen ET centre
CREATE OR REPLACE FUNCTION check_candidat_salle_coherence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.salle_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM salles s
      WHERE s.id        = NEW.salle_id
        AND s.examen_id = NEW.examen_id
        AND s.centre_id = NEW.centre_id
    ) THEN
      RAISE EXCEPTION
        'candidats : salle % n''appartient pas à l''examen % / centre %',
        NEW.salle_id, NEW.examen_id, NEW.centre_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_candidat_salle
  BEFORE INSERT OR UPDATE OF salle_id, examen_id, centre_id ON candidats
  FOR EACH ROW EXECUTE FUNCTION check_candidat_salle_coherence();

-- Restriction métier : un chef de centre ne peut modifier que l'affectation composition
-- (centre_id, salle_id, numero_table). Les autres colonnes candidat restent non modifiables.
CREATE OR REPLACE FUNCTION check_candidat_update_scope_by_role()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public, pg_catalog AS $$
DECLARE
  v_role user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid() AND is_active = true;

  IF v_role = 'chef_centre' THEN
    IF NEW.examen_id            IS DISTINCT FROM OLD.examen_id
       OR NEW.etablissement_id  IS DISTINCT FROM OLD.etablissement_id
       OR NEW.import_id         IS DISTINCT FROM OLD.import_id
       OR NEW.nom_enc           IS DISTINCT FROM OLD.nom_enc
       OR NEW.prenom_enc        IS DISTINCT FROM OLD.prenom_enc
       OR NEW.date_naissance_enc IS DISTINCT FROM OLD.date_naissance_enc
       OR NEW.lieu_naissance_enc IS DISTINCT FROM OLD.lieu_naissance_enc
       OR NEW.sexe              IS DISTINCT FROM OLD.sexe
       OR NEW.candidat_fingerprint IS DISTINCT FROM OLD.candidat_fingerprint
       OR NEW.serie_id          IS DISTINCT FROM OLD.serie_id
       OR NEW.numero_anonyme    IS DISTINCT FROM OLD.numero_anonyme
       OR NEW.source_candidat_id IS DISTINCT FROM OLD.source_candidat_id
       OR NEW.created_at        IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION
        'candidats : chef_centre ne peut modifier que centre_id, salle_id, numero_table (candidat %)',
        OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_candidat_update_scope_by_role
  BEFORE UPDATE ON candidats
  FOR EACH ROW EXECUTE FUNCTION check_candidat_update_scope_by_role();


-- ==========================
-- AUDIT LOG
-- ==========================

-- Traçabilité des opérations sensibles (cf. PRD M15)
-- Alimenté par des triggers sur les tables critiques
CREATE TABLE audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    text        NOT NULL,
  operation     text        NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id     uuid,
  old_data      jsonb,       -- null pour INSERT
  new_data      jsonb,       -- null pour DELETE
  performed_by  uuid        REFERENCES profiles(id),
  -- null si opération via Edge Function (service_role) — normal
  performed_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_table      ON audit_log(table_name);
CREATE INDEX idx_audit_log_record     ON audit_log(record_id) WHERE record_id IS NOT NULL;
CREATE INDEX idx_audit_log_performed  ON audit_log(performed_at DESC);
CREATE INDEX idx_audit_log_user       ON audit_log(performed_by) WHERE performed_by IS NOT NULL;

-- Fonction générique d'audit (utilisée par tous les triggers d'audit)
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, performed_by)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL   ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL   ELSE to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Audit sur les tables critiques
CREATE TRIGGER trg_audit_examens
  AFTER INSERT OR UPDATE OR DELETE ON examens
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_saisies
  AFTER INSERT OR UPDATE OR DELETE ON saisies
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_resultats
  AFTER INSERT OR UPDATE OR DELETE ON resultats
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_codes_acces
  AFTER INSERT OR UPDATE OR DELETE ON codes_acces
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_candidats
  AFTER INSERT OR UPDATE OR DELETE ON candidats
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_lots
  AFTER INSERT OR UPDATE OR DELETE ON lots
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER trg_audit_imports_log
  AFTER INSERT OR UPDATE OR DELETE ON imports_log
  FOR EACH ROW EXECUTE FUNCTION log_audit();


-- ==========================
-- INDEXES
-- ==========================

-- profiles
CREATE INDEX idx_profiles_role             ON profiles(role);

-- user_centres / user_etablissements (axes fréquents pour RLS)
CREATE INDEX idx_user_centres_centre       ON user_centres(centre_id);
CREATE INDEX idx_user_etab_etablissement   ON user_etablissements(etablissement_id);

-- candidats
CREATE INDEX idx_candidats_examen          ON candidats(examen_id);
CREATE INDEX idx_candidats_etab            ON candidats(etablissement_id);
CREATE INDEX idx_candidats_centre          ON candidats(centre_id);
CREATE UNIQUE INDEX idx_candidats_fingerprint_nd
  ON candidats(examen_id, candidat_fingerprint) NULLS NOT DISTINCT;
CREATE INDEX idx_candidats_serie           ON candidats(examen_id, serie_id);
CREATE INDEX idx_candidats_anonyme         ON candidats(examen_id, numero_anonyme)
  WHERE numero_anonyme IS NOT NULL;
CREATE INDEX idx_candidats_table           ON candidats(examen_id, centre_id, numero_table)
  WHERE numero_table IS NOT NULL;

-- examen_disciplines
CREATE INDEX idx_examen_disc_examen        ON examen_disciplines(examen_id);
CREATE INDEX idx_examen_disc_groupe        ON examen_disciplines(groupe_choix_id)
  WHERE groupe_choix_id IS NOT NULL;

-- examen_discipline_series
CREATE INDEX idx_eds_serie                 ON examen_discipline_series(serie_id);

-- lots
CREATE INDEX idx_lots_examen               ON lots(examen_id);
CREATE INDEX idx_lots_centre               ON lots(centre_id);
CREATE INDEX idx_lots_discipline           ON lots(examen_discipline_id);
CREATE INDEX idx_lots_status               ON lots(status);

-- candidat_lots
CREATE INDEX idx_candidat_lots_lot         ON candidat_lots(lot_id);

-- codes_acces
CREATE INDEX idx_codes_acces_lot           ON codes_acces(lot_id)           WHERE is_active = true;
CREATE INDEX idx_codes_acces_hash          ON codes_acces(code_hash)        WHERE is_active = true;
CREATE INDEX idx_codes_acces_etablissement ON codes_acces(etablissement_id) WHERE etablissement_id IS NOT NULL;

-- saisies
CREATE INDEX idx_saisies_lot               ON saisies(lot_id);
CREATE INDEX idx_saisies_candidat          ON saisies(candidat_id);
CREATE INDEX idx_saisies_code_acces        ON saisies(code_acces_id) WHERE code_acces_id IS NOT NULL;

-- résultats
CREATE INDEX idx_resultats_examen          ON resultats(examen_id);
CREATE INDEX idx_resultats_candidat        ON resultats(candidat_id);
CREATE INDEX idx_resultats_status          ON resultats(examen_id, status);

-- imports_log
CREATE INDEX idx_imports_examen            ON imports_log(examen_id);
CREATE INDEX idx_imports_etab              ON imports_log(etablissement_id);


-- ==========================
-- TRIGGER updated_at
-- ==========================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_examens_updated_at
  BEFORE UPDATE ON examens  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_centres_updated_at
  BEFORE UPDATE ON centres  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_etablissements_updated_at
  BEFORE UPDATE ON etablissements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_candidats_updated_at
  BEFORE UPDATE ON candidats FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lots_updated_at
  BEFORE UPDATE ON lots      FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =====================================================
-- FIN DU SCHÉMA INITIAL v2.1
-- Migration suivante : 20260306000001_rls.sql
-- =====================================================
