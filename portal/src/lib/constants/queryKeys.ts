/**
 * QUERY_KEYS — Clés hiérarchiques pour TanStack React Query
 * Structure hiérarchique pour invalidation ciblée ou globale.
 */
export const QUERY_KEYS = {
    examens: {
        all: ['examens'] as const,
        list: () => ['examens', 'list'] as const,
        detail: (id: string) => ['examens', 'detail', id] as const,
        stats: () => ['examens', 'stats'] as const,
        detailStats: (id: string) => ['examens', 'detailStats', id] as const,
        disciplines: (id: string) => ['examens', 'disciplines', id] as const,
        centres: (id: string) => ['examens', 'centres', id] as const,
    },
    candidats: {
        all: ['candidats'] as const,
        list: (examenId: string, page: number, search?: string) =>
            ['candidats', 'list', examenId, page, search] as const,
    },
    centres: {
        all: ['centres'] as const,
        mine: () => ['centres', 'mine'] as const,
        salles: (centreId: string, examenId?: string) =>
            ['centres', 'salles', centreId, examenId] as const,
        lots: (centreId: string, examenId: string) =>
            ['centres', 'lots', centreId, examenId] as const,
        stats: (centreId: string) => ['centres', 'stats', centreId] as const,
    },
    etablissements: {
        all: ['etablissements'] as const,
        mine: () => ['etablissements', 'mine'] as const,
        imports: (etablissementId: string) =>
            ['etablissements', 'imports', etablissementId] as const,
        stats: (etablissementId: string) =>
            ['etablissements', 'stats', etablissementId] as const,
    },
    profiles: {
        all: ['profiles'] as const,
        list: () => ['profiles', 'list'] as const,
        me: () => ['profiles', 'me'] as const,
    },
    resultats: {
        all: ['resultats'] as const,
        list: (examenId: string) => ['resultats', 'list', examenId] as const,
    },
    disciplines: {
        all: ['disciplines'] as const,
    },
    series: {
        all: ['series'] as const,
    },
} as const;
