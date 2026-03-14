/**
 * Edge Function : get-analytics
 * M13 — Analyses multidimensionnelles des résultats d'examen
 *
 * Accès : admin | tutelle
 *
 * POST /functions/v1/get-analytics
 * Body : { examen_id: string }
 *
 * Réponse JSON : résultat de get_analytics_examen(examen_id)
 * (global, distribution, par_discipline, par_serie, par_sexe,
 *  par_etablissement, par_centre, par_milieu)
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { requireAuth, createServiceClient, AuthError } from '../_shared/auth.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsRequest {
  examen_id: string;
}

interface ErrorResponse {
  error: string;
  code: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateRequest(body: unknown): AnalyticsRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Corps de requête invalide');
  }
  const b = body as Record<string, unknown>;
  if (!b.examen_id || typeof b.examen_id !== 'string') {
    throw new ValidationError('examen_id requis');
  }
  return { examen_id: b.examen_id };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errJson({ error: 'Méthode non autorisée', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const { role } = await requireAuth(req);

    if (role !== 'admin' && role !== 'tutelle') {
      return errJson({ error: 'Accès refusé', code: 'FORBIDDEN' }, 403);
    }

    const input = validateRequest(await req.json());
    const supabase = createServiceClient();

    // ── Vérifier que l'examen existe et est dans un état approprié ──────────
    const { data: examen, error: examenError } = await supabase
      .from('examens')
      .select('id, status')
      .eq('id', input.examen_id)
      .single();

    if (examenError || !examen) {
      return errJson({ error: 'Examen introuvable', code: 'EXAMEN_NOT_FOUND' }, 404);
    }

    const statusAnalysables = [
      'DELIBERE',
      'PUBLIE',
      'CLOS',
      'CORRECTION_POST_DELIBERATION',
    ];

    if (!statusAnalysables.includes(examen.status)) {
      return errJson(
        { error: 'Analyses disponibles uniquement pour les examens délibérés', code: 'EXAMEN_STATUS_INVALID' },
        422,
      );
    }

    // ── Appel de la fonction PostgreSQL ──────────────────────────────────────
    const { data, error: rpcError } = await supabase.rpc('get_analytics_examen', {
      p_examen_id: input.examen_id,
    });

    if (rpcError) {
      console.error('[get-analytics] Erreur RPC:', rpcError);
      // P0002 = examen introuvable dans la fonction PG
      if (rpcError.code === 'P0002') {
        return errJson({ error: 'Examen introuvable', code: 'EXAMEN_NOT_FOUND' }, 404);
      }
      throw rpcError;
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    if (err instanceof AuthError) {
      return errJson({ error: err.message, code: 'UNAUTHORIZED' }, 401);
    }
    if (err instanceof ValidationError) {
      return errJson({ error: err.message, code: 'VALIDATION_ERROR' }, 400);
    }
    console.error('[get-analytics] Erreur inattendue:', err);
    return errJson({ error: 'Erreur interne', code: 'INTERNAL_ERROR' }, 500);
  }
});

function errJson(body: ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
