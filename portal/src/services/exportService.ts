import { supabase } from '@/lib/supabase';
import type { ResultatStatus } from '@/types/domain';

// ── Types partagés ────────────────────────────────────────────────────────────

export interface DisciplineExport {
    id: string;
    libelle: string;
    code: string;
    coefficient: number;
    ordre: number;
}

export interface NoteExport {
    discipline_id: string;
    note_centimes: number | null;
    code_special: string | null;
}

export interface CandidatExport {
    candidat_id: string;
    numero_anonyme: string | null;
    nom: string;
    prenom: string;
    sexe: string | null;
    moyenne_centimes: number | null;
    status: ResultatStatus;
    phase: number;
    notes: NoteExport[];
}

export interface EtablissementExport {
    id: string;
    nom: string;
    candidats: CandidatExport[];
}

export interface ExportResultatsData {
    examen_id: string;
    examen_libelle: string;
    examen_annee: number;
    disciplines: DisciplineExport[];
    etablissements: EtablissementExport[];
}

// ── Export via Edge Function (accès nom/prenom + données complètes) ───────────

/**
 * Récupère toutes les données pour l'export via l'Edge Function export-results.
 * Utilisé pour Modèle B (nominatif, admin/chef_etab) et Modèle A global.
 */
export async function fetchExportData(
    examenId: string,
    etablissementId?: string,
    includeNominatif = false,
): Promise<ExportResultatsData> {
    const { data, error } = await supabase.functions.invoke('export-results', {
        body: {
            examen_id: examenId,
            ...(etablissementId ? { etablissement_id: etablissementId } : {}),
            ...(includeNominatif ? { include_nominatif: true } : {}),
        },
    });

    if (error) throw error;
    return data as ExportResultatsData;
}

