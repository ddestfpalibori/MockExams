import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { resultatService } from '@/services/resultats';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';
import type { ResultatStatus } from '@/types/domain';

export function useResultats(params: {
    examenId: string;
    pageSize?: number;
    statusFilter?: ResultatStatus;
}) {
    const [page, setPage] = useState(1);
    const pageSize = params.pageSize ?? 50;

    const query = useQuery({
        queryKey: [...QUERY_KEYS.resultats.list(params.examenId), page, params.statusFilter],
        queryFn: () => resultatService.fetchResultats({
            examenId: params.examenId,
            page,
            pageSize,
            statusFilter: params.statusFilter,
        }),
        enabled: !!params.examenId,
        ...CACHE_STRATEGY.standard,
    });

    return {
        ...query,
        data: query.data?.data ?? [],
        total: query.data?.count ?? 0,
        page,
        setPage,
    };
}
