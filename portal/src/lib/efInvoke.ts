import { supabase } from './supabase';

/** Récupère le header Authorization avec un token garanti frais (refresh si expiré). */
async function resolveAuthHeader(): Promise<{ Authorization: string }> {
    let { data: { session } } = await supabase.auth.getSession();

    const isExpired = session?.expires_at
        ? session.expires_at * 1000 < Date.now()
        : !session;

    if (isExpired) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed.session;
    }

    if (!session?.access_token) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Wrapper autour de supabase.functions.invoke qui garantit l'envoi
 * du header Authorization avec le token de session courant.
 * Lève une erreur explicite si la session est absente.
 */
export async function efInvoke<T = unknown>(
    functionName: string,
    body?: Record<string, unknown>,
): Promise<T> {
    const authHeader = await resolveAuthHeader();

    const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers: authHeader,
    });

    if (error) throw error;
    return data as T;
}

/**
 * Pour les appels EF avec FormData (corps non-JSON).
 * Retourne le header Authorization prêt à être passé dans headers.
 */
export { resolveAuthHeader as getAuthHeader };
