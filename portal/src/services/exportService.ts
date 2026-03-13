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
): Promise<ExportResultatsData> {
    const { data, error } = await supabase.functions.invoke('export-results', {
        body: {
            examen_id: examenId,
            ...(etablissementId ? { etablissement_id: etablissementId } : {}),
        },
    });

    if (error) throw error;
    return data as ExportResultatsData;
}

// ── Export Modèle A anonyme (client-side, sans nom/prenom) ───────────────────

export interface ResultatAnonymeExport {
    numero_anonyme: string | null;
    moyenne_centimes: number | null;
    status: ResultatStatus;
    phase: number;
    etablissement_nom: string;
}

/**
 * Récupère tous les résultats sans données nominatives pour l'export Modèle A.
 * Requête directe Supabase (RLS tutelle/admin autorisé).
 */
export async function fetchResultatsAnonymesPourExport(
    examenId: string,
    etablissementId?: string,
): Promise<ResultatAnonymeExport[]> {
    let query = supabase
        .from('resultats')
        .select(`
            candidat_id,
            moyenne_centimes,
            status,
            phase,
            candidats!inner(
                numero_anonyme,
                etablissement_id,
                etablissements!inner(nom)
            )
        `)
        .eq('examen_id', examenId)
        .order('candidats(numero_anonyme)');

    if (etablissementId) {
        query = query.eq('candidats.etablissement_id', etablissementId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((r) => {
        const cand = r.candidats as {
            numero_anonyme: string | null;
            etablissements: { nom: string };
        };
        return {
            numero_anonyme: cand.numero_anonyme,
            moyenne_centimes: r.moyenne_centimes,
            status: r.status as ResultatStatus,
            phase: r.phase,
            etablissement_nom: cand.etablissements.nom,
        };
    });
}
