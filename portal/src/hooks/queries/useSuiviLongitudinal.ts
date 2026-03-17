/**
 * Hook TanStack Query — Suivi Longitudinal (Sprint 6C)
 */

import { useQuery } from '@tanstack/react-query';
import { fetchSuiviLongitudinal } from '@/services/suiviLongitudinal';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';

export function useSuiviLongitudinal(examenId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.suiviLongitudinal.byExamen(examenId),
        queryFn:  () => fetchSuiviLongitudinal(examenId),
        enabled:  !!examenId,
        ...CACHE_STRATEGY.standard,
    });
}
