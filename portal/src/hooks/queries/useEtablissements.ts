import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { etablissementService } from '@/services/etablissements';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getAuthHeader } from '@/lib/efInvoke';

/**
 * Hooks pour le module Chef Établissement (M05)
 */

export function useMyEtablissements() {
    return useQuery({
        queryKey: QUERY_KEYS.etablissements.mine(),
        queryFn: () => etablissementService.fetchMyEtablissements(),
        ...CACHE_STRATEGY.standard,
    });
}

export function useEtablissementStats(etablissementId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.etablissements.stats(etablissementId),
        queryFn: () => etablissementService.fetchEtablissementStats(etablissementId),
        enabled: !!etablissementId,
        ...CACHE_STRATEGY.frequente,
    });
}

export function useImportsLog(etablissementId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.etablissements.imports(etablissementId),
        queryFn: () => etablissementService.fetchImportsLog(etablissementId),
        enabled: !!etablissementId,
        ...CACHE_STRATEGY.standard,
    });
}

/** Import candidats via Edge Function verify-import (mode preview) */
export function useImportPreview() {
    return useMutation({
        mutationFn: async (params: { file: File; examenId: string; etablissementId: string }) => {
            const formData = new FormData();
            formData.append('file', params.file);
            formData.append('examen_id', params.examenId);
            formData.append('etablissement_id', params.etablissementId);
            formData.append('mode', 'preview');

            const authHeader = await getAuthHeader();
            const { data, error } = await supabase.functions.invoke<{
                nb_valides: number;
                nb_erreurs: number;
                warnings: string[];
            }>('verify-import', { body: formData, headers: authHeader });

            if (error) throw error;
            return data;
        },
    });
}

/** Import candidats via Edge Function verify-import (mode import final) */
export function useImportCandidats() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { file: File; examenId: string; etablissementId: string; idempotencyKey: string }) => {
            const formData = new FormData();
            formData.append('file', params.file);
            formData.append('examen_id', params.examenId);
            formData.append('etablissement_id', params.etablissementId);
            formData.append('mode', 'import');
            formData.append('import_legal_confirmed', 'true');
            formData.append('idempotency_key', params.idempotencyKey);

            const authHeader = await getAuthHeader();
            const { data, error } = await supabase.functions.invoke<{
                nb_succes: number;
                nb_erreurs: number;
                rapport: string[];
            }>('verify-import', { body: formData, headers: authHeader });

            if (error) throw error;
            return data;
        },
        onSuccess: (_data, params) => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.etablissements.imports(params.etablissementId),
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.candidats.all });
            toast.success('Import effectué avec succès');
        },
    });
}
