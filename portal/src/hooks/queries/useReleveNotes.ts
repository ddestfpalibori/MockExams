import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { fetchReleve, type FetchReleveParams, type ReleveResponse } from '@/services/releveNotesService';

// Ne jamais retenter sur les erreurs définitives
function releveRetry(failureCount: number, error: unknown): boolean {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403 || status === 404 || status === 422) return false;
    return failureCount < 2;
}

/**
 * Hook React Query pour récupérer les relevés de notes.
 * Passer null pour désactiver la requête.
 */
export function useReleveNotes(params: FetchReleveParams | null): {
    data: ReleveResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
} {
    return useQuery({
        queryKey: params
            ? QUERY_KEYS.releves.list(params.examenId, params.scope, params.scopeId, params.lotOffset)
            : ['releves', 'disabled'],
        queryFn: () => fetchReleve(params!),
        enabled: params !== null,
        staleTime: 5 * 60 * 1000,   // 5 min — données stables après délibération
        gcTime: 30 * 60 * 1000,
        retry: releveRetry,
    });
}
