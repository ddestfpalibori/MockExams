/**
 * CACHE_STRATEGY — Stratégies de cache par type de donnée
 * Adapter staleTime/gcTime selon la fréquence de changement des données.
 */
const ONE_MIN = 60_000;
const ONE_HOUR = 60 * ONE_MIN;
const ONE_DAY = 24 * ONE_HOUR;

export const CACHE_STRATEGY = {
    /** Données temps réel : saisies de notes, statuts d'examen */
    realtime: { staleTime: 30_000, gcTime: ONE_HOUR },
    /** Données fréquentes : dashboards, statistiques */
    frequente: { staleTime: 2 * ONE_MIN, gcTime: ONE_DAY },
    /** Données standard : examens, candidats */
    standard: { staleTime: 5 * ONE_MIN, gcTime: ONE_DAY },
    /** Catalogue : centres, disciplines (peu modifiés) */
    catalogue: { staleTime: 30 * ONE_MIN, gcTime: 7 * ONE_DAY },
    /** Données statiques : séries, paramètres système */
    statique: { staleTime: ONE_DAY, gcTime: 7 * ONE_DAY },
} as const;
