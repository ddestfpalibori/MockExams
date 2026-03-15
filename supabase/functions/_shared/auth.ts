import { createClient } from 'jsr:@supabase/supabase-js@2';

export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

export async function requireAuth(req: Request): Promise<{ userId: string; role: string }> {
  const authHeader = req.headers.get('Authorization');
  console.log('[requireAuth] Authorization header present:', !!authHeader);

  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[requireAuth] Missing or invalid Bearer token');
    throw new AuthError('Token manquant');
  }

  const token = authHeader.replace('Bearer ', '');
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
