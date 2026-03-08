import { http, HttpResponse } from 'msw';

/**
 * MSW handlers — Mocks des appels Supabase/API pour les tests.
 * Ajouter des handlers spécifiques dans les fichiers de test via server.use(...)
 */
export const handlers = [
    // Handler par défaut — retourner 200 sur les endpoints Supabase connus
    http.get('*/rest/v1/examens', () => {
        return HttpResponse.json([]);
    }),
    http.get('*/rest/v1/profiles', () => {
        return HttpResponse.json([]);
    }),
];
