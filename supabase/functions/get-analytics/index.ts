/**
 * Edge Function : get-analytics
 * M13 — Analyses multidimensionnelles des résultats d'examen
 *
 * Accès : admin | tutelle | chef_etablissement | chef_centre
 *
 * POST /functions/v1/get-analytics
 * Body : {
 *   examen_id: string,
 *   centre_id?: string,          // optionnel — scopé auto pour chef_centre
 *   etablissement_id?: string,   // optionnel — scopé auto pour chef_etablissement
 *   code_commune?: string,       // optionnel — admin/tutelle uniquement
 * }
 *
 * Réponse JSON : résultat de get_analytics_examen(...)
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { requireAuth, createServiceClient, AuthError } from '../_shared/auth.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsRequest {
  examen_id: string;
  centre_id?: string;
  etablissement_id?: string;
  code_commune?: string;
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
  const result: AnalyticsRequest = { examen_id: b.examen_id };
  if (b.centre_id && typeof b.centre_id === 'string') {
    result.centre_id = b.centre_id;
  }
  if (b.etablissement_id && typeof b.etablissement_id === 'string') {
    result.etablissement_id = b.etablissement_id;
  }
  if (b.code_commune && typeof b.code_commune === 'string') {
    result.code_commune = b.code_commune;
  }
  return result;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errJson({ error: 'Méthode non autorisée', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const { userId, role } = await requireAuth(req);

    if (role !== 'admin' && role !== 'tutelle' && role !== 'chef_etablissement' && role !== 'chef_centre') {
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

    // ── Résolution des filtres selon le rôle ─────────────────────────────────

    let resolvedCentreId: string | null = null;
    let resolvedEtabId: string | null = null;
    let resolvedCommune: string | null = null;

    if (role === 'chef_centre') {
      // Récupère les centres affectés à cet utilisateur
      const { data: assignments, error: assignErr } = await supabase
        .from('user_centres')
        .select('centre_id')
        .eq('user_id', userId);

      if (assignErr) throw assignErr;

      const centreIds = (assignments ?? []).map((a: { centre_id: string }) => a.centre_id);

      if (centreIds.length === 0) {
        return errJson({ error: 'Aucun centre affecté à cet utilisateur', code: 'FORBIDDEN' }, 403);
      }

      if (input.centre_id) {
        // Vérifier que le centre demandé est bien dans les centres affectés
        if (!centreIds.includes(input.centre_id)) {
          return errJson({ error: 'Accès refusé à ce centre', code: 'FORBIDDEN' }, 403);
        }
        resolvedCentreId = input.centre_id;
      } else {
        // Scope automatique sur le premier centre affecté
        resolvedCentreId = centreIds[0];
      }
    } else if (role === 'chef_etablissement') {
      // Récupère les établissements affectés à cet utilisateur
      const { data: assignments, error: assignErr } = await supabase
        .from('user_etablissements')
        .select('etablissement_id')
        .eq('user_id', userId);

      if (assignErr) throw assignErr;

      const etabIds = (assignments ?? []).map((a: { etablissement_id: string }) => a.etablissement_id);

      if (etabIds.length === 0) {
        return errJson({ error: 'Aucun établissement affecté à cet utilisateur', code: 'FORBIDDEN' }, 403);
      }

      if (input.etablissement_id) {
        if (!etabIds.includes(input.etablissement_id)) {
          return errJson({ error: 'Accès refusé à cet établissement', code: 'FORBIDDEN' }, 403);
        }
        resolvedEtabId = input.etablissement_id;
      } else {
        resolvedEtabId = etabIds[0];
      }
    } else {
      // admin ou tutelle : utiliser les filtres demandés tels quels
      resolvedCentreId = input.centre_id ?? null;
      resolvedEtabId = input.etablissement_id ?? null;
      resolvedCommune = input.code_commune ?? null;
    }

    // ── Appel de la fonction PostgreSQL ──────────────────────────────────────
    const { data, error: rpcError } = await supabase.rpc('get_analytics_examen', {
      p_examen_id: input.examen_id,
      p_centre_id: resolvedCentreId,
      p_etablissement_id: resolvedEtabId,
      p_code_commune: resolvedCommune,
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
