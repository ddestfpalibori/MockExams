/**
 * Types métier dérivés de database.types.ts
 * Centralise les enums et types réutilisés côté frontend.
 */

import type { Database } from '@/lib/database.types';

export type ExamStatus = Database['public']['Enums']['exam_status'];
export type LotStatus = Database['public']['Enums']['lot_status'];
export type ResultatStatus = Database['public']['Enums']['resultat_status'];
export type UserRole = Database['public']['Enums']['user_role'];
export type AffectationRule = Database['public']['Enums']['affectation_rule'];
export type DisciplineType = Database['public']['Enums']['discipline_type'];

// Enums migration 20260309 — numérotation avancée des tables
export type TablePrefixMode = 'AUCUN' | 'FIXE' | 'CENTRE' | 'COMMUNE' | 'DEPARTEMENT';
export type TableContinuityScope = 'CENTRE' | 'DEPARTEMENT' | 'EXAMEN';

/** Colonnes candidats non-sensibles (sans PII chiffrées) */
export interface CandidatRow {
    id: string;
    numero_anonyme: string | null;
    serie_id: string | null;
    centre_id: string | null;
    salle_id: string | null;
    numero_table: number | null;
    numero_table_formate?: string | null;
}

export interface ExamenRow {
    id: string;
    code: string;
    libelle: string;
    annee: number;
    status: ExamStatus;

    // Paramètres délibération
    mode_deliberation: Database['public']['Enums']['deliberation_mode'];
    seuil_phase1: number;
    seuil_phase2: number;
    seuil_rattrapage: number | null; // nullable — doit être défini explicitement si activé, pas de fallback
    oral_actif: boolean;
    eps_active: boolean;
    facultatif_actif: boolean;
    rattrapage_actif: boolean;

    // Paramètres anonymat & composition
    anonymat_actif: boolean;
    anonymat_prefixe: string;
    anonymat_debut: number;
    anonymat_bon: number;
    taille_salle_ref: number;
    distribution_model: Database['public']['Enums']['distribution_model'];
    hmac_window_days: number;
    date_composition_debut: string | null;
    date_composition_fin: string | null;
    date_deliberation: string | null;
    date_publication: string | null;

    // Numérotation tables (migration 20260309)
    table_prefix_type: TablePrefixMode;
    table_prefix_valeur: string | null;
    table_separator: string;
    table_padding: number;
    table_continuity_scope: TableContinuityScope;

    logo_url: string | null;
    signature_url: string | null;

    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ExamenStats {
    total_examens: number;
    examens_actifs: number;
    total_centres: number;
    total_candidats: number;
}

export interface ProfileRow {
    id: string;
    role: UserRole;
    username: string | null;
    email_login: string;
    nom: string;
    prenom: string;
    telephone: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface SalleRow {
    id: string;
    centre_id: string;
    examen_id: string;
    nom: string;
    capacite: number;
    ordre: number;
    regle_affectation: AffectationRule;
}

export interface CentreRow {
    id: string;
    nom: string;
    code: string;
    ville: string | null;
    is_active: boolean;
    code_departement: string | null;
    code_commune: string | null;
    created_at: string;
    updated_at: string;
}

export interface EtablissementRow {
    id: string;
    code: string;
    nom: string;
    ville: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface LotRow {
    id: string;
    centre_id: string;
    examen_id: string;
    examen_discipline_id: string;
    serie_id: string | null;
    lot_numero: number;
    nb_copies: number;
    status: LotStatus;
    hmac_signature: string | null;
    generation_timestamp: string | null;
    created_at: string;
    updated_at: string;
}

export interface DisciplineRow {
    id: string;
    code: string;
    libelle: string;
    type_defaut: DisciplineType;
    created_at: string;
}

export interface SerieRow {
    id: string;
    code: string;
    libelle: string;
    ordre: number;
    created_at: string;
}

/** examen_disciplines avec jointure discipline */
export interface ExamenDisciplineDetail {
    id: string;
    examen_id: string;
    discipline_id: string;
    type: DisciplineType;
    coefficient: number;
    bareme: number;
    ordre_affichage: number;
    seuil_facultatif: number | null;
    discipline: {
        id: string;
        code: string;
        libelle: string;
    };
}

/** Statistiques rapides d'un examen (counts temps réel) */
export interface ExamenDetailStats {
    nb_candidats: number;
    nb_centres: number;
    nb_disciplines: number;
}

export interface ClasseRow {
    id: string;
    etablissement_id: string;
    serie_id: string | null;
    libelle: string;
    created_at: string;
}

/** Affectation enseignant ↔ discipline (+ classe optionnelle) */
export interface UserDisciplineRow {
    id: string;
    user_id: string;
    examen_discipline_id: string;
    classe_id: string | null;
    created_at: string;
}

/** user_disciplines enrichi avec les détails de la discipline et de la classe */
export interface UserDisciplineDetail extends UserDisciplineRow {
    examen_discipline: ExamenDisciplineDetail;
    classe: ClasseRow | null;
}

/** ExamenDisciplineDetail enrichi avec les enseignants affectés */
export interface ExamenDisciplineWithEnseignants extends ExamenDisciplineDetail {
    enseignants: Array<{
        user_discipline_id: string;
        classe_id: string | null;
        classe_libelle: string | null;
        profile: Pick<ProfileRow, 'id' | 'nom' | 'prenom' | 'email_login'>;
    }>;
}

// ─── Sprint 6C — Suivi Longitudinal ─────────────────────────────────────────

/** Une étape dans la chaîne longitudinale (un examen de la chaîne A→B→C) */
export interface EtapeLongitudinale {
    examen_id: string;
    code: string;
    annee: number;
    libelle: string;
    status: ResultatStatus | null;
    moyenne_centimes: number | null;
    numero_anonyme: string | null;
    /** 0 = examen cible (le plus récent), max = examen racine (le plus ancien) */
    depth: number;
}

/** Ligne retournée par get_suivi_longitudinal() */
export interface SuiviLongitudinalRow {
    candidat_id: string;
    racine_id: string | null;
    etablissement_id: string;
    etablissement_nom: string;
    serie_id: string | null;
    serie_code: string | null;
    classe_id: string | null;
    classe_libelle: string | null;
    numero_anonyme: string | null;
    nb_etapes: number;
    /** Étapes ordonnées du plus ancien (index 0) au plus récent (index n-1) */
    etapes: EtapeLongitudinale[];
}

export interface ImportLogRow {
    id: string;
    examen_id: string;
    etablissement_id: string;
    imported_by: string;
    fichier_nom: string | null;
    nb_candidats_fichier: number;
    nb_succes: number;
    nb_erreurs: number;
    import_legal_confirmed: boolean;
    import_legal_confirmed_at: string | null;
    import_legal_confirmed_by: string | null;
    created_at: string;
}
