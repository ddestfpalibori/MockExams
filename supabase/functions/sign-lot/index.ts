/**
 * Edge Function : sign-lot
 * US-12 — Génération HMAC pour métadonnées lot Excel
 *
 * Appelée par : ADMIN uniquement (phase CORRECTION)
 * Rôle : signer les métadonnées _meta d'un lot avant génération du fichier Excel
 *
 * POST /functions/v1/sign-lot
 * Body : { lot_id: string, generation_timestamp?: string }
 * Réponse : SignLotResponse
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { requireAuth, createServiceClient, AuthError } from '../_shared/auth.ts';
import { signLotMeta, LotMeta } from '../_shared/hmac.ts';

// ─── Contrat API ──────────────────────────────────────────────────────────────

interface SignLotRequest {
  lot_id: string;
  generation_timestamp?: string; // ISO 8601 (optionnel)
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
  const required = ['lot_id'];

  for (const field of required) {
    if (b[field] === undefined || b[field] === null) {
      throw new ValidationError(`Champ requis manquant : ${field}`);
    }
  }

  if (typeof b.lot_id !== 'string' || b.lot_id.trim().length < 10) {
    throw new ValidationError('lot_id invalide');
  }
  if (b.generation_timestamp !== undefined) {
    if (typeof b.generation_timestamp !== 'string' ||
        isNaN(new Date(b.generation_timestamp).getTime())) {
      throw new ValidationError('generation_timestamp invalide — format ISO 8601 requis');
    }
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
    const { userId, role } = await requireAuth(req);
    if (role !== 'admin' && role !== 'chef_centre') {
      return json({ error: 'Accès refusé', code: 'FORBIDDEN' }, 403);
    }

    const input = validateRequest(await req.json());
    const supabase = createServiceClient();

    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select('id, centre_id, examen_id, examen_discipline_id, serie_id, lot_numero, nb_copies, status, hmac_signature')
      .eq('id', input.lot_id)
      .single();

    if (lotError || !lot) {
      return json({ error: 'Lot introuvable', code: 'LOT_NOT_FOUND' }, 404);
    }
    if (lot.status !== 'EN_ATTENTE') {
      return json({ error: 'Lot non signable (statut invalide)', code: 'LOT_STATUS_INVALID' }, 422);
    }
    if (lot.hmac_signature) {
      return json({ error: 'Lot déjà signé', code: 'LOT_ALREADY_SIGNED' }, 409);
    }
    if (lot.nb_copies < 1) {
      return json({ error: 'Lot vide — aucune copie à signer', code: 'LOT_EMPTY' }, 422);
    }

    if (role === 'chef_centre') {
      const { data: access } = await supabase
        .from('user_centres')
        .select('centre_id')
        .eq('user_id', userId)
        .eq('centre_id', lot.centre_id)
        .single();

      if (!access) {
        return json({ error: 'Ce centre ne vous est pas affecté', code: 'CENTRE_ACCESS_DENIED' }, 403);
      }
    }

    const { data: discipline, error: discError } = await supabase
      .from('examen_disciplines')
      .select('type')
      .eq('id', lot.examen_discipline_id)
      .single();

    if (discError || !discipline) {
      return json({ error: 'Discipline introuvable', code: 'DISCIPLINE_NOT_FOUND' }, 404);
    }

    const generation_timestamp = input.generation_timestamp ?? new Date().toISOString();
    const option_id = discipline.type === 'facultatif' ? lot.examen_discipline_id : '';
    const serie_id = lot.serie_id ?? '';

    const meta: LotMeta = {
      centre_id: lot.centre_id,
      examen_id: lot.examen_id,
      matiere_id: lot.examen_discipline_id,
      serie_id,
      option_id,
      lot_numero: lot.lot_numero,
      nb_copies: lot.nb_copies,
      generation_timestamp,
    };

    const hmac_signature = await signLotMeta(meta);

    const { data: updated, error: updateError } = await supabase
      .from('lots')
      .update({ hmac_signature, generation_timestamp })
      .eq('id', lot.id)
      .eq('status', 'EN_ATTENTE')
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('[sign-lot] Erreur mise à jour lot:', updateError);
      return json({ error: 'Erreur lors de la signature du lot', code: 'LOT_UPDATE_ERROR' }, 500);
    }
    if (!updated) {
      return json({ error: 'Lot non signable (statut invalide)', code: 'LOT_STATUS_INVALID' }, 422);
    }

    return json({ hmac_signature, generation_timestamp }, 200);
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
