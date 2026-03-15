import { createClient } from 'jsr:@supabase/supabase-js@2';

export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

export async function requireAuth(req: Request): Promise<{ userId: string; role: string }> {
  // Try to get token from Authorization header first (fallback)
  let token = req.headers.get('Authorization')?.replace('Bearer ', '');

  // If not in header, try to extract from request body
  // (Supabase Gateway blocks Authorization header, so we pass it in body as _auth_token)
  if (!token) {
    try {
      const bodyText = await req.text();
      const body = JSON.parse(bodyText) as Record<string, unknown>;
      token = body._auth_token as string;

      // Reset request body for later use by handler
      // Note: This is a limitation of Web API - we can't re-read the body
      // So handlers should be aware that _auth_token will be present
      console.log('[requireAuth] Token extracted from body._auth_token');
    } catch (err) {
      console.error('[requireAuth] Failed to parse request body', err);
    }
  } else {
    console.log('[requireAuth] Token extracted from Authorization header');
  }

  console.log('[requireAuth] Token present:', !!token);

  if (!token) {
    console.error('[requireAuth] Missing token (not in header or body._auth_token)');
    throw new AuthError('Token manquant');
  }

  console.log('[requireAuth] Token length:', token.length);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  console.log('[requireAuth] getUser result', {
    hasUser: !!user,
    userId: user?.id ?? null,
    error: error?.message ?? null,
  });

  if (error || !user) {
    console.error('[requireAuth] Token validation failed', {
      error: error?.message,
      errorCode: (error as any)?.code,
    });
    throw new AuthError('Token invalide');
  }

  const { data: profile, error: profileError } = await createServiceClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[requireAuth] Profile not found', {
      userId: user.id,
      error: profileError?.message,
    });
    throw new AuthError('Profil introuvable');
  }

  console.log('[requireAuth] Auth successful', {
    userId: user.id,
    role: profile.role,
  });

  return { userId: user.id, role: profile.role };
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
