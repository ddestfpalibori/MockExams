import { useQuery } from '@tanstack/react-query';
import { candidatService } from '@/services/candidats';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';
import { useState } from 'react';

/**
 * Hooks pour la gestion des candidats (M03)
 */

interface UseCandidatsParams {
    examenId: string;
    pageSize?: number;
    initialPage?: number;
    search?: string;
}

export function useCandidats({
    examenId,
    pageSize = 50,
    initialPage = 1,
    search
}: UseCandidatsParams) {
    const [page, setPage] = useState(initialPage);

    const query = useQuery({
        queryKey: QUERY_KEYS.candidats.list(examenId, page, search),
        queryFn: () => candidatService.fetchCandidats({
            examenId,
            page,
            pageSize,
            search
        }),
        enabled: !!examenId,
        ...CACHE_STRATEGY.standard,
    });

    return {
        ...query,
        data: query.data?.data || [],
        total: query.data?.count || 0,
        page,
        setPage,
    };
}
