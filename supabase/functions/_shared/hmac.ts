/**
 * Utilitaire HMAC-SHA256 — Edge Functions MockExams
 *
 * Signature (PRD §3.4) :
 *   HMAC-SHA256(
 *     centre_id | examen_id | matiere_id | serie_id | option_id |
 *     lot_numero | nb_copies | generation_timestamp,
 *     HMAC_SECRET_KEY
 *   )
 *
 * Terminologie :
 *   matiere_id  = lots.examen_discipline_id (UUID de la discipline dans l'examen)
 *   option_id   = UUID vide ('') si pas d'option facultative, sinon examen_discipline_id de l'option
 *   nb_copies   = lots.nb_copies (nombre de copies dans ce lot)
 *
 * IMPORTANT (PRD §3.4) :
 *   - Signe uniquement les métadonnées _meta — PAS le contenu Excel (les notes)
 *   - Un fichier avec notes modifiées mais _meta intacte → HMAC VALIDE (attendu)
 *   - Un fichier avec _meta modifiée → HMAC INVALIDE → import refusé
 */

export interface LotMeta {
  centre_id: string;
  examen_id: string;
  /** lots.examen_discipline_id */
  matiere_id: string;
  serie_id: string;
  /** '' si pas d'option facultative */
  option_id: string;
  lot_numero: number;
  /** lots.nb_copies */
  nb_copies: number;
  generation_timestamp: string; // ISO 8601
}

function buildHmacInput(meta: LotMeta): string {
  return [
    meta.centre_id,
    meta.examen_id,
    meta.matiere_id,
    meta.serie_id,
    meta.option_id,
    meta.lot_numero,
    meta.nb_copies,
    meta.generation_timestamp,
  ].join('|');
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signLotMeta(meta: LotMeta): Promise<string> {
  const secret = Deno.env.get('HMAC_SECRET_KEY');
  if (!secret) throw new Error('HMAC_SECRET_KEY manquante');

  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(buildHmacInput(meta)),
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyLotMeta(meta: LotMeta, providedHmac: string): Promise<boolean> {
  const expected = await signLotMeta(meta);
  // Comparaison à temps constant — évite les timing attacks
  if (expected.length !== providedHmac.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ providedHmac.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Vérifie que generation_timestamp est dans la fenêtre d'acceptation.
 * Anti-replay bidirectionnel (PRD §3.4) :
 *   - Passé  : max hmac_window_days (configurable par examen, défaut 90j)
 *   - Futur  : max 5 minutes (tolérance dérive d'horloge serveur)
 */
export function verifyTimestampWindow(
  generationTimestamp: string,
  windowDays = 90,
): { valid: boolean; reason?: string } {
  const generated = new Date(generationTimestamp);
  if (isNaN(generated.getTime())) {
    return { valid: false, reason: 'Timestamp invalide' };
  }

  const diffMs = Date.now() - generated.getTime();
  const maxPastMs = windowDays * 24 * 60 * 60 * 1000;
  const maxFutureMs = 5 * 60 * 1000;

  if (diffMs > maxPastMs) {
    return { valid: false, reason: 'Fichier expiré — régénérer les fichiers de saisie.' };
  }
  if (diffMs < -maxFutureMs) {
    return { valid: false, reason: 'Timestamp futur invalide — vérifier l\'horloge serveur.' };
  }

  return { valid: true };
}
