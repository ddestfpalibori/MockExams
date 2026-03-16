import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { fetchAnalytics, type AnalyticsFilters } from '@/services/analyticsService';

// Ne jamais retenter sur les erreurs définitives :
// 401/403/404 = droits ou ressource absente, 422 = statut examen invalide (non délibéré).
// Retenter jusqu'à 2 fois sur les erreurs transitoires (timeout réseau, 5xx).
function analyticsRetry(failureCount: number, error: unknown): boolean {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403 || status === 404 || status === 422) return false;
    return failureCount < 2;
}

export function useAnalytics(examenId: string | null, filters?: AnalyticsFilters) {
    // Normalise un objet filtre vide vers undefined pour une clé de cache stable
    const normalized = filters && (filters.centre_id || filters.etablissement_id || filters.code_commune)
        ? filters
        : undefined;

    return useQuery({
        queryKey: QUERY_KEYS.analytics.examen(examenId ?? '', normalized),
        queryFn: () => fetchAnalytics(examenId!, normalized),
        enabled: !!examenId,
        staleTime: 5 * 60 * 1000,   // 5 min — données stables après délibération
        gcTime: 30 * 60 * 1000,
        retry: analyticsRetry,
    });
}
