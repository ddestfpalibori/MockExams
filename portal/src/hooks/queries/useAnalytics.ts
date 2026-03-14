import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { fetchAnalytics } from '@/services/analyticsService';

// Ne jamais retenter sur 401/403/404 — l'erreur est définitive.
// Retenter jusqu'à 2 fois sur les erreurs transitoires (timeout réseau, 5xx).
function analyticsRetry(failureCount: number, error: unknown): boolean {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403 || status === 404) return false;
    return failureCount < 2;
}

export function useAnalytics(examenId: string | null) {
    return useQuery({
        queryKey: QUERY_KEYS.analytics.examen(examenId ?? ''),
        queryFn: () => fetchAnalytics(examenId!),
        enabled: !!examenId,
        staleTime: 5 * 60 * 1000,   // 5 min — données stables après délibération
        gcTime: 30 * 60 * 1000,
        retry: analyticsRetry,
    });
}
