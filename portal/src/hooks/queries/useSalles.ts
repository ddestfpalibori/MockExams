import { useQuery } from '@tanstack/react-query';
import { centreService } from '@/services/centres';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';

export function useSalles(centreId: string, examenId?: string) {
    return useQuery({
        queryKey: QUERY_KEYS.centres.salles(centreId, examenId),
        queryFn: () => centreService.fetchSalles(centreId, examenId),
        enabled: !!centreId,
        ...CACHE_STRATEGY.standard,
    });
}
