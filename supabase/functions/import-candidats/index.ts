/**
 * Edge Function : import-candidats
 * Sprint 6B — Import Excel des candidats avec auto-détection des classes
 *
 * Remplace l'appel `verify-import` (FormData) qui n'était pas implémenté.
 *
 * POST /functions/v1/import-candidats
 *
 * FormData attendu :
 *   file              : File (.xlsx / .xls)
 *   examen_id         : uuid
 *   etablissement_id  : uuid
 *   mode              : 'preview' | 'import'
 *   import_legal_confirmed : 'true' (requis en mode import)
 *   idempotency_key   : string (requis en mode import — anti-doublons)
 *
 * Colonnes Excel reconnues (insensibles à la casse) :
 *   Obligatoires : NOM, PRENOM, SERIE
 *   Optionnelles : PRENOM2, DATE_NAISSANCE (ou DATENAISSANCE), LIEU_NAISSANCE,
 *                  SEXE, MATRICULE, CLASSE
 *
 * Sécurité :
 *   - Réservé aux chefs d'établissement et admin
 *   - L'établissement doit être affecté à l'examen
 *   - L'examen doit être en phase INSCRIPTIONS
 *   - Déduplication via candidat_fingerprint (SHA-256)
 *
 * Note PII : les champs *_enc sont actuellement stockés en clair (texte normalisé).
 *            L'implémentation AES-256-GCM sera ajoutée dans un sprint dédié sécurité.
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { requireAuth, createServiceClient, AuthError } from '../_shared/auth.ts';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewResponse {
  mode: 'preview';
  nb_valides: number;
  nb_erreurs: number;
  warnings: string[];
  errors_sample: string[]; // Jusqu'à 10 exemples d'erreurs
}

interface ImportResponse {
  mode: 'import';
  nb_succes: number;
  nb_erreurs: number;
  rapport: string[];
  warnings: string[];
}

interface ErrorResponse {
  error: string;
  code: string;
}

// Colonnes reconnues — clés normalisées
type ColMap = {
  nom?: number;
  prenom?: number;
  prenom2?: number;
  date_naissance?: number;
  lieu_naissance?: number;
  sexe?: number;
  serie?: number;
  classe?: number;
  matricule?: number;
};

/** Normalise un en-tête Excel pour la correspondance insensible à la casse */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprimer accents
    .replace(/[^a-z0-9_]/g, '_');
}

const HEADER_ALIASES: Record<string, keyof ColMap> = {
  nom: 'nom',
  prenom: 'prenom',
  prenom2: 'prenom2',
  prenoms: 'prenom',
  date_naissance: 'date_naissance',
  datenaissance: 'date_naissance',
  dn: 'date_naissance',
  lieu_naissance: 'lieu_naissance',
  lieunaissance: 'lieu_naissance',
  lieu: 'lieu_naissance',
  sexe: 'sexe',
  genre: 'sexe',
  serie: 'serie',
  series: 'serie',
  classe: 'classe',
  groupe: 'classe',
  groupe_pedagogique: 'classe',
  matricule: 'matricule',
  num_matricule: 'matricule',
};

/** Détecte les colonnes dans la première ligne de l'Excel */
function detectColumns(headers: string[]): ColMap {
  const map: ColMap = {};
  headers.forEach((h, i) => {
    const normalized = normalizeHeader(h);
    const key = HEADER_ALIASES[normalized];
    if (key && !(key in map)) {
      (map[key] as number) = i;
    }
  });
  return map;
}

/** Normalise une valeur de cellule Excel en string */
function cellStr(row: unknown[], col: number | undefined): string {
  if (col === undefined || row[col] == null) return '';
  return String(row[col]).trim();
}

/** Génère un fingerprint SHA-256 pour déduplication */
async function fingerprint(parts: string[]): Promise<string> {
  const data = new TextEncoder().encode(parts.join('|').toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
    if (role !== 'admin' && role !== 'chef_etablissement') {
      return errJson({ error: 'Accès refusé', code: 'FORBIDDEN' }, 403);
    }

    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return errJson({ error: 'Content-Type multipart/form-data requis', code: 'INVALID_CONTENT_TYPE' }, 400);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const examenId = formData.get('examen_id') as string | null;
    const etablissementId = formData.get('etablissement_id') as string | null;
    const mode = (formData.get('mode') as string | null) ?? 'preview';
    const legalConfirmed = formData.get('import_legal_confirmed') === 'true';
    const idempotencyKey = formData.get('idempotency_key') as string | null;

    // ── Validation des paramètres ────────────────────────────────────────────
    if (!file || !examenId || !etablissementId) {
      return errJson({
        error: 'Paramètres requis : file, examen_id, etablissement_id',
        code: 'BAD_REQUEST',
      }, 400);
    }

    if (mode === 'import' && !legalConfirmed) {
      return errJson({ error: 'Confirmation légale requise pour l\'import', code: 'LEGAL_NOT_CONFIRMED' }, 400);
    }

    if (mode === 'import' && !idempotencyKey) {
      return errJson({ error: 'idempotency_key requis pour l\'import', code: 'MISSING_IDEMPOTENCY_KEY' }, 400);
    }

    const supabase = createServiceClient();

    // ── 1. Vérifier l'examen ────────────────────────────────────────────────
    const { data: examen } = await supabase
      .from('examens')
      .select('id, status')
      .eq('id', examenId)
      .single();

    if (!examen) {
      return errJson({ error: 'Examen introuvable', code: 'EXAM_NOT_FOUND' }, 404);
    }
    if (examen.status !== 'INSCRIPTIONS') {
      return errJson({
        error: `Import non autorisé — statut examen : ${examen.status} (attendu : INSCRIPTIONS)`,
        code: 'EXAM_STATUS_INVALID',
      }, 422);
    }

    // ── 2. Vérifier l'accès établissement ────────────────────────────────────
    if (role === 'chef_etablissement') {
      const { data: access } = await supabase
        .from('user_etablissements')
        .select('etablissement_id')
        .eq('user_id', userId)
        .eq('etablissement_id', etablissementId)
        .single();

      if (!access) {
        return errJson({ error: 'Cet établissement ne vous est pas affecté', code: 'ETAB_ACCESS_DENIED' }, 403);
      }
    }

    // ── 3. Vérifier que l'établissement est affecté à l'examen ────────────────
    const { data: examenEtab } = await supabase
      .from('examen_etablissements')
      .select('examen_id')
      .eq('examen_id', examenId)
      .eq('etablissement_id', etablissementId)
      .single();

    if (!examenEtab) {
      return errJson({
        error: 'Cet établissement n\'est pas affecté à cet examen',
        code: 'ETAB_NOT_IN_EXAM',
      }, 422);
    }

    // ── 4. Lire et parser le fichier Excel ──────────────────────────────────
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return errJson({ error: 'Fichier Excel vide ou corrompu', code: 'EMPTY_WORKBOOK' }, 422);
    }

    const sheet = workbook.Sheets[sheetName];
    // header:1 = première ligne comme array, pas comme objet
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rows.length < 2) {
      return errJson({ error: 'Fichier Excel vide (aucune ligne de données)', code: 'EMPTY_SHEET' }, 422);
    }

    const headerRow = rows[0].map(String);
    const dataRows = rows.slice(1).filter((r) => r.some((c) => c !== '' && c != null));

    if (dataRows.length > 1000) {
      return errJson({
        error: `Trop de lignes (${dataRows.length} > 1000). Découpez le fichier en plusieurs imports.`,
        code: 'PAYLOAD_TOO_LARGE',
      }, 400);
    }

    const cols = detectColumns(headerRow);

    // ── 5. Vérifier colonnes obligatoires ────────────────────────────────────
    const missingCols: string[] = [];
    if (cols.nom === undefined) missingCols.push('NOM');
    if (cols.prenom === undefined) missingCols.push('PRENOM');
    if (cols.serie === undefined) missingCols.push('SERIE');

    if (missingCols.length > 0) {
      return errJson({
        error: `Colonnes manquantes : ${missingCols.join(', ')}. Colonnes détectées : ${headerRow.join(', ')}`,
        code: 'MISSING_COLUMNS',
      }, 422);
    }

    // ── 6. Charger le référentiel (séries + classes existantes) ─────────────
    const { data: seriesDb } = await supabase
      .from('series')
      .select('id, code');

    const seriesMap = new Map<string, string>(
      (seriesDb ?? []).map((s) => [s.code.trim().toUpperCase(), s.id]),
    );

    const { data: classesDb } = await supabase
      .from('classes')
      .select('id, libelle')
      .eq('etablissement_id', etablissementId);

    const classesMap = new Map<string, string>(
      (classesDb ?? []).map((c) => [c.libelle.trim().toLowerCase(), c.id]),
    );

    const warnings: string[] = [];
    const hasClasseCol = cols.classe !== undefined;
    const newClasses: string[] = []; // libellés des classes auto-créées

    // ── 7. Valider chaque ligne ──────────────────────────────────────────────
    interface ParsedRow {
      nom: string;
      prenom: string;
      prenom2: string;
      date_naissance: string;
      lieu_naissance: string;
      sexe: 'M' | 'F' | null;
      serie_id: string;
      classe_libelle: string | null;
      matricule: string | null;
      fp_input: string[];
    }

    const validRows: ParsedRow[] = [];
    const rowErrors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const lineNum = i + 2; // +2 car ligne 1 = en-têtes
      const errs: string[] = [];

      const nom = cellStr(row, cols.nom);
      const prenom = cellStr(row, cols.prenom);
      const prenom2 = cellStr(row, cols.prenom2);
      const rawSerie = cellStr(row, cols.serie).toUpperCase();
      const classeLibelle = hasClasseCol ? cellStr(row, cols.classe) || null : null;
      const matricule = cols.matricule !== undefined ? cellStr(row, cols.matricule) || null : null;
      const dateNaissance = cellStr(row, cols.date_naissance);
      const lieuNaissance = cellStr(row, cols.lieu_naissance);
      const rawSexe = cellStr(row, cols.sexe).toUpperCase();
      const sexe = rawSexe === 'M' || rawSexe === 'F' ? rawSexe : null;

      if (!nom) errs.push('Nom manquant');
      if (!prenom) errs.push('Prénom manquant');

      const serieId = seriesMap.get(rawSerie);
      if (!rawSerie) {
        errs.push('Série manquante');
      } else if (!serieId) {
        errs.push(`Série inconnue : "${rawSerie}"`);
      }

      if (errs.length > 0) {
        rowErrors.push(`Ligne ${lineNum} : ${errs.join(', ')}`);
        continue;
      }

      validRows.push({
        nom,
        prenom,
        prenom2,
        date_naissance: dateNaissance,
        lieu_naissance: lieuNaissance,
        sexe,
        serie_id: serieId!,
        classe_libelle: classeLibelle,
        matricule,
        fp_input: [examenId, etablissementId, nom.toLowerCase(), prenom.toLowerCase(), dateNaissance],
      });
    }

    // ── Avertissement colonne Classe ─────────────────────────────────────────
    if (hasClasseCol) {
      const uniqueClasses = [...new Set(
        validRows.map((r) => r.classe_libelle).filter(Boolean) as string[],
      )];
      const toCreate = uniqueClasses.filter(
        (c) => !classesMap.has(c.toLowerCase()),
      );
      if (toCreate.length > 0) {
        newClasses.push(...toCreate);
        warnings.push(
          `${toCreate.length} classe(s) sera(ont) créée(s) automatiquement : ${toCreate.join(', ')}.
           Vérifiez que ces libellés correspondent bien aux classes de votre établissement.`,
        );
      }
    }

    // ── Preview mode : retourner les stats sans rien persister ───────────────
    if (mode === 'preview') {
      return jsonOk({
        mode: 'preview',
        nb_valides: validRows.length,
        nb_erreurs: rowErrors.length,
        warnings,
        errors_sample: rowErrors.slice(0, 10),
      } satisfies PreviewResponse);
    }

    // ── Import mode ──────────────────────────────────────────────────────────

    // 8a. Créer les classes manquantes
    const classesToCreate = newClasses.map((libelle) => ({
      etablissement_id: etablissementId,
      libelle,
    }));

    if (classesToCreate.length > 0) {
      const { data: created, error: classesError } = await supabase
        .from('classes')
        .upsert(classesToCreate, { onConflict: 'etablissement_id,libelle', ignoreDuplicates: true })
        .select('id, libelle');

      if (classesError) {
        console.error('[import-candidats] Erreur création classes:', classesError);
        return errJson({ error: 'Erreur lors de la création des classes', code: 'CLASSES_CREATE_ERROR' }, 500);
      }

      // Mettre à jour la map avec les nouvelles classes
      for (const c of created ?? []) {
        classesMap.set(c.libelle.toLowerCase(), c.id);
      }

      // Re-fetch pour récupérer toutes les classes (y compris pré-existantes ignorées par upsert)
      const { data: allClasses } = await supabase
        .from('classes')
        .select('id, libelle')
        .eq('etablissement_id', etablissementId);

      for (const c of allClasses ?? []) {
        classesMap.set(c.libelle.toLowerCase(), c.id);
      }
    }

    // 8b. Créer l'entrée imports_log
    const { data: importLog, error: logError } = await supabase
      .from('imports_log')
      .insert({
        examen_id: examenId,
        etablissement_id: etablissementId,
        imported_by: userId,
        fichier_nom: file.name,
        nb_candidats_fichier: dataRows.length,
        import_legal_confirmed: true,
        import_legal_confirmed_at: new Date().toISOString(),
        import_legal_confirmed_by: userId,
        is_heritage: false,
      })
      .select('id')
      .single();

    if (logError || !importLog) {
      console.error('[import-candidats] Erreur création imports_log:', logError);
      return errJson({ error: 'Erreur lors de la création du journal d\'import', code: 'LOG_CREATE_ERROR' }, 500);
    }

    // 8c. Insérer les candidats
    let nbSucces = 0;
    let nbErreurs = rowErrors.length; // Déjà comptés (lignes invalides)
    const rapport: string[] = [...rowErrors.slice(0, 50)]; // Max 50 erreurs dans le rapport

    const candidatsToInsert = await Promise.all(
      validRows.map(async (r) => {
        const fp = await fingerprint(r.fp_input);
        const classeId = r.classe_libelle
          ? (classesMap.get(r.classe_libelle.toLowerCase()) ?? null)
          : null;

        return {
          examen_id: examenId,
          etablissement_id: etablissementId,
          import_id: importLog.id,
          // PII : stockée en texte normalisé — chiffrement AES-256-GCM à implémenter
          nom_enc: r.nom.toUpperCase(),
          prenom_enc: r.prenom,
          date_naissance_enc: r.date_naissance || null,
          lieu_naissance_enc: r.lieu_naissance || null,
          sexe: r.sexe,
          serie_id: r.serie_id,
          classe_id: classeId,
          matricule: r.matricule,
          candidat_fingerprint: fp,
        };
      }),
    );

    // Batch insert par tranches de 100 (limites PostgREST)
    const BATCH_SIZE = 100;
    for (let i = 0; i < candidatsToInsert.length; i += BATCH_SIZE) {
      const batch = candidatsToInsert.slice(i, i + BATCH_SIZE);
      const { error: insertError, count } = await supabase
        .from('candidats')
        .upsert(batch, {
          onConflict: 'candidat_fingerprint',
          ignoreDuplicates: true,
          count: 'exact',
        });

      if (insertError) {
        console.error('[import-candidats] Erreur insertion batch:', insertError);
        nbErreurs += batch.length;
        rapport.push(`Erreur batch (lignes ${i + 2}–${i + batch.length + 1}) : ${insertError.message}`);
      } else {
        nbSucces += count ?? batch.length;
      }
    }

    // 8d. Mettre à jour le log avec les résultats
    await supabase
      .from('imports_log')
      .update({
        nb_succes: nbSucces,
        nb_erreurs: nbErreurs,
        erreurs_detail: rapport.length > 0 ? rapport : null,
      })
      .eq('id', importLog.id);

    return jsonOk({
      mode: 'import',
      nb_succes: nbSucces,
      nb_erreurs: nbErreurs,
      rapport,
      warnings,
    } satisfies ImportResponse);

  } catch (err) {
    if (err instanceof AuthError) {
      return errJson({ error: err.message, code: 'UNAUTHORIZED' }, 401);
    }
    console.error('[import-candidats] Erreur inattendue:', err);
    return errJson({ error: 'Erreur interne', code: 'INTERNAL_ERROR' }, 500);
  }
});

function errJson(body: ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonOk(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
