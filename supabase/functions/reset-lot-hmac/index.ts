/**
 * Edge Function : reset-lot-hmac
 * Admin-only — remet un lot en etat non signe (hmac_signature + generation_timestamp = NULL)
 *
 * POST /functions/v1/reset-lot-hmac
 * Body : { lot_id: string }
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { requireAuth, createServiceClient, AuthError } from '../_shared/auth.ts';

interface ResetLotHmacRequest {
  lot_id: string;
}

interface SuccessResponse {
  message: string;
}

interface ErrorResponse {
  error: string;
  code: string;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateRequest(body: unknown): ResetLotHmacRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Corps de requête invalide');
  }

  const b = body as Record<string, unknown>;
  if (b.lot_id === undefined || b.lot_id === null) {
    throw new ValidationError('Champ requis manquant : lot_id');
  }
  if (typeof b.lot_id !== 'string' || b.lot_id.trim().length < 10) {
    throw new ValidationError('lot_id invalide');
  }

  return { lot_id: b.lot_id };
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const { role } = await requireAuth(req);
    if (role !== 'admin') {
      return json({ error: 'Accès refusé', code: 'FORBIDDEN' }, 403);
    }

    const input = validateRequest(await req.json());
    const supabase = createServiceClient();

    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select('id, status, hmac_signature')
      .eq('id', input.lot_id)
      .single();

    if (lotError || !lot) {
      return json({ error: 'Lot introuvable', code: 'LOT_NOT_FOUND' }, 404);
    }

    if (lot.status !== 'EN_ATTENTE') {
      return json({ error: 'Lot non réinitialisable (statut invalide)', code: 'LOT_STATUS_INVALID' }, 422);
    }

    if (!lot.hmac_signature) {
      return json({ error: 'Lot déjà non signé', code: 'LOT_ALREADY_RESET' }, 409);
    }

    const { data: updated, error: updateError } = await supabase
      .from('lots')
      .update({ hmac_signature: null, generation_timestamp: null })
      .eq('id', lot.id)
      .eq('status', 'EN_ATTENTE')
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('[reset-lot-hmac] Erreur mise à jour lot:', updateError);
      return json({ error: 'Erreur lors de la réinitialisation du lot', code: 'LOT_UPDATE_ERROR' }, 500);
    }

    if (!updated) {
      return json({ error: 'Lot non réinitialisable (statut invalide)', code: 'LOT_STATUS_INVALID' }, 422);
    }

    return json({ message: 'Lot réinitialisé' }, 200);
  } catch (err) {
    if (err instanceof AuthError) {
      return json({ error: err.message, code: 'UNAUTHORIZED' }, 401);
    }
    if (err instanceof ValidationError) {
      return json({ error: err.message, code: 'VALIDATION_ERROR' }, 400);
    }
    console.error('[reset-lot-hmac] Erreur inattendue:', err);
    return json({ error: 'Erreur interne', code: 'INTERNAL_ERROR' }, 500);
  }
});

function json(body: SuccessResponse | ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
