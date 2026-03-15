/**
 * Edge Function : verify-import
 * US-13 — Validation HMAC + import des notes
 *
 * Appelée par : CHEF_CENTRE (examen en status CORRECTION)
 *
 * Schéma lots   : (centre_id, examen_discipline_id, lot_numero, serie_id) — clé canonique
 * Schéma saisies : UNIQUE(lot_id, numero_anonyme) — clé UPSERT
 *                  note_centimes smallint [0-2000] | code_special IN ('ABS','ABD')
 *
 * POST /functions/v1/verify-import
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { requireAuth, createServiceClient, AuthError } from '../_shared/auth.ts';
import { verifyLotMeta, verifyTimestampWindow, LotMeta } from '../_shared/hmac.ts';

// ─── Contrat API ──────────────────────────────────────────────────────────────

interface LotMetaInput extends LotMeta {
  hmac_signature: string;
}

/** Une ligne du fichier Excel — un candidat = une note dans ce lot (une discipline) */
interface NoteRow {
  numero_anonyme: string;
  /** Valeur brute : nombre [0-20], "ABS", "ABD" (virgule acceptée : "10,5") */
  valeur: string | number;
}

interface VerifyImportRequest {
  meta: LotMetaInput;
  rows: NoteRow[];
}

interface LineResult {
  numero_anonyme: string;
  status: 'ok' | 'error';
  errors: string[];
}

interface VerifyImportResponse {
  success: boolean;
  nb_success: number;
  nb_errors: number;
  lines: LineResult[];
  warnings: string[];
}

interface ErrorResponse {
  error: string;
  code: string;
}

// ─── Parsing d'une note ───────────────────────────────────────────────────────

type ParsedNote =
  | { type: 'centimes'; value: number }
  | { type: 'special'; value: 'ABS' | 'ABD' }
  | { type: 'error'; message: string };

function parseNote(raw: string | number): ParsedNote {
  if (raw === 'ABS') return { type: 'special', value: 'ABS' };
  if (raw === 'ABD') return { type: 'special', value: 'ABD' };

  const normalized = typeof raw === 'string' ? raw.replace(',', '.').trim() : raw;
  const num = Number(normalized);

  if (isNaN(num)) {
    return { type: 'error', message: `Valeur invalide "${raw}" — attendu : nombre [0-20], ABS, ABD` };
  }
  if (num < 0 || num > 20) {
    return { type: 'error', message: `Note hors plage : ${num} — attendu : [0..20]` };
  }

  return { type: 'centimes', value: Math.round(num * 100) };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errJson({ error: 'Méthode non autorisée', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};

    const { userId, role } = await requireAuth(req, body as Record<string, unknown>);
    if (role !== 'admin' && role !== 'chef_centre') {
      return errJson({ error: 'Accès refusé', code: 'FORBIDDEN' }, 403);
    }

    const { meta, rows } = body as VerifyImportRequest;

    // ── Cap de sécurité ─────────────────────────────────────────────────────
    if (!rows || rows.length > 500) {
      return errJson({
        error: `Nombre de lignes invalide (max 500, reçu ${rows?.length ?? 0})`,
        code: 'PAYLOAD_TOO_LARGE',
      }, 400);
    }

    // ── 1. Vérification HMAC ────────────────────────────────────────────────
    const { hmac_signature, ...lotMeta } = meta;
    const hmacValid = await verifyLotMeta(lotMeta, hmac_signature);
    if (!hmacValid) {
      return errJson({
        error: 'Fichier modifié, corrompu ou non généré par l\'application',
        code: 'HMAC_INVALID',
      }, 422);
    }

    const supabase = createServiceClient();

    // ── 2. Récupérer l'examen (status + hmac_window_days) ───────────────────
    const { data: examen } = await supabase
      .from('examens')
      .select('status, hmac_window_days')
      .eq('id', meta.examen_id)
      .single();

    if (!examen) {
      return errJson({ error: 'Examen introuvable', code: 'EXAM_NOT_FOUND' }, 404);
    }
    if (examen.status !== 'CORRECTION') {
      return errJson({
        error: `Import non autorisé — statut examen : ${examen.status}`,
        code: 'EXAM_STATUS_INVALID',
      }, 422);
    }

    // ── 3. Anti-replay ──────────────────────────────────────────────────────
    const timeCheck = verifyTimestampWindow(meta.generation_timestamp, examen.hmac_window_days);
    if (!timeCheck.valid) {
      return errJson({ error: timeCheck.reason!, code: 'TIMESTAMP_EXPIRED' }, 422);
    }

    // ── 4. Autorisation chef_centre sur ce centre ───────────────────────────
    if (role === 'chef_centre') {
      const { data: access } = await supabase
        .from('user_centres')
        .select('centre_id')
        .eq('user_id', userId)
        .eq('centre_id', meta.centre_id)
        .single();

      if (!access) {
        return errJson({ error: 'Ce centre ne vous est pas affecté', code: 'CENTRE_ACCESS_DENIED' }, 403);
      }
    }

    // ── 5. Récupérer le lot exact via la clé canonique ──────────────────────
    // Clé : (centre_id, examen_discipline_id, lot_numero, serie_id)
    // matiere_id du HMAC = examen_discipline_id dans lots
    const { data: lot } = await supabase
      .from('lots')
      .select('id, nb_copies, status')
      .eq('centre_id', meta.centre_id)
      .eq('examen_id', meta.examen_id)
      .eq('examen_discipline_id', meta.matiere_id)   // clé canonique — lève l'ambiguïté
      .eq('lot_numero', meta.lot_numero)
      .eq('serie_id', meta.serie_id)
      .maybeSingle();

    if (!lot) {
      return errJson({
        error: 'Lot introuvable — générer les lots avant l\'import',
        code: 'LOT_NOT_FOUND',
      }, 404);
    }

    if (lot.status === 'TERMINE') {
      return errJson({
        error: 'Ce lot a déjà été importé. Contactez un administrateur pour réinitialiser.',
        code: 'LOT_ALREADY_IMPORTED',
      }, 422);
    }

    const warnings: string[] = [];

    if (rows.length !== lot.nb_copies) {
      warnings.push(
        `Nombre de lignes (${rows.length}) ≠ attendu (${lot.nb_copies}) — import partiel accepté.`,
      );
    }

    // ── 6. Charger la map numero_anonyme → candidat_id pour ce lot ──────────
    const { data: candidatLots } = await supabase
      .from('candidat_lots')
      .select('candidat_id, candidats!inner(numero_anonyme)')
      .eq('lot_id', lot.id);

    const anonymeMap = new Map<string, string>();
    for (const cl of candidatLots ?? []) {
      const c = cl.candidats as { numero_anonyme: string };
      if (c?.numero_anonyme) {
        anonymeMap.set(c.numero_anonyme, cl.candidat_id);
      }
    }

    // ── 7. Valider chaque ligne + construire les rows UPSERT ────────────────
    const lineResults: LineResult[] = [];
    const upsertRows: {
      lot_id: string;
      numero_anonyme: string;
      candidat_id: string;
      note_centimes: number | null;
      code_special: string | null;
    }[] = [];

    for (const row of rows) {
      const candidatId = anonymeMap.get(row.numero_anonyme);
      if (!candidatId) {
        lineResults.push({
          numero_anonyme: row.numero_anonyme,
          status: 'error',
          errors: [`Numéro anonyme "${row.numero_anonyme}" inconnu dans ce lot`],
        });
        continue;
      }

      const parsed = parseNote(row.valeur);
      if (parsed.type === 'error') {
        lineResults.push({ numero_anonyme: row.numero_anonyme, status: 'error', errors: [parsed.message] });
        continue;
      }

      upsertRows.push({
        lot_id: lot.id,
        numero_anonyme: row.numero_anonyme,
        candidat_id: candidatId,
        note_centimes: parsed.type === 'centimes' ? parsed.value : null,
        code_special:  parsed.type === 'special'  ? parsed.value : null,
      });
      lineResults.push({ numero_anonyme: row.numero_anonyme, status: 'ok', errors: [] });
    }

    // ── 8. UPSERT des lignes valides ────────────────────────────────────────
    if (upsertRows.length > 0) {
      const { error: upsertError } = await supabase
        .from('saisies')
        .upsert(upsertRows, {
          onConflict: 'lot_id,numero_anonyme', // UNIQUE réel du schéma
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('[verify-import] Erreur UPSERT:', upsertError);
        return errJson({ error: 'Erreur lors de l\'enregistrement des notes', code: 'UPSERT_ERROR' }, 500);
      }

      // Marquer le lot comme importé (TERMINE) — permet au tableau de bord de suivre l'avancement
      const { error: lotUpdateError } = await supabase
        .from('lots')
        .update({ status: 'TERMINE' })
        .eq('id', lot.id);
      if (lotUpdateError) {
        console.error('[verify-import] Erreur mise à jour status lot:', lotUpdateError);
        warnings.push('Notes enregistrées mais statut du lot non mis à jour — contacter un administrateur.');
      }
    }

    const nbSuccess = lineResults.filter((r) => r.status === 'ok').length;
    const nbErrors  = lineResults.filter((r) => r.status === 'error').length;

    return new Response(JSON.stringify({
      success: nbErrors === 0,
      nb_success: nbSuccess,
      nb_errors: nbErrors,
      lines: lineResults,
      warnings,
    } satisfies VerifyImportResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errJson({ error: err.message, code: 'UNAUTHORIZED' }, 401);
    }
    console.error('[verify-import] Erreur inattendue:', err);
    return errJson({ error: 'Erreur interne', code: 'INTERNAL_ERROR' }, 500);
  }
});

function errJson(body: ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
