import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lotService } from '@/services/lots';
import { centreService } from '@/services/centres';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';
import { toast } from 'sonner';

/**
 * Hooks pour la gestion des lots de correction (M06)
 */

export function useLots(centreId: string, examenId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.centres.lots(centreId, examenId),
        queryFn: () => lotService.fetchLots(centreId, examenId),
        enabled: !!centreId && !!examenId,
        ...CACHE_STRATEGY.standard,
    });
}

export function useCentreStats(centreId: string) {
    return useQuery({
        queryKey: QUERY_KEYS.centres.stats(centreId),
        queryFn: () => centreService.fetchCentreStats(centreId),
        enabled: !!centreId,
        ...CACHE_STRATEGY.frequente,
    });
}

export function useCreerLots(centreId: string, examenId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: { examenDisciplineId: string; serieId?: string }) =>
            lotService.creerLots({
                centreId,
                examenId,
                examenDisciplineId: params.examenDisciplineId,
                serieId: params.serieId,
            }),
        onSuccess: (nb) => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.centres.lots(centreId, examenId),
            });
            toast.success(`${nb} lot(s) créé(s)`);
        },
    });
}

export function useSignerLot(centreId: string, examenId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (lotId: string) => lotService.signerLot(lotId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.centres.lots(centreId, examenId),
            });
            toast.success('Lot signé (signature générée)');
        },
    });
}

export function useResetLotHmac(centreId: string, examenId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (lotId: string) => lotService.resetLotHmac(lotId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.centres.lots(centreId, examenId),
            });
            toast.success('Signature réinitialisée');
        },
    });
}

export function useAffecter(centreId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (examenId: string) => centreService.affecter(centreId, examenId),
        onSuccess: (nb, examenId) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.centres.salles(centreId, examenId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.candidats.all });
            toast.success(`${nb} candidat(s) affecté(s) aux salles`);
        },
    });
}

export function useGenererAnonymats(centreId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (examenId: string) => centreService.genererAnonymats(centreId, examenId),
        onSuccess: (nb) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.candidats.all });
            toast.success(`${nb} numéro(s) anonyme(s) généré(s)`);
        },
    });
}

export function useReprendrePreparationCentre(centreId: string, examenId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: {
            centreId: string;
            examenId: string;
            mode: 'validate_only' | 'fill_only' | 'overwrite_confirmed';
            rows: Parameters<typeof centreService.reprendrePreparationCentre>[0]['rows'];
        }) => centreService.reprendrePreparationCentre(params),
        onSuccess: (result) => {
            if (result.mode !== 'validate_only') {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.candidats.all });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.centres.stats(centreId) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.centres.salles(centreId, examenId) });
                toast.success(`${result.updated} ligne(s) appliquée(s)`);
            } else {
                toast.success('Analyse terminée');
            }
        },
    });
}
