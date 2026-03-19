import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';
import {
    fetchAuditLog,
    fetchConsultationsBloquees,
    debloquerConsultation,
    type AuditFilters,
} from '@/services/auditService';

export function useAuditLog(filters: AuditFilters, page: number) {
    return useQuery({
        queryKey: QUERY_KEYS.audit.list(filters, page),
        queryFn:  () => fetchAuditLog(filters, page),
        ...CACHE_STRATEGY.standard,
    });
}

export function useConsultationsBloquees(enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.audit.consultationsBloquees(),
        queryFn:  fetchConsultationsBloquees,
        enabled,
        ...CACHE_STRATEGY.frequente,
    });
}

export function useDebloquerConsultation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: debloquerConsultation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.audit.all });
        },
    });
}
