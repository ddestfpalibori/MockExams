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

/** Colonnes candidats non-sensibles (sans PII chiffrées) */
export interface CandidatRow {
    id: string;
    numero_anonyme: string | null;
    serie_id: string | null;
    centre_id: string | null;
    salle_id: string | null;
    numero_table: number | null;
}

export interface ExamenRow {
    id: string;
    code: string;
    libelle: string;
    annee: number;
    status: ExamStatus;
    mode_deliberation: Database['public']['Enums']['deliberation_mode'];
    seuil_phase1: number;
    seuil_phase2: number | null;
    seuil_rattrapage: number | null;
    oral_actif: boolean;
    eps_active: boolean;
    facultatif_actif: boolean;
    rattrapage_actif: boolean;
    created_at: string;
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
