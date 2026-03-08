import { useQuery } from '@tanstack/react-query';
import { catalogueService } from '@/services/catalogue';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';

/**
 * Hooks pour les données de référence du catalogue (disciplines, séries).
 * Données quasi-statiques — cache très long.
 */

export function useDisciplines() {
    return useQuery({
        queryKey: QUERY_KEYS.disciplines.all,
        queryFn: () => catalogueService.fetchDisciplines(),
        ...CACHE_STRATEGY.statique,
    });
}

export function useSeries() {
    return useQuery({
        queryKey: QUERY_KEYS.series.all,
        queryFn: () => catalogueService.fetchSeries(),
        ...CACHE_STRATEGY.statique,
    });
}
