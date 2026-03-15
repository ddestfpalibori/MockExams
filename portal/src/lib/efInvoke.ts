import { supabase } from './supabase';

/** Récupère le header Authorization avec un token garanti frais (refresh si expiré). */
async function resolveAuthHeader(): Promise<{ Authorization: string }> {
    const start = Date.now();
    let { data: { session } } = await supabase.auth.getSession();

    const sessionInfo = {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        hasRefreshToken: !!session?.refresh_token,
        accessTokenLength: session?.access_token?.length ?? 0,
        expiresAt: session?.expires_at ?? null,
        nowSeconds: Math.floor(Date.now() / 1000),
    };

    console.log('[efInvoke] getSession', sessionInfo);

    const isExpired = session?.expires_at
        ? session.expires_at * 1000 < Date.now()
        : !session;

    if (isExpired) {
        console.log('[efInvoke] token expired or missing, attempting refresh...');
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        console.log('[efInvoke] refreshSession result', {
            hasSession: !!refreshed?.session,
            hasAccessToken: !!refreshed?.session?.access_token,
            hasRefreshToken: !!refreshed?.session?.refresh_token,
            accessTokenLength: refreshed?.session?.access_token?.length ?? 0,
            newExpiresAt: refreshed?.session?.expires_at ?? null,
            error: refreshError?.message ?? null,
        });
        session = refreshed?.session ?? null;
    }

    if (!session?.access_token) {
        console.error('[efInvoke] NO ACCESS TOKEN', {
            hasSession: !!session,
            expiresAt: session?.expires_at ?? null,
        });
        throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    const header = { Authorization: `Bearer ${session.access_token}` };
    console.log('[efInvoke] resolved header', {
        hasAuthorization: !!header.Authorization,
        authLength: header.Authorization.length,
        elapsed: `${Date.now() - start}ms`,
    });

    return header;
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
    let authHeader: { Authorization: string } | null = null;
    try {
        authHeader = await resolveAuthHeader();
    } catch (err) {
        console.error('[efInvoke] Failed to resolve auth header', err);
        throw err;
    }

    if (!authHeader?.Authorization) {
        throw new Error('[efInvoke] Authorization header is missing after resolveAuthHeader()');
    }

    console.log('[efInvoke] About to invoke', {
        functionName,
        authorizationHeaderPresent: !!authHeader.Authorization,
        authHeaderLength: authHeader.Authorization.length,
    });

    // Use fetch() directly instead of supabase.functions.invoke()
    // because invoke() doesn't properly pass custom headers
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${supabaseUrl}/functions/v1/${functionName}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader.Authorization,
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        console.log('[efInvoke] fetch response', {
            functionName,
            status: response.status,
            statusText: response.statusText,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[efInvoke] fetch error', {
                functionName,
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText,
            });
            throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
        }

        const data = await response.json() as T;
        console.log('[efInvoke] invoke success', { functionName });
        return data;
    } catch (err) {
        console.error('[efInvoke] fetch failed', {
            functionName,
            error: err instanceof Error ? err.message : String(err),
        });
        throw err;
    }
}

/**
 * Pour les appels EF avec FormData (corps non-JSON).
 * Retourne le header Authorization prêt à être passé dans headers.
 */
export { resolveAuthHeader as getAuthHeader };
