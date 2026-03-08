import { useQuery } from '@tanstack/react-query';
import { centreService } from '@/services/centres';
import { profileService } from '@/services/profiles';
import { QUERY_KEYS } from '@/lib/constants/queryKeys';
import { CACHE_STRATEGY } from '@/lib/constants/cacheStrategy';

/**
 * Hooks pour les Centres
 */
export function useCentres() {
    return useQuery({
        queryKey: QUERY_KEYS.centres.all,
        queryFn: () => centreService.fetchCentres(),
        ...CACHE_STRATEGY.catalogue,
    });
}

export function useMyCentres() {
    return useQuery({
        queryKey: QUERY_KEYS.centres.mine(),
        queryFn: () => centreService.fetchMyCentres(),
        ...CACHE_STRATEGY.standard,
    });
}

/**
 * Hooks pour les Profils
 */
export function useMe() {
    return useQuery({
        queryKey: QUERY_KEYS.profiles.me(),
        queryFn: () => profileService.fetchMe(),
        ...CACHE_STRATEGY.statique,
    });
}

export function useProfiles() {
    return useQuery({
        queryKey: QUERY_KEYS.profiles.all,
        queryFn: () => profileService.fetchProfiles(),
        ...CACHE_STRATEGY.standard,
    });
}
