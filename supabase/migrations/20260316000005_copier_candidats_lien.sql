-- =====================================================
-- MockExams — RPC copier_candidats_depuis_lien
-- Migration : 20260316000005_copier_candidats_lien.sql
-- Sprint 5D : Liens inter-examens
-- =====================================================

CREATE OR REPLACE FUNCTION copier_candidats_depuis_lien(p_lien_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_lien          record;
  v_examen_cible  record;
  nb_copies       int := 0;
  nb_ignores      int := 0;
  rec             record;
BEGIN
  -- Guard : admin uniquement
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  -- Charger le lien
  SELECT * INTO v_lien
  FROM examen_liens
  WHERE id = p_lien_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lien % introuvable', p_lien_id;
  END IF;

  -- Charger l'examen cible et vérifier le statut
  SELECT * INTO v_examen_cible
  FROM examens
  WHERE id = v_lien.examen_cible_id;

  IF v_examen_cible.status NOT IN ('CONFIG', 'INSCRIPTIONS') THEN
    RAISE EXCEPTION
      'L''examen cible doit être en CONFIG ou INSCRIPTIONS (statut actuel : %)',
      v_examen_cible.status;
  END IF;

  -- Itérer sur les candidats éligibles
  FOR rec IN
    SELECT DISTINCT
      c.id,
      c.nom_enc,
      c.prenom_enc,
      c.date_naissance_enc,
      c.lieu_naissance_enc,
      c.sexe,
      c.serie_id,
      c.candidat_fingerprint,
      c.matricule,
      c.etablissement_id
    FROM candidats c
    -- Filtre : établissements ciblés par le lien (si vide → tous ceux de l'examen source)
    WHERE c.examen_id = v_lien.examen_source_id
      AND c.etablissement_id IN (
        -- Établissements du lien (si renseignés)
        SELECT ele.etablissement_id
        FROM examen_lien_etablissements ele
        WHERE ele.lien_id = p_lien_id
        UNION ALL
        -- Fallback : tous les établissements de l'examen source (si aucun établissement dans le lien)
        SELECT ee.etablissement_id
        FROM examen_etablissements ee
        WHERE ee.examen_id = v_lien.examen_source_id
          AND NOT EXISTS (
            SELECT 1 FROM examen_lien_etablissements ele2 WHERE ele2.lien_id = p_lien_id
          )
      )
      -- Contrainte critique : l'établissement doit aussi être dans l'examen CIBLE
      AND c.etablissement_id IN (
        SELECT ee2.etablissement_id
        FROM examen_etablissements ee2
        WHERE ee2.examen_id = v_lien.examen_cible_id
      )
      -- Filtre mode_heritage
      AND (
        v_lien.mode_heritage = 'tous'
        OR (
          v_lien.mode_heritage = 'non_admis_uniquement'
          AND EXISTS (
            SELECT 1 FROM resultats r
            WHERE r.candidat_id = c.id
              AND r.status IN ('NON_ADMIS', 'RATTRAPAGE')
          )
        )
      )
  LOOP
    -- Idempotence : ne copier que si fingerprint absent dans l'examen cible
    IF rec.candidat_fingerprint IS NOT NULL AND EXISTS (
      SELECT 1 FROM candidats c2
      WHERE c2.examen_id = v_lien.examen_cible_id
        AND c2.candidat_fingerprint = rec.candidat_fingerprint
    ) THEN
      nb_ignores := nb_ignores + 1;
      CONTINUE;
    END IF;

    INSERT INTO candidats (
      examen_id,
      etablissement_id,
      nom_enc,
      prenom_enc,
      date_naissance_enc,
      lieu_naissance_enc,
      sexe,
      serie_id,
      candidat_fingerprint,
      matricule,
      source_candidat_id
    ) VALUES (
      v_lien.examen_cible_id,
      rec.etablissement_id,
      rec.nom_enc,
      rec.prenom_enc,
      rec.date_naissance_enc,
      rec.lieu_naissance_enc,
      rec.sexe,
      rec.serie_id,
      rec.candidat_fingerprint,
      rec.matricule,
      rec.id
    );

    nb_copies := nb_copies + 1;
  END LOOP;

  RETURN jsonb_build_object('copies', nb_copies, 'ignores', nb_ignores);
END;
$$;

GRANT EXECUTE ON FUNCTION copier_candidats_depuis_lien(uuid) TO service_role;
