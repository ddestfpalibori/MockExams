import { supabase } from './supabase';

/**
 * Récupère le token JWT frais depuis la session Supabase.
 * Rafraîchit automatiquement si le token est expiré.
 */
async function resolveToken(): Promise<string> {
    let { data: { session } } = await supabase.auth.getSession();

    const isExpired = session?.expires_at
        ? session.expires_at * 1000 < Date.now()
        : !session;

    if (isExpired) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        session = refreshed?.session ?? null;
    }

    if (!session?.access_token) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    return session.access_token;
}

/**
 * Wrapper autour des appels aux Edge Functions Supabase.
 * Passe le JWT via le header x-access-token (contournement : Supabase
 * Gateway bloque Authorization avant de transmettre à l'EF).
 * Les EFs sont déployées avec --no-verify-jwt et vérifient le token elles-mêmes.
 */
export async function efInvoke<T = unknown>(
    functionName: string,
    body?: Record<string, unknown>,
): Promise<T> {
    const token = await resolveToken();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-access-token': `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
    }

    return response.json() as T;
}

/**
 * Pour les appels EF avec FormData (corps non-JSON).
 * Retourne le header Authorization prêt à être passé dans headers.
 */
export async function getAuthHeader(): Promise<{ Authorization: string }> {
    const token = await resolveToken();
    return { Authorization: `Bearer ${token}` };
}
