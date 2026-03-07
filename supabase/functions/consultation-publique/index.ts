/**
 * Edge Function : consultation-publique
 * US-20 — Consultation publique des résultats
 *
 * Appelée par : public (anon) — élèves, parents
 *
 * Sécurité (Brief §4.8.4) :
 *   - Rate limiting global : 20 req/IP/min (protection réseau)
 *   - Lockout par (examen_id, numero_anonyme, ip_hash) via table consultation_tentatives
 *     Barème : tentatives 1-5 → ok | 6 → 1h | 7-9 → 24h | 10+ → 72h + audit
 *   - Réponse générique : pas d'oracle d'énumération (numéro inconnu = code incorrect)
 *
 * Schéma codes_acces (colonnes utilisées) :
 *   id, lot_id, candidat_id, code_hash, expires_at, is_active,
 *   nb_connexions, used_at, lockout_until, tentatives
 *
 * Schéma resultats (colonnes utilisées) :
 *   examen_id, candidat_id, phase, moyenne_centimes,
 *   status (ENUM 'ADMIS'|'NON_ADMIS'|'RATTRAPAGE')
 *
 * POST /functions/v1/consultation-publique
 * Body : { examen_id, numero_anonyme, code_acces }
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/auth.ts';

// ─── Contrat API ──────────────────────────────────────────────────────────────

interface ConsultationRequest {
  examen_id: string;
  /** Numéro sur la souche de l'élève (= candidats.numero_anonyme) */
  numero_anonyme: string;
  /** Code brut reçu par l'élève (8 caractères alphanumériques) */
  code_acces: string;
}

interface ConsultationResponse {
  candidat: {
    numero_anonyme: string;
    serie: string;
    etablissement: string;
  };
  resultat: {
    status: 'ADMIS' | 'NON_ADMIS' | 'RATTRAPAGE';
    /** En centièmes (ex: 1177 = 11.77/20). null si non finalisé */
    moyenne_centimes: number | null;
    phase: number;
  };
}

interface ErrorResponse {
  error: string;
  code: string;
  retry_after_seconds?: number;
}

// ─── Rate limiting global par IP (DB persistée — B1) ─────────────────────────
// check_ip_rate_limit() est atomique côté PostgreSQL :
// INSERT ... ON CONFLICT → sûr pour runtimes serverless multi-instances.

// ─── Lockout progressif (Brief §4.8.4) ───────────────────────────────────────

function lockoutSeconds(tentatives: number): number {
  if (tentatives >= 10) return 72 * 3600;
  if (tentatives >= 7)  return 24 * 3600;
  if (tentatives >= 6)  return 3600;
  return 0;
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function errJson(body: ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Message générique — pas d'oracle d'énumération (Brief §4.8.4)
const GENERIC_ERROR: ErrorResponse = {
  error: 'Numéro de composition ou code d\'accès incorrect',
  code: 'INVALID_CREDENTIALS',
};

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errJson({ error: 'Méthode non autorisée', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0';

  try {
    const { examen_id, numero_anonyme, code_acces } = (await req.json()) as ConsultationRequest;

    if (!examen_id || !numero_anonyme || !code_acces) {
      return errJson({ error: 'Champs requis manquants', code: 'VALIDATION_ERROR' }, 400);
    }

    const supabase = createServiceClient();
    const ipHash = (await sha256Hex(ip + (Deno.env.get('IP_HASH_SALT') ?? 'mockexams'))).slice(0, 16);

    // ── 1. Rate limiting global par IP (DB persistée — 20 req/IP/min) ────────
    // Fail-open sur erreur DB : une panne du rate limiter ne bloque pas les candidats.
    const { data: allowed, error: rateLimitError } = await supabase.rpc('check_ip_rate_limit', {
      p_ip_hash: ipHash,
      p_max: 20,
    });
    if (rateLimitError) {
      console.error('[consultation-publique] Rate limit DB error (fail-open):', rateLimitError);
    } else if (!allowed) {
      return errJson({ error: 'Trop de requêtes — réessayez dans une minute', code: 'RATE_LIMITED' }, 429);
    }

    // ── 2. Vérifier lockout actif pour (examen_id, numero_anonyme, ip_hash) ─
    const { data: tentative } = await supabase
      .from('consultation_tentatives')
      .select('id, tentatives, lockout_until')
      .eq('examen_id', examen_id)
      .eq('numero_anonyme', numero_anonyme)
      .eq('ip_hash', ipHash)
      .maybeSingle();

    if (tentative?.lockout_until && new Date(tentative.lockout_until) > new Date()) {
      const retryAfter = Math.ceil((new Date(tentative.lockout_until).getTime() - Date.now()) / 1000);
      return errJson({
        error: 'Compte temporairement bloqué suite à trop de tentatives incorrectes.',
        code: 'LOCKED_OUT',
        retry_after_seconds: retryAfter,
      }, 403);
    }

    // ── 3. Vérifier que l'examen est publié ────────────────────────────────
    const { data: examen } = await supabase
      .from('examens')
      .select('status')
      .eq('id', examen_id)
      .single();

    if (!examen || examen.status !== 'PUBLIE') {
      return errJson({ error: 'Résultats non encore publiés', code: 'RESULTS_NOT_PUBLISHED' }, 404);
    }

    // ── 4. Résoudre candidat_id via numero_anonyme ─────────────────────────
    const { data: candidat } = await supabase
      .from('candidats')
      .select('id, numero_anonyme, series!inner(libelle), etablissements!inner(nom)')
      .eq('examen_id', examen_id)
      .eq('numero_anonyme', numero_anonyme)
      .maybeSingle();

    // Pas de court-circuit sur candidat introuvable — même message générique
    const candidatId = candidat?.id ?? null;

    // ── 5. Vérifier le code d'accès (hash) ─────────────────────────────────
    const codeHash = await sha256Hex(code_acces); // I1 SHA-256 — migrer bcrypt en I2

    const { data: codeEntry } = candidatId
      ? await supabase
          .from('codes_acces')
          .select('id, nb_connexions, expires_at, is_active')
          .eq('candidat_id', candidatId)
          .eq('code_hash', codeHash)
          .eq('is_active', true)
          .maybeSingle()
      : { data: null };

    // ── 6. Échec d'authentification → incrémenter lockout ──────────────────
    if (!codeEntry || new Date(codeEntry.expires_at) < new Date()) {
      const newTentatives = (tentative?.tentatives ?? 0) + 1;
      const lockoutUntil = lockoutSeconds(newTentatives) > 0
        ? new Date(Date.now() + lockoutSeconds(newTentatives) * 1000).toISOString()
        : null;

      // Upsert dans consultation_tentatives
      await supabase
        .from('consultation_tentatives')
        .upsert({
          examen_id,
          numero_anonyme,
          ip_hash: ipHash,
          tentatives: newTentatives,
          lockout_until: lockoutUntil,
          derniere_tentative: new Date().toISOString(),
        }, { onConflict: 'examen_id,numero_anonyme,ip_hash' });

      // Signalement audit pour tentative 10+ (Brief §4.8.4)
      if (newTentatives >= 10) {
        await supabase.from('audit_log').insert({
          table_name: 'consultation_tentatives',
          operation: 'INSERT',
          new_data: { examen_id, numero_anonyme, ip_hash: ipHash, tentatives: newTentatives },
        });
      }

      return errJson(GENERIC_ERROR, 401);
    }

    // ── 7. Succès → réinitialiser tentatives + enregistrer connexion ────────
    await Promise.all([
      // Réinitialiser le compteur de lockout
      tentative
        ? supabase
            .from('consultation_tentatives')
            .update({ tentatives: 0, lockout_until: null, derniere_tentative: new Date().toISOString() })
            .eq('id', tentative.id)
        : Promise.resolve(),
      // Enregistrer la connexion réussie
      supabase
        .from('codes_acces')
        .update({
          nb_connexions: codeEntry.nb_connexions + 1,
          used_at: new Date().toISOString(),
        })
        .eq('id', codeEntry.id),
    ]);

    // ── 8. Récupérer le résultat (phase la plus haute en priorité) ──────────
    const { data: resultat } = await supabase
      .from('resultats')
      .select('status, moyenne_centimes, phase')
      .eq('candidat_id', candidatId)
      .eq('examen_id', examen_id)
      .order('phase', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!resultat) {
      return errJson({ error: 'Résultat introuvable pour ce candidat', code: 'RESULT_NOT_FOUND' }, 404);
    }

    const c = candidat as {
      numero_anonyme: string;
      series: { libelle: string };
      etablissements: { nom: string };
    };

    return new Response(JSON.stringify({
      candidat: {
        numero_anonyme: c.numero_anonyme,
        serie: c.series.libelle,
        etablissement: c.etablissements.nom,
      },
      resultat: {
        status: resultat.status,
        moyenne_centimes: resultat.moyenne_centimes,
        phase: resultat.phase,
      },
    } satisfies ConsultationResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[consultation-publique] Erreur inattendue:', err);
    return errJson({ error: 'Erreur interne', code: 'INTERNAL_ERROR' }, 500);
  }
});
