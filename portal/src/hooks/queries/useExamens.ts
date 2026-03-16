import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examenService, type CreateExamenInput, type UpdateExamenInput, type AddDisciplineInput } from '@/services/examens';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';
import { toast } from 'sonner';
import type { ExamStatus } from '@/types/domain';

/**
 * Hooks pour la gestion des examens (M02)
 */

export function useExamens() {
    return useQuery({
        queryKey: QUERY_KEYS.examens.list(),
        queryFn: () => examenService.fetchExamens(),
        ...CACHE_STRATEGY.standard,
    });
}

/** Fonction globale pour pré-charger la liste des examens hors-composant */
export async function prefetchExamens(queryClient: ReturnType<typeof useQueryClient>) {
    return queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.examens.list(),
        queryFn: () => examenService.fetchExamens(),
        staleTime: CACHE_STRATEGY.standard.staleTime,
    });
}

export function useExamenDetail(id: string) {
    return useQuery({
        queryKey: QUERY_KEYS.examens.detail(id),
        queryFn: () => examenService.fetchExamenById(id),
        enabled: !!id,
        ...CACHE_STRATEGY.standard,
    });
}

export function useExamenStats() {
    return useQuery({
        queryKey: QUERY_KEYS.examens.stats(),
        queryFn: () => examenService.fetchExamenStats(),
        ...CACHE_STRATEGY.frequente,
    });
}

/** Fonction globale pour pré-charger les statistiques hors-composant */
export async function prefetchExamenStats(queryClient: ReturnType<typeof useQueryClient>) {
    return queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.examens.stats(),
        queryFn: () => examenService.fetchExamenStats(),
        staleTime: CACHE_STRATEGY.frequente.staleTime,
    });
}

/** Stats rapides pour un examen donné (candidats, centres, disciplines) */
export function useExamenDetailStats(examenId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.examens.detailStats(examenId),
        queryFn: () => examenService.fetchExamenDetailStats(examenId),
        enabled: !!examenId,
        ...CACHE_STRATEGY.frequente,
    });
}

/** Disciplines associées à un examen */
export function useExamenDisciplines(examenId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.examens.disciplines(examenId),
        queryFn: () => examenService.fetchExamenDisciplines(examenId),
        enabled: !!examenId,
        ...CACHE_STRATEGY.standard,
    });
}

/** Centres associés à un examen */
export function useExamenCentres(examenId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.examens.centres(examenId),
        queryFn: () => examenService.fetchExamenCentres(examenId),
        enabled: !!examenId,
        ...CACHE_STRATEGY.standard,
    });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateExamen() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateExamenInput) => examenService.createExamen(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.all });
            toast.success('Examen créé avec succès');
        },
    });
}

export function useUpdateExamen(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateExamenInput) => examenService.updateExamen(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.detail(id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.list() });
            toast.success('Examen mis à jour');
        },
    });
}

export function useTransitionPhase(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (phase: ExamStatus) => examenService.transitionnerPhase(id, phase),
        onSuccess: (_, phase) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.detail(id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.list() });
            toast.success(`Examen passé en phase : ${phase}`);
        },
    });
}

export function useDeliberation(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: string) => examenService.delibererExamen(id, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.detail(id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.list() });
            toast.success('Délibération effectuée');
        },
    });
}

export function useAddExamenDiscipline(examenId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: AddDisciplineInput) => examenService.addExamenDiscipline(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.disciplines(examenId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.detailStats(examenId) });
            toast.success('Discipline ajoutée');
        },
    });
}

export function useRemoveExamenDiscipline(examenId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (disciplineId: string) => examenService.removeExamenDiscipline(disciplineId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.disciplines(examenId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.detailStats(examenId) });
            toast.success('Discipline retirée');
        },
    });
}

export function useAddExamenCentre(examenId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (centreId: string) => examenService.addExamenCentre(examenId, centreId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.centres(examenId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.detailStats(examenId) });
            toast.success('Centre associé');
        },
    });
}

export function useRemoveExamenCentre(examenId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (centreId: string) => examenService.removeExamenCentre(examenId, centreId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.centres(examenId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.examens.detailStats(examenId) });
            toast.success('Centre dissocié');
        },
    });
}
