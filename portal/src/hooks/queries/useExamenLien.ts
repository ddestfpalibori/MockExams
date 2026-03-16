import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    examenLiensService,
    type CreateLienInput,
    type UpdateLienInput,
} from '@/services/examenLiens';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';

/**
 * Hooks pour la gestion des liens inter-examens (Sprint 5D)
 */

/** Récupère le lien source d'un examen cible */
export function useExamenLien(examenId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.liens.byExamen(examenId),
        queryFn: () => examenLiensService.fetchLienByExamenCible(examenId),
        enabled: !!examenId,
        ...CACHE_STRATEGY.standard,
    });
}

/** Récupère les établissements communs entre deux examens */
export function useEtablissementsCommuns(
    examenSourceId: string | null,
    examenCibleId: string,
) {
    return useQuery({
        queryKey: QUERY_KEYS.liens.etablissementsCommuns(examenSourceId ?? '', examenCibleId),
        queryFn: () =>
            examenLiensService.fetchEtablissementsCommuns(examenSourceId!, examenCibleId),
        enabled: !!examenSourceId && !!examenCibleId,
        ...CACHE_STRATEGY.standard,
    });
}

/** Crée un lien inter-examens */
export function useCreateExamenLien(examenCibleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateLienInput) => examenLiensService.createLien(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.liens.byExamen(examenCibleId) });
        },
    });
}

/** Met à jour un lien inter-examens */
export function useUpdateExamenLien(examenCibleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateLienInput }) =>
            examenLiensService.updateLien(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.liens.byExamen(examenCibleId) });
        },
    });
}

/** Supprime un lien inter-examens */
export function useDeleteExamenLien(examenCibleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => examenLiensService.deleteLien(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.liens.byExamen(examenCibleId) });
        },
    });
}

/** Déclenche la copie des candidats depuis le lien */
export function useCopierCandidats(examenCibleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (lienId: string) => examenLiensService.copierCandidats(lienId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.candidats.all });
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.examens.detailStats(examenCibleId),
            });
        },
    });
}
