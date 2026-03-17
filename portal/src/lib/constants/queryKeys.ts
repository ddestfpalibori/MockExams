/**
 * QUERY_KEYS — Clés hiérarchiques pour TanStack React Query
 * Structure hiérarchique pour invalidation ciblée ou globale.
 */
import type { AnalyticsFilters } from '@/services/analyticsService';

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
        assignments: (userId: string) => ['profiles', 'assignments', userId] as const,
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
    analytics: {
        all: ['analytics'] as const,
        examen: (id: string, filters?: AnalyticsFilters) =>
            ['analytics', 'examen', id, filters ?? null] as const,
    },
    releves: {
        all: ['releves'] as const,
        list: (examenId: string, scope: string, scopeId: string, offset?: number) =>
            ['releves', examenId, scope, scopeId, offset ?? 0] as const,
    },
    liens: {
        all: ['liens'] as const,
        byExamen: (examenId: string) => ['liens', 'examen', examenId] as const,
        etablissementsCommuns: (sourceId: string, cibleId: string) =>
            ['liens', 'etablissements-communs', sourceId, cibleId] as const,
    },
    enseignant: {
        all: ['enseignant'] as const,
        myDisciplines: () => ['enseignant', 'my-disciplines'] as const,
        examenEnseignants: (examenId: string) => ['enseignant', 'examen', examenId] as const,
        suivi: (examenDisciplineId: string) => ['enseignant', 'suivi', examenDisciplineId] as const,
        remediation: (examenId: string) => ['enseignant', 'remediation', examenId] as const,
    },
    classes: {
        all: ['classes'] as const,
        byEtablissement: (etablissementId: string) => ['classes', 'etab', etablissementId] as const,
    },
    suiviLongitudinal: {
        all: ['suivi-longitudinal'] as const,
        byExamen: (examenId: string) => ['suivi-longitudinal', examenId] as const,
    },
} as const;
