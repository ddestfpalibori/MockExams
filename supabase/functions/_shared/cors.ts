// En production, configurer ALLOWED_ORIGIN dans les secrets Supabase :
//   supabase secrets set ALLOWED_ORIGIN=https://mock-exams-six.vercel.app
// En développement local, laisser vide → fallback '*'
const allowedOrigin =
  Deno.env.get('ALLOWED_ORIGIN') ??
  (Deno.env.get('SUPABASE_URL')?.includes('localhost') ? '*' : '*');

export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-access-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}
