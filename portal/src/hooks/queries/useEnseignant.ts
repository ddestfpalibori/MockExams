/**
 * Hooks TanStack React Query — Module Enseignant (Sprint 6B)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    fetchMyDisciplines,
    fetchExamenDisciplinesWithEnseignants,
    fetchSuiviNotes,
    fetchRemediation,
    assignEnseignantDiscipline,
    removeEnseignantDiscipline,
    fetchClassesByEtablissement,
} from '@/services/enseignant';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';

// ─── Vue enseignant ────────────────────────────────────────────────────────────

/** Disciplines affectées à l'enseignant connecté */
export function useMyDisciplines() {
    return useQuery({
        queryKey: QUERY_KEYS.enseignant.myDisciplines(),
        queryFn: fetchMyDisciplines,
        ...CACHE_STRATEGY.standard,
    });
}

/** Suivi des notes pour une discipline (enseignant ou admin) */
export function useSuiviNotes(examenDisciplineId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.enseignant.suivi(examenDisciplineId),
        queryFn: () => fetchSuiviNotes(examenDisciplineId),
        enabled: !!examenDisciplineId,
        ...CACHE_STRATEGY.frequente,
    });
}

/** Candidats en difficulté pour un examen (post-délibération) */
export function useRemediation(examenId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.enseignant.remediation(examenId),
        queryFn: () => fetchRemediation(examenId),
        enabled: !!examenId,
        ...CACHE_STRATEGY.standard,
    });
}

// ─── Vue admin ─────────────────────────────────────────────────────────────────

/** Disciplines d'un examen avec leurs enseignants affectés (onglet admin) */
export function useExamenEnseignants(examenId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.enseignant.examenEnseignants(examenId),
        queryFn: () => fetchExamenDisciplinesWithEnseignants(examenId),
        enabled: !!examenId,
        ...CACHE_STRATEGY.standard,
    });
}

/** Classes d'un établissement (pour le sélecteur lors de l'affectation) */
export function useClassesByEtablissement(etablissementId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.classes.byEtablissement(etablissementId),
        queryFn: () => fetchClassesByEtablissement(etablissementId),
        enabled: !!etablissementId,
        ...CACHE_STRATEGY.catalogue,
    });
}

/**
 * Disciplines affectées à un enseignant donné (vue admin dans UtilisateursPage).
 * Retourne la liste enrichie avec examen + discipline + classe.
 */
export function useUserDisciplineAssignments(userId: string) {
    return useQuery({
        queryKey: [...QUERY_KEYS.enseignant.myDisciplines(), userId],
        queryFn: async () => {
            const { supabase } = await import('@/lib/supabase');
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
                        discipline:disciplines!inner(libelle),
                        examen:examens!inner(code, libelle, annee)
                    ),
                    classe:classes(libelle)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
        enabled: !!userId,
        ...CACHE_STRATEGY.standard,
    });
}

// ─── Mutations admin ───────────────────────────────────────────────────────────

/** Affecter un enseignant à une discipline (+classe optionnelle) */
export function useAssignEnseignantDiscipline(examenId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            userId,
            examenDisciplineId,
            classeId,
        }: {
            userId: string;
            examenDisciplineId: string;
            classeId: string | null;
        }) => assignEnseignantDiscipline(userId, examenDisciplineId, classeId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.enseignant.examenEnseignants(examenId),
            });
            // Invalider aussi les disciplines de l'enseignant concerné
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.enseignant.myDisciplines(),
            });
            toast.success('Enseignant affecté à la discipline');
        },
        onError: (error: unknown) => {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes('duplicate') || msg.includes('unique')) {
                toast.error('Cet enseignant est déjà affecté à cette discipline/classe');
            } else {
                toast.error('Erreur lors de l\'affectation');
            }
        },
    });
}

/** Retirer l'affectation d'un enseignant.
 *  examenId optionnel : si fourni, invalide uniquement cet examen ;
 *  sinon invalide toutes les queries enseignant (usage depuis UtilisateursPage). */
export function useRemoveEnseignantDiscipline(examenId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userDisciplineId: string) => removeEnseignantDiscipline(userDisciplineId),
        onSuccess: () => {
            if (examenId) {
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.enseignant.examenEnseignants(examenId),
                });
            } else {
                // Invalidation large — pas d'examenId connu (ex: UtilisateursPage)
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.enseignant.all,
                });
            }
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.enseignant.myDisciplines(),
            });
            toast.success('Affectation retirée');
        },
        onError: () => {
            toast.error('Erreur lors du retrait de l\'affectation');
        },
    });
}
