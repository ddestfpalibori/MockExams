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
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Token manquant');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );

  if (error || !user) throw new AuthError('Token invalide');

  const { data: profile, error: profileError } = await createServiceClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) throw new AuthError('Profil introuvable');

  return { userId: user.id, role: profile.role };
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
