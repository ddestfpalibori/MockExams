/**
 * Edge Function : sign-lot
 * US-12 — Génération HMAC pour métadonnées lot Excel
 *
 * Appelée par : ADMIN uniquement (phase CORRECTION)
 * Rôle : signer les métadonnées _meta d'un lot avant génération du fichier Excel
 *
 * POST /functions/v1/sign-lot
 * Body : SignLotRequest
 * Réponse : SignLotResponse
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { requireAuth, AuthError } from '../_shared/auth.ts';
import { signLotMeta, LotMeta } from '../_shared/hmac.ts';

// ─── Contrat API ──────────────────────────────────────────────────────────────

interface SignLotRequest {
  centre_id: string;
  examen_id: string;
  /** lots.examen_discipline_id */
  matiere_id: string;
  serie_id: string;
  /** '' si pas d'option facultative */
  option_id: string;
  lot_numero: number;
  /** lots.nb_copies — nombre de copies dans CE lot (≠ total élèves du centre) */
  nb_copies: number;
  generation_timestamp: string; // ISO 8601
}

interface SignLotResponse {
  hmac_signature: string;
  generation_timestamp: string;
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

function validateRequest(body: unknown): SignLotRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Corps de requête invalide');
  }

  const b = body as Record<string, unknown>;
  const required = ['centre_id', 'examen_id', 'matiere_id', 'serie_id', 'option_id', 'lot_numero', 'nb_copies', 'generation_timestamp'];

  for (const field of required) {
    if (b[field] === undefined || b[field] === null) {
      throw new ValidationError(`Champ requis manquant : ${field}`);
    }
  }

  if (typeof b.lot_numero !== 'number' || b.lot_numero < 1) {
    throw new ValidationError('lot_numero doit être un entier ≥ 1');
  }
  if (typeof b.nb_copies !== 'number' || b.nb_copies < 1) {
    throw new ValidationError('nb_copies doit être un entier ≥ 1');
  }
  if (isNaN(new Date(b.generation_timestamp as string).getTime())) {
    throw new ValidationError('generation_timestamp invalide — format ISO 8601 requis');
  }

  return b as unknown as SignLotRequest;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const { role } = await requireAuth(req);
    if (role !== 'admin') {
      return json({ error: 'Accès refusé — rôle admin requis', code: 'FORBIDDEN' }, 403);
    }

    const input = validateRequest(await req.json());

    const meta: LotMeta = {
      centre_id: input.centre_id,
      examen_id: input.examen_id,
      matiere_id: input.matiere_id,
      serie_id: input.serie_id,
      option_id: input.option_id,
      lot_numero: input.lot_numero,
      nb_copies: input.nb_copies,
      generation_timestamp: input.generation_timestamp,
    };

    return json({ hmac_signature: await signLotMeta(meta), generation_timestamp: input.generation_timestamp }, 200);
  } catch (err) {
    if (err instanceof AuthError) {
      return json({ error: err.message, code: 'UNAUTHORIZED' }, 401);
    }
    if (err instanceof ValidationError) {
      return json({ error: err.message, code: 'VALIDATION_ERROR' }, 400);
    }
    console.error('[sign-lot] Erreur inattendue:', err);
    return json({ error: 'Erreur interne', code: 'INTERNAL_ERROR' }, 500);
  }
});

function json(body: SignLotResponse | ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
