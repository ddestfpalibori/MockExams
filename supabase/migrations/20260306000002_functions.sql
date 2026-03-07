-- =====================================================
-- MockExams — Fonctions Métier
-- Migration : 20260306000002_functions.sql
-- Version   : 1.0
-- Basé sur  : PRD v1.3 + Brief v2.6
-- =====================================================
-- Contenu :
--   PATCH  : INAPTE ajouté à code_special (EPS uniquement)
--   F01    : calculer_moyenne_candidat      — moteur de calcul
--   F02    : deliberer_candidat             — décision ADMIS/NON_ADMIS par candidat
--   F03    : deliberer_examen               — délibération complète d'un examen
--   F04    : affecter_candidats_salles      — affectation salle + numéro de table
--   F05    : generer_anonymats_centre       — génération des numéros anonymes
--   F06    : creer_lots_centre              — algorithme bons (sans HMAC — ajouté par Edge Function)
-- =====================================================
-- Responsabilités Edge Function (hors SQL) :
--   • Chiffrement/déchiffrement AES-256-GCM (PII candidats)
--   • Génération et vérification HMAC des lots (clé secrète)
--   • Export Excel (SheetJS)
--   • Rate limiting / lockout page publique (PRD §3.5)
-- =====================================================


-- ==========================
-- PATCH SCHÉMA : INAPTE pour EPS
-- ==========================
-- INAPTE = candidat dispensé d'EPS (certificat médical)
-- Conséquence délibération : EPS exclue du calcul, moyenne_phase2 = moyenne_phase1
-- Valide uniquement pour un lot de type 'eps'

ALTER TABLE saisies DROP CONSTRAINT IF EXISTS saisies_code_special_check;
ALTER TABLE saisies ADD CONSTRAINT saisies_code_special_check
  CHECK (code_special IN ('ABS', 'ABD', 'INAPTE'));

-- Contrainte : INAPTE uniquement pour un lot EPS
CREATE OR REPLACE FUNCTION check_inapte_uniquement_eps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code_special = 'INAPTE' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM lots l
      JOIN examen_disciplines ed ON ed.id = l.examen_discipline_id
      WHERE l.id     = NEW.lot_id
        AND ed.type  = 'eps'
    ) THEN
      RAISE EXCEPTION
        'saisies : code INAPTE uniquement valide pour une discipline EPS (lot %)',
        NEW.lot_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Déclencher aussi sur lot_id : évite de déplacer une saisie INAPTE vers un lot non-EPS
CREATE TRIGGER trg_check_inapte_eps
  BEFORE INSERT OR UPDATE OF code_special, lot_id ON saisies
  FOR EACH ROW EXECUTE FUNCTION check_inapte_uniquement_eps();


-- ==========================
-- F01 : calculer_moyenne_candidat
-- ==========================
-- Calcule la moyenne pondérée d'un candidat pour une phase donnée.
-- Retourne la moyenne en centièmes (integer) ou NULL si notes manquantes.
--
-- Règles (cf. PRD §3.3 + Brief §4.1.5) :
--   Phase 1 : ecrit_obligatoire uniquement
--   Phase 2 (ou mode unique) : toutes disciplines actives dans l'examen
--   EPS INAPTE              : discipline exclue
--   Facultatif Option 1     : points bonus = MAX(0, note - seuil) × coeff
--                             dénominateur inchangé
--   Facultatif Option 2     : inclus normalement
--   Formule                 : ROUND(SUM(note_i × coeff_i × 100) / SUM(coeff_i))

CREATE OR REPLACE FUNCTION calculer_moyenne_candidat(
  p_candidat_id  uuid,
  p_phase        integer  -- 1 ou 2
)
RETURNS integer   -- centièmes, ou NULL si données incomplètes
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_examen_id        uuid;
  v_mode             deliberation_mode;
  v_numerateur       bigint  := 0;
  v_denominateur     bigint  := 0;
  v_has_missing      boolean := false;
  rec                RECORD;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'calculer_moyenne_candidat : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  -- Récupérer l'examen et ses paramètres
  SELECT c.examen_id, e.mode_deliberation
  INTO v_examen_id, v_mode
  FROM candidats c
  JOIN examens   e ON e.id = c.examen_id
  WHERE c.id = p_candidat_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'calculer_moyenne_candidat : candidat % introuvable', p_candidat_id;
  END IF;

  -- Itérer sur les disciplines applicables à ce candidat pour cette phase
  FOR rec IN
    SELECT
      ed.id                  AS examen_discipline_id,
      ed.type                AS disc_type,
      ed.coefficient         AS coeff,
      ed.facultatif_option   AS fac_option,
      ed.seuil_facultatif    AS fac_seuil,
      s.note_centimes,
      s.code_special,
      -- Vérifier si le candidat a choisi cette discipline (au_choix)
      CASE
        WHEN ed.groupe_choix_id IS NULL THEN true  -- discipline obligatoire
        ELSE EXISTS (
          SELECT 1 FROM candidat_choix_disciplines ccd
          WHERE ccd.candidat_id          = p_candidat_id
            AND ccd.groupe_choix_id      = ed.groupe_choix_id
            AND ccd.examen_discipline_id = ed.id
        )
      END AS est_choisie
    FROM examen_disciplines ed
    -- Lot réel du candidat pour cette discipline.
    -- ⚠️  On part de candidat_lots, pas de lots : si une discipline a plusieurs lots
    --     (séries différentes), la jointure lots→ed retournerait plusieurs lignes,
    --     dont certaines sans saisie → faux positif "note manquante".
    LEFT JOIN LATERAL (
      SELECT l.id AS lot_id
      FROM candidat_lots cl
      JOIN lots l ON l.id = cl.lot_id
      WHERE cl.candidat_id         = p_candidat_id
        AND l.examen_discipline_id = ed.id
      LIMIT 1  -- exactement 1 par design (clé canonique lot)
    ) cl_lot ON true
    LEFT JOIN saisies s ON s.lot_id = cl_lot.lot_id AND s.candidat_id = p_candidat_id
    WHERE ed.examen_id = v_examen_id
      -- Filtre série : discipline applicable à la série du candidat
      AND (
        NOT EXISTS (
          SELECT 1 FROM examen_discipline_series eds WHERE eds.examen_discipline_id = ed.id
        )
        OR EXISTS (
          SELECT 1
          FROM examen_discipline_series eds
          JOIN candidats c2 ON c2.id = p_candidat_id
          WHERE eds.examen_discipline_id = ed.id
            AND eds.serie_id             = c2.serie_id
        )
      )
      -- Filtre phase
      AND (
        p_phase = 1 AND ed.type = 'ecrit_obligatoire'
        OR
        p_phase = 2 AND ed.type IN ('ecrit_obligatoire', 'oral', 'eps', 'facultatif')
      )
  LOOP
    -- Ignorer les disciplines non choisies (au_choix)
    CONTINUE WHEN NOT rec.est_choisie;

    -- EPS INAPTE : discipline exclue du calcul
    CONTINUE WHEN rec.code_special = 'INAPTE';

    -- Note manquante (les deux NULL = pas encore saisie)
    IF rec.note_centimes IS NULL AND rec.code_special IS NULL THEN
      v_has_missing := true;
      CONTINUE;
    END IF;

    -- ABS ou ABD → la fonction retourne NULL (le calcul de moyenne n'a pas lieu,
    -- l'appelant (deliberer_candidat) a déjà detécté ABS/ABD et donne NON_ADMIS)
    IF rec.code_special IN ('ABS', 'ABD') THEN
      RETURN NULL;
    END IF;

    -- Facultatif Option 1 : bonus pur (ne modifie pas le dénominateur)
    IF rec.disc_type = 'facultatif' AND rec.fac_option = '1' THEN
      IF rec.note_centimes > rec.fac_seuil THEN
        v_numerateur := v_numerateur + (rec.note_centimes - rec.fac_seuil)::bigint * rec.coeff;
      END IF;
      -- Dénominateur inchangé
      CONTINUE;
    END IF;

    -- Discipline normale (obligatoire, oral, EPS sain, facultatif option 2)
    v_numerateur   := v_numerateur   + rec.note_centimes::bigint * rec.coeff;
    v_denominateur := v_denominateur + rec.coeff;
  END LOOP;

  -- Si notes manquantes, impossible de calculer
  IF v_has_missing OR v_denominateur = 0 THEN
    RETURN NULL;
  END IF;

  -- Formule PRD §3.3 : ROUND(SUM(note_i × coeff_i × 100) / SUM(coeff_i))
  -- note_centimes est déjà en centièmes (ex: 1350 = 13.50/20)
  -- donc : ROUND(numerateur / denominateur) directement
  RETURN ROUND(v_numerateur::numeric / v_denominateur::numeric)::integer;
END;
$$;


-- ==========================
-- F02 : deliberer_candidat
-- ==========================
-- Calcule et persiste le résultat de délibération pour un candidat.
-- Gère le mode unique et le mode deux_phases.
-- Retourne le statut final ('ADMIS', 'NON_ADMIS', 'RATTRAPAGE').

CREATE OR REPLACE FUNCTION deliberer_candidat(
  p_candidat_id  uuid,
  p_delibere_par uuid  -- profil qui lance la délibération
)
RETURNS resultat_status
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_examen_id     uuid;
  v_exam_status   exam_status;
  v_mode          deliberation_mode;
  v_seuil_ph1     smallint;
  v_seuil_ph2     smallint;
  v_rattrapage    boolean;
  v_eps_active    boolean;
  v_a_abs_abd     boolean;
  v_eps_inapte    boolean;
  v_moy_ph1       integer;
  v_moy_ph2       integer;
  v_statut_ph1    resultat_status;
  v_statut_final  resultat_status;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'deliberer_candidat : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  -- Charger les paramètres de l'examen (statut inclus pour la garde de phase)
  SELECT
    c.examen_id,
    e.status,
    e.mode_deliberation,
    e.seuil_phase1,
    e.seuil_phase2,
    e.rattrapage_actif,
    e.eps_active
  INTO v_examen_id, v_exam_status, v_mode, v_seuil_ph1, v_seuil_ph2, v_rattrapage, v_eps_active
  FROM candidats c
  JOIN examens e ON e.id = c.examen_id
  WHERE c.id = p_candidat_id;

  -- Garde de phase : délibération uniquement en DELIBERATION ou CORRECTION_POST_DELIBERATION
  IF v_exam_status NOT IN ('DELIBERATION', 'CORRECTION_POST_DELIBERATION') THEN
    RAISE EXCEPTION
      'deliberer_candidat : examen doit être en DELIBERATION ou CORRECTION_POST_DELIBERATION (statut: %)',
      v_exam_status;
  END IF;

  -- Vérifier présence d'un ABS ou ABD (toute discipline) → NON_ADMIS immédiat
  SELECT EXISTS (
    SELECT 1
    FROM saisies s
    JOIN lots l           ON l.id = s.lot_id
    JOIN candidat_lots cl ON cl.lot_id = l.id AND cl.candidat_id = p_candidat_id
    WHERE s.candidat_id   = p_candidat_id
      AND s.code_special  IN ('ABS', 'ABD')
  ) INTO v_a_abs_abd;

  IF v_a_abs_abd THEN
    INSERT INTO resultats (examen_id, candidat_id, phase, moyenne_centimes, status, delibere_par, delibere_at)
    VALUES (v_examen_id, p_candidat_id, 1, NULL, 'NON_ADMIS', p_delibere_par, now())
    ON CONFLICT (examen_id, candidat_id, phase) DO UPDATE
      SET moyenne_centimes = NULL,
          status           = 'NON_ADMIS',
          delibere_par     = p_delibere_par,
          delibere_at      = now();
    RETURN 'NON_ADMIS';
  END IF;

  -- Vérifier INAPTE EPS (pour mode deux_phases)
  IF v_eps_active THEN
    SELECT EXISTS (
      SELECT 1
      FROM saisies s
      JOIN lots l           ON l.id = s.lot_id
      JOIN examen_disciplines ed ON ed.id = l.examen_discipline_id
      WHERE s.candidat_id  = p_candidat_id
        AND s.code_special = 'INAPTE'
        AND ed.type        = 'eps'
    ) INTO v_eps_inapte;
  END IF;

  -- ── Mode UNIQUE ─────────────────────────────────────────────────────────
  IF v_mode = 'unique' THEN
    v_moy_ph2 := calculer_moyenne_candidat(p_candidat_id, 2);

    IF v_moy_ph2 IS NULL THEN
      RAISE EXCEPTION
        'deliberer_candidat : notes manquantes pour le candidat % (mode unique)',
        p_candidat_id;
    END IF;

    v_statut_final := CASE
      WHEN v_moy_ph2 >= v_seuil_ph2                             THEN 'ADMIS'
      WHEN v_rattrapage AND v_moy_ph2 >= (v_seuil_ph2 - 200)   THEN 'RATTRAPAGE'
      ELSE 'NON_ADMIS'
    END;

    INSERT INTO resultats (examen_id, candidat_id, phase, moyenne_centimes, status, delibere_par, delibere_at)
    VALUES (v_examen_id, p_candidat_id, 1, v_moy_ph2, v_statut_final, p_delibere_par, now())
    ON CONFLICT (examen_id, candidat_id, phase) DO UPDATE
      SET moyenne_centimes = v_moy_ph2,
          status           = v_statut_final,
          delibere_par     = p_delibere_par,
          delibere_at      = now();

    RETURN v_statut_final;
  END IF;

  -- ── Mode DEUX_PHASES ────────────────────────────────────────────────────
  -- Phase 1 : écrit obligatoire uniquement
  v_moy_ph1 := calculer_moyenne_candidat(p_candidat_id, 1);

  IF v_moy_ph1 IS NULL THEN
    RAISE EXCEPTION
      'deliberer_candidat : notes écrit manquantes pour le candidat % (phase 1)',
      p_candidat_id;
  END IF;

  v_statut_ph1 := CASE
    WHEN v_moy_ph1 >= v_seuil_ph1 THEN 'ADMIS'   -- admissible phase 2
    ELSE 'NON_ADMIS'
  END;

  INSERT INTO resultats (
    examen_id, candidat_id, phase, moyenne_centimes,
    status, admissible_phase1, delibere_par, delibere_at
  )
  VALUES (
    v_examen_id, p_candidat_id, 1, v_moy_ph1,
    v_statut_ph1, v_statut_ph1 = 'ADMIS', p_delibere_par, now()
  )
  ON CONFLICT (examen_id, candidat_id, phase) DO UPDATE
    SET moyenne_centimes  = v_moy_ph1,
        status            = v_statut_ph1,
        admissible_phase1 = v_statut_ph1 = 'ADMIS',
        delibere_par      = p_delibere_par,
        delibere_at       = now();

  -- Candidat non admissible : pas de phase 2
  IF v_statut_ph1 = 'NON_ADMIS' THEN
    RETURN 'NON_ADMIS';
  END IF;

  -- Phase 2 : toutes disciplines actives
  -- Cas EPS INAPTE : Moyenne_phase2 = Moyenne_phase1 → ADMIS automatique
  IF v_eps_inapte THEN
    v_moy_ph2     := v_moy_ph1;
    v_statut_final := 'ADMIS';
  ELSE
    v_moy_ph2 := calculer_moyenne_candidat(p_candidat_id, 2);
    IF v_moy_ph2 IS NULL THEN
      RAISE EXCEPTION
        'deliberer_candidat : notes phase 2 manquantes pour le candidat %',
        p_candidat_id;
    END IF;

    v_statut_final := CASE
      WHEN v_moy_ph2 >= v_seuil_ph2                             THEN 'ADMIS'
      WHEN v_rattrapage AND v_moy_ph2 >= (v_seuil_ph2 - 200)   THEN 'RATTRAPAGE'
      ELSE 'NON_ADMIS'
    END;
  END IF;

  INSERT INTO resultats (examen_id, candidat_id, phase, moyenne_centimes, status, delibere_par, delibere_at)
  VALUES (v_examen_id, p_candidat_id, 2, v_moy_ph2, v_statut_final, p_delibere_par, now())
  ON CONFLICT (examen_id, candidat_id, phase) DO UPDATE
    SET moyenne_centimes = v_moy_ph2,
        status           = v_statut_final,
        delibere_par     = p_delibere_par,
        delibere_at      = now();

  RETURN v_statut_final;
END;
$$;


-- ==========================
-- F03 : deliberer_examen
-- ==========================
-- Lance la délibération pour tous les candidats d'un examen.
-- Appelée par l'admin via l'interface ou Edge Function.
-- Retourne un résumé : nb_admis, nb_non_admis, nb_rattrapage, nb_erreurs.

CREATE OR REPLACE FUNCTION deliberer_examen(
  p_examen_id    uuid,
  p_delibere_par uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_nb_admis       int := 0;
  v_nb_non_admis   int := 0;
  v_nb_rattrapage  int := 0;
  v_nb_erreurs     int := 0;
  v_erreurs        jsonb := '[]'::jsonb;
  v_exam_status    exam_status;
  v_statut         resultat_status;
  v_candidat_id    uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'deliberer_examen : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  -- Garde de phase
  SELECT status INTO v_exam_status FROM examens WHERE id = p_examen_id;
  IF v_exam_status NOT IN ('DELIBERATION', 'CORRECTION_POST_DELIBERATION') THEN
    RAISE EXCEPTION
      'deliberer_examen : examen % doit être en DELIBERATION ou CORRECTION_POST_DELIBERATION (statut: %)',
      p_examen_id, v_exam_status;
  END IF;

  FOR v_candidat_id IN
    SELECT id FROM candidats WHERE examen_id = p_examen_id
  LOOP
    BEGIN
      v_statut := deliberer_candidat(v_candidat_id, p_delibere_par);
      CASE v_statut
        WHEN 'ADMIS'       THEN v_nb_admis      := v_nb_admis      + 1;
        WHEN 'NON_ADMIS'   THEN v_nb_non_admis  := v_nb_non_admis  + 1;
        WHEN 'RATTRAPAGE'  THEN v_nb_rattrapage := v_nb_rattrapage + 1;
        ELSE NULL;
      END CASE;
    EXCEPTION WHEN OTHERS THEN
      v_nb_erreurs := v_nb_erreurs + 1;
      v_erreurs := v_erreurs || jsonb_build_array(
        jsonb_build_object(
          'candidat_id', v_candidat_id,
          'message', SQLERRM
        )
      );
      RAISE WARNING 'deliberer_examen : erreur candidat % — %', v_candidat_id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'examen_id',      p_examen_id,
    'nb_admis',       v_nb_admis,
    'nb_non_admis',   v_nb_non_admis,
    'nb_rattrapage',  v_nb_rattrapage,
    'nb_erreurs',     v_nb_erreurs,
    'erreurs',        v_erreurs,
    'total',          v_nb_admis + v_nb_non_admis + v_nb_rattrapage + v_nb_erreurs
  );
END;
$$;


-- ==========================
-- F04 : affecter_candidats_salles
-- ==========================
-- Affecte tous les candidats d'un centre à des salles + numéros de table.
-- Numéros de table : globaux au centre, séquentiels (cf. Brief §4.4.5).
-- Règles d'affectation :
--   alphabetique      : tri par nom_enc (alphabétique chiffré — approximatif)
--   par_etablissement : candidats d'un même établissement groupés ensemble
--   numero_anonyme    : nécessite que les anonymats soient déjà générés

CREATE OR REPLACE FUNCTION affecter_candidats_salles(
  p_examen_id   uuid,
  p_centre_id   uuid
)
RETURNS int  -- Nombre de candidats affectés
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_salle             RECORD;
  v_exam_status       exam_status;
  v_candidat_id       uuid;
  v_position_globale  int  := 0;
  v_position_salle    int  := 0;
  v_table_debut       int  := 1;
  v_regle             affectation_rule;
  v_nb_affecter       int;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'affecter_candidats_salles : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  -- Garde de phase : affectation uniquement en phase COMPOSITION
  SELECT status INTO v_exam_status FROM examens WHERE id = p_examen_id;
  IF v_exam_status != 'COMPOSITION' THEN
    RAISE EXCEPTION
      'affecter_candidats_salles : examen % doit être en COMPOSITION (statut: %)',
      p_examen_id, v_exam_status;
  END IF;

  -- Calculer le début de table pour chaque salle (séquentiel global)
  FOR v_salle IN
    SELECT id, capacite, ordre, regle_affectation, nom
    FROM salles
    WHERE examen_id = p_examen_id AND centre_id = p_centre_id
    ORDER BY ordre ASC
  LOOP
    v_regle        := v_salle.regle_affectation;
    v_position_salle := 0;

    -- Sélectionner les candidats à affecter dans cette salle
    FOR v_candidat_id IN
      SELECT c.id
      FROM candidats c
      WHERE c.examen_id       = p_examen_id
        AND c.centre_id       = p_centre_id
        AND c.salle_id        IS NULL  -- non encore affectés
      ORDER BY
        -- ⚠️  'alphabetique' trie sur nom_enc (valeur CHIFFRÉE) — l'ordre n'est pas
        --     l'ordre alphabétique réel des noms en clair. C'est un tri pseudo-stable
        --     utilisé comme approximation déterministe pour répartir les candidats.
        --     Pour un tri réel par nom, déchiffrer côté Edge Function avant affectation,
        --     ou utiliser 'par_etablissement' (déterministe métier) / 'numero_anonyme'.
        CASE WHEN v_regle = 'alphabetique'      THEN c.nom_enc                END ASC,
        CASE WHEN v_regle = 'par_etablissement' THEN c.etablissement_id::text END ASC,
        CASE WHEN v_regle = 'numero_anonyme'    THEN c.numero_anonyme         END ASC,
        c.id ASC  -- tie-breaker stable sur UUID pour éviter tout non-déterminisme résiduel
      LIMIT v_salle.capacite
    LOOP
      v_position_globale := v_position_globale + 1;
      v_position_salle   := v_position_salle   + 1;

      UPDATE candidats
      SET
        salle_id      = v_salle.id,
        numero_table  = v_table_debut + v_position_salle - 1
      WHERE id = v_candidat_id;
    END LOOP;

    -- Avancer le début de table pour la prochaine salle
    v_table_debut := v_table_debut + v_salle.capacite;
  END LOOP;

  -- Compter les candidats affectés
  SELECT COUNT(*) INTO v_nb_affecter
  FROM candidats
  WHERE examen_id = p_examen_id AND centre_id = p_centre_id AND salle_id IS NOT NULL;

  RETURN v_nb_affecter;
END;
$$;


-- ==========================
-- F05 : generer_anonymats_centre
-- ==========================
-- Génère les numéros anonymes pour tous les candidats d'un centre.
-- Ordre : salle (ordre ASC) → numéro de table ASC.
-- Format : prefixe || LPAD(debut + position - 1, longueur, '0')
-- Exemple : prefixe='C', debut=1, 3 chiffres → 'C001', 'C002', ...

CREATE OR REPLACE FUNCTION generer_anonymats_centre(
  p_examen_id   uuid,
  p_centre_id   uuid
)
RETURNS int  -- Nombre de numéros générés
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_prefixe       text;
  v_debut         int;
  v_exam_status   exam_status;
  v_deja_generes  int;
  v_position      int := 0;
  v_candidat_id   uuid;
  v_numero        text;
  v_nb_chiffres   int;
  v_nb_total      int;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'generer_anonymats_centre : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  -- Charger les paramètres d'anonymat de l'examen (statut inclus pour la garde de phase)
  SELECT anonymat_prefixe, anonymat_debut, status
  INTO v_prefixe, v_debut, v_exam_status
  FROM examens WHERE id = p_examen_id;

  -- Garde de phase : génération anonymats uniquement en phase COMPOSITION
  IF v_exam_status != 'COMPOSITION' THEN
    RAISE EXCEPTION
      'generer_anonymats_centre : examen % doit être en COMPOSITION (statut: %)',
      p_examen_id, v_exam_status;
  END IF;

  -- Déterminer le nombre de chiffres nécessaires (basé sur le nombre total de candidats du centre)
  SELECT COUNT(*) INTO v_nb_total
  FROM candidats WHERE examen_id = p_examen_id AND centre_id = p_centre_id;

  v_nb_chiffres := LENGTH((v_debut + v_nb_total - 1)::text);
  v_nb_chiffres := GREATEST(v_nb_chiffres, 3);  -- minimum 3 chiffres

  -- Nombre déjà généré : on poursuit la séquence au lieu de réécrire les anonymes existants.
  SELECT COUNT(*) INTO v_deja_generes
  FROM candidats
  WHERE examen_id = p_examen_id
    AND centre_id = p_centre_id
    AND numero_anonyme IS NOT NULL;

  -- Générer les numéros dans l'ordre salle → table
  FOR v_candidat_id IN
    SELECT c.id
    FROM candidats c
    LEFT JOIN salles s ON s.id = c.salle_id
    WHERE c.examen_id = p_examen_id
      AND c.centre_id = p_centre_id
      AND c.numero_anonyme IS NULL
    ORDER BY
      COALESCE(s.ordre, 9999) ASC,
      c.numero_table ASC NULLS LAST
  LOOP
    v_position := v_position + 1;
    v_numero   := v_prefixe || LPAD((v_debut + v_deja_generes + v_position - 1)::text, v_nb_chiffres, '0');

    UPDATE candidats
    SET numero_anonyme = v_numero
    WHERE id = v_candidat_id;
  END LOOP;

  RETURN v_position;
END;
$$;


-- ==========================
-- F06 : creer_lots_centre
-- ==========================
-- Crée les lots de correction pour une discipline×série dans un centre.
-- Implémente l'algorithme bons (cf. Brief §4.9.3).
--
-- bon=1 : lots séquentiels de taille_salle_ref copies
--   lot = FLOOR((position - 1) / taille_salle_ref) + 1
-- bon=3 ou 5 : round-robin interleaved
--   lot = ((position - 1) % bon) + 1
--
-- ⚠️  HMAC non inclus ici — l'Edge Function ajoute hmac_signature
--     + generation_timestamp après création des lots.

CREATE OR REPLACE FUNCTION creer_lots_centre(
  p_examen_id             uuid,
  p_centre_id             uuid,
  p_examen_discipline_id  uuid,
  p_serie_id              uuid  DEFAULT NULL  -- null = toutes séries
)
RETURNS int  -- Nombre de lots créés
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_bon              smallint;
  v_taille_ref       smallint;
  v_exam_status      exam_status;
  v_position         int := 0;
  v_lot_numero       smallint;
  v_lot_id           uuid;
  v_candidat_id      uuid;
  v_max_lot          int := 0;
  rec                RECORD;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'creer_lots_centre : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  -- Charger les paramètres de l'examen (statut inclus pour la garde de phase)
  SELECT anonymat_bon, taille_salle_ref, status
  INTO v_bon, v_taille_ref, v_exam_status
  FROM examens WHERE id = p_examen_id;

  -- Garde de phase : création des lots uniquement en phase COMPOSITION
  IF v_exam_status != 'COMPOSITION' THEN
    RAISE EXCEPTION
      'creer_lots_centre : examen % doit être en COMPOSITION (statut: %)',
      p_examen_id, v_exam_status;
  END IF;

  -- Récupérer les candidats dans l'ordre salle → table
  -- Filtrés par série si applicable
  FOR rec IN
    SELECT c.id AS candidat_id
    FROM candidats c
    LEFT JOIN salles s ON s.id = c.salle_id
    WHERE c.examen_id = p_examen_id
      AND c.centre_id = p_centre_id
      AND (p_serie_id IS NULL OR c.serie_id = p_serie_id)
      AND c.numero_table IS NOT NULL
    ORDER BY
      COALESCE(s.ordre, 9999) ASC,
      c.numero_table          ASC
  LOOP
    v_position := v_position + 1;

    -- Calcul du numéro de lot selon l'algorithme bons
    v_lot_numero := CASE
      WHEN v_bon = 1 THEN
        ((v_position - 1) / v_taille_ref + 1)::smallint
      ELSE
        (((v_position - 1) % v_bon) + 1)::smallint
    END;

    v_max_lot := GREATEST(v_max_lot, v_lot_numero);

    -- Créer le lot s'il n'existe pas encore
    -- UPSERT : si ce lot existe déjà (réexécution), on l'ignore
    INSERT INTO lots (examen_id, centre_id, examen_discipline_id, serie_id, lot_numero, nb_copies)
    VALUES (p_examen_id, p_centre_id, p_examen_discipline_id, p_serie_id, v_lot_numero, 0)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_lot_id;

    -- Si le lot existait déjà, le récupérer
    IF v_lot_id IS NULL THEN
      SELECT id INTO v_lot_id
      FROM lots
      WHERE centre_id             = p_centre_id
        AND examen_discipline_id  = p_examen_discipline_id
        AND lot_numero            = v_lot_numero
        AND (serie_id = p_serie_id OR (serie_id IS NULL AND p_serie_id IS NULL));
    END IF;

    -- Affecter le candidat au lot.
    -- ON CONFLICT sur (candidat_id, examen_discipline_id) : sur réexécution,
    -- on met à jour le lot (au lieu de créer un doublon).
    INSERT INTO candidat_lots (candidat_id, lot_id, examen_discipline_id, position_dans_lot)
    VALUES (rec.candidat_id, v_lot_id, p_examen_discipline_id, v_position)
    ON CONFLICT (candidat_id, examen_discipline_id) DO UPDATE
      SET lot_id            = EXCLUDED.lot_id,
          position_dans_lot = EXCLUDED.position_dans_lot;

  END LOOP;

  -- Mettre à jour nb_copies sur chaque lot
  UPDATE lots l
  SET nb_copies = (
    SELECT COUNT(*) FROM candidat_lots cl WHERE cl.lot_id = l.id
  )
  WHERE l.centre_id            = p_centre_id
    AND l.examen_discipline_id = p_examen_discipline_id
    AND (l.serie_id = p_serie_id OR (l.serie_id IS NULL AND p_serie_id IS NULL));

  RETURN v_max_lot;  -- Numéro de lot maximal affecté (pas forcément le nombre de lots insérés)
END;
$$;


-- ==========================
-- UTILITAIRE : compter_notes_manquantes
-- ==========================
-- Vérifie combien de candidats n'ont pas encore toutes leurs notes.
-- Utilisé par l'interface avant de lancer la délibération.

CREATE OR REPLACE FUNCTION compter_notes_manquantes(p_examen_id uuid)
RETURNS TABLE (
  candidat_id           uuid,
  nb_notes_manquantes   bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'compter_notes_manquantes : réservé aux administrateurs (uid: %)', auth.uid();
  END IF;

  RETURN QUERY
  SELECT
    cl.candidat_id,
    COUNT(*) FILTER (WHERE s.note_centimes IS NULL AND s.code_special IS NULL) AS nb_notes_manquantes
  FROM candidat_lots cl
  JOIN lots l ON l.id = cl.lot_id
  JOIN examen_disciplines ed ON ed.id = cl.examen_discipline_id
  LEFT JOIN candidat_choix_disciplines ccd
    ON ccd.candidat_id = cl.candidat_id
   AND ccd.groupe_choix_id = ed.groupe_choix_id
   AND ccd.examen_discipline_id = ed.id
  LEFT JOIN saisies s ON s.lot_id = cl.lot_id AND s.candidat_id = cl.candidat_id
  WHERE l.examen_id = p_examen_id
    AND (
      ed.groupe_choix_id IS NULL
      OR ccd.candidat_id IS NOT NULL
    )
  GROUP BY cl.candidat_id
  HAVING COUNT(*) FILTER (WHERE s.note_centimes IS NULL AND s.code_special IS NULL) > 0;
END;
$$;


-- =====================================================
-- DURCISSEMENT EXECUTE : fonctions métier SECURITY DEFINER
-- =====================================================
-- Retirer l'accès PUBLIC par défaut, puis accorder uniquement :
--   authenticated  → admins via interface / API PostgREST
--   service_role   → Edge Functions (hors RLS, contournement intentionnel)
-- Les correcteurs n'ont pas de compte Supabase → jamais d'accès direct.

REVOKE EXECUTE ON FUNCTION calculer_moyenne_candidat(uuid, integer)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION deliberer_candidat(uuid, uuid)                         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION deliberer_examen(uuid, uuid)                           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION affecter_candidats_salles(uuid, uuid)                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION generer_anonymats_centre(uuid, uuid)                   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION creer_lots_centre(uuid, uuid, uuid, uuid)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION compter_notes_manquantes(uuid)                         FROM PUBLIC;

GRANT EXECUTE ON FUNCTION calculer_moyenne_candidat(uuid, integer)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION deliberer_candidat(uuid, uuid)                         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION deliberer_examen(uuid, uuid)                           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION affecter_candidats_salles(uuid, uuid)                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generer_anonymats_centre(uuid, uuid)                   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION creer_lots_centre(uuid, uuid, uuid, uuid)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION compter_notes_manquantes(uuid)                         TO authenticated, service_role;


-- =====================================================
-- FIN DES FONCTIONS MÉTIER v1.0
-- =====================================================
-- Workflow d'appel (séquence normale) :
--   COMPOSITION :
--     1. affecter_candidats_salles(examen_id, centre_id)
--     2. generer_anonymats_centre(examen_id, centre_id)
--     3. creer_lots_centre(examen_id, centre_id, discipline_id, serie_id)
--     4. Edge Function : ajouter hmac_signature + generation_timestamp sur chaque lot
--   CORRECTION :
--     5. Edge Function : générer Excel + distribuer codes d'accès
--     6. Correcteurs : saisie via Edge Function
--   DELIBERATION :
--     7. compter_notes_manquantes(examen_id)  — vérification avant délibération
--     8. deliberer_examen(examen_id, delibere_par)
-- =====================================================
