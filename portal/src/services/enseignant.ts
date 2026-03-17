/**
 * Service Enseignant — Sprint 6B
 *
 * Gestion des affectations enseignant ↔ discipline/classe
 * et récupération des données de suivi et remédiation.
 */

import { supabase } from '@/lib/supabase';
import type {
    ClasseRow,
    ExamenDisciplineWithEnseignants,
    UserDisciplineDetail,
} from '@/types/domain';

// ─── Classes ──────────────────────────────────────────────────────────────────

/** Toutes les classes d'un établissement */
export async function fetchClassesByEtablissement(etablissementId: string): Promise<ClasseRow[]> {
    const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .order('libelle');

    if (error) throw error;
    return data as ClasseRow[];
}

// ─── Affectations (admin) ──────────────────────────────────────────────────────

/**
 * Disciplines d'un examen avec leurs enseignants affectés.
 * Utilisé dans l'onglet admin "Enseignants" de ExamenDetailPage.
 */
export async function fetchExamenDisciplinesWithEnseignants(
    examenId: string,
): Promise<ExamenDisciplineWithEnseignants[]> {
    const { data, error } = await supabase
        .from('examen_disciplines')
        .select(`
            id,
            examen_id,
            discipline_id,
            type,
            coefficient,
            bareme,
            ordre_affichage,
            seuil_facultatif,
            discipline:disciplines!inner(id, code, libelle),
            user_disciplines(
                id,
                classe_id,
                classes(libelle),
                profiles!user_disciplines_user_id_fkey(id, nom, prenom, email_login)
            )
        `)
        .eq('examen_id', examenId)
        .order('ordre_affichage');

    if (error) throw error;

    return (data ?? []).map((ed) => {
        const raw = ed as unknown as Record<string, unknown>;
        const userDiscs = (raw.user_disciplines as Array<Record<string, unknown>>) ?? [];

        return {
            id: ed.id,
            examen_id: ed.examen_id,
            discipline_id: ed.discipline_id,
            type: ed.type,
            coefficient: ed.coefficient,
            bareme: ed.bareme,
            ordre_affichage: ed.ordre_affichage,
            seuil_facultatif: ed.seuil_facultatif ?? null,
            discipline: ed.discipline as ExamenDisciplineWithEnseignants['discipline'],
            enseignants: userDiscs.map((ud) => ({
                user_discipline_id: ud.id as string,
                classe_id: (ud.classe_id as string) ?? null,
                classe_libelle: ud.classes
                    ? ((ud.classes as Record<string, unknown>).libelle as string)
                    : null,
                profile: ud.profiles as ExamenDisciplineWithEnseignants['enseignants'][0]['profile'],
            })),
        } satisfies ExamenDisciplineWithEnseignants;
    });
}

/** Affecter un enseignant à une discipline (+ classe optionnelle) */
export async function assignEnseignantDiscipline(
    userId: string,
    examenDisciplineId: string,
    classeId: string | null,
): Promise<void> {
    const { error } = await supabase.from('user_disciplines').insert({
        user_id: userId,
        examen_discipline_id: examenDisciplineId,
        classe_id: classeId ?? null,
    });

    if (error) throw error;
}

/** Retirer l'affectation d'un enseignant (par l'id de la ligne user_disciplines) */
export async function removeEnseignantDiscipline(userDisciplineId: string): Promise<void> {
    const { error } = await supabase
        .from('user_disciplines')
        .delete()
        .eq('id', userDisciplineId);

    if (error) throw error;
}

// ─── Vue enseignant (données propres à l'enseignant connecté) ─────────────────

/**
 * Disciplines affectées à l'enseignant connecté, groupées par examen.
 * Utilisé dans EnseignantDashboard.
 */
export async function fetchMyDisciplines(): Promise<UserDisciplineDetail[]> {
    const { data, error } = await supabase
        .from('user_disciplines')
        .select(`
            id,
            user_id,
            examen_discipline_id,
            classe_id,
            created_at,
            examen_discipline:examen_disciplines!inner(
                id,
                examen_id,
                discipline_id,
                type,
                coefficient,
                bareme,
                ordre_affichage,
                seuil_facultatif,
                discipline:disciplines!inner(id, code, libelle),
                examen:examens!inner(id, code, libelle, annee, status, seuil_phase1, seuil_phase2)
            ),
            classe:classes(id, etablissement_id, serie_id, libelle, created_at)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as UserDisciplineDetail[];
}

// ─── Suivi des notes ───────────────────────────────────────────────────────────

export interface LotSuivi {
    lot_id: string;
    lot_numero: number;
    centre_nom: string;
    serie_code: string | null;
    nb_copies: number;
    nb_saisies: number;
    nb_verifies: number;
    nb_abs: number;
    status: string;
}

/**
 * Statistiques de saisie de notes pour une discipline.
 * Utilisé dans SuiviNotesPage.
 */
export async function fetchSuiviNotes(examenDisciplineId: string): Promise<LotSuivi[]> {
    const { data, error } = await supabase
        .from('lots')
        .select(`
            id,
            lot_numero,
            nb_copies,
            status,
            serie_id,
            centre:centres!inner(nom),
            serie:series(code),
            saisies(id, code_special)
        `)
        .eq('examen_discipline_id', examenDisciplineId)
        .order('lot_numero');

    if (error) throw error;

    return (data ?? []).map((lot) => {
        const raw = lot as unknown as Record<string, unknown>;
        const saisies = (raw.saisies as Array<{ id: string; code_special: string | null }>) ?? [];

        return {
            lot_id: lot.id,
            lot_numero: lot.lot_numero,
            centre_nom: (raw.centre as { nom: string }).nom,
            serie_code: raw.serie ? (raw.serie as { code: string }).code : null,
            nb_copies: lot.nb_copies,
            nb_saisies: saisies.length,
            nb_verifies: saisies.filter((s) => !s.code_special).length,
            nb_abs: saisies.filter((s) => s.code_special === 'ABS' || s.code_special === 'ABD').length,
            status: lot.status,
        } satisfies LotSuivi;
    });
}

// ─── Remédiation ──────────────────────────────────────────────────────────────

export interface RemediationCandidat {
    candidat_id: string;
    numero_anonyme: string | null;
    etablissement_nom: string;
    serie_code: string | null;
    classe_libelle: string | null;
    moyenne_centimes: number | null;
    statut: string;
    admissible_phase1: boolean | null;
}

/**
 * Candidats en difficulté (NON_ADMIS ou RATTRAPAGE) pour un examen.
 * Utilisé dans RemediationPage — uniquement disponible post-délibération.
 */
export async function fetchRemediation(examenId: string): Promise<RemediationCandidat[]> {
    const { data, error } = await supabase
        .from('resultats')
        .select(`
            candidat_id,
            status,
            moyenne_centimes,
            admissible_phase1,
            candidat:candidats!inner(
                numero_anonyme,
                serie_id,
                classe_id,
                serie:series(code),
                classe:classes(libelle),
                etablissement:etablissements!inner(nom)
            )
        `)
        .eq('examen_id', examenId)
        .in('status', ['NON_ADMIS', 'RATTRAPAGE'])
        .order('moyenne_centimes', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((r) => {
        const raw = r as unknown as Record<string, unknown>;
        const candidat = raw.candidat as Record<string, unknown>;

        return {
            candidat_id: r.candidat_id,
            numero_anonyme: (candidat.numero_anonyme as string) ?? null,
            etablissement_nom: (candidat.etablissement as { nom: string }).nom,
            serie_code: candidat.serie ? (candidat.serie as { code: string }).code : null,
            classe_libelle: candidat.classe
                ? (candidat.classe as { libelle: string }).libelle
                : null,
            moyenne_centimes: r.moyenne_centimes,
            statut: r.status,
            admissible_phase1: r.admissible_phase1 ?? null,
        } satisfies RemediationCandidat;
    });
}
