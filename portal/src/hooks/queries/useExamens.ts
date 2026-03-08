import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examenService, type CreateExamenInput, type UpdateExamenInput } from '@/services/examens';
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

/** Mutations */

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
