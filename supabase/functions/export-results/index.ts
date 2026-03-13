/**
 * Edge Function : export-results
 * M14 — Export des résultats de délibération
 *
 * Accès : admin (tous établissements) | chef_etablissement (son établissement)
 *
 * POST /functions/v1/export-results
 * Body : { examen_id: string, etablissement_id?: string }
 *
 * Réponse JSON : ExportResultatsResponse
 *  - disciplines[] : libellé + coefficient par discipline de l'examen
 *  - etablissements[] : par établissement → candidats → notes par discipline
 *
 * Données PII (nom_enc / prenom_enc) : lues via service_role (bypass RLS).
 * Codes d'accès : non exportables (stockés hashés bcrypt, non réversibles).
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { requireAuth, createServiceClient, AuthError } from '../_shared/auth.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportRequest {
  examen_id: string;
  etablissement_id?: string;
}

interface DisciplineExport {
  id: string;
  libelle: string;
  code: string;
  coefficient: number;
  ordre: number;
}

interface NoteExport {
  discipline_id: string;
  note_centimes: number | null;
  code_special: string | null;
}

interface CandidatExport {
  candidat_id: string;
  numero_anonyme: string | null;
  nom: string;
  prenom: string;
  sexe: string | null;
  moyenne_centimes: number | null;
  status: string;
  phase: number;
  notes: NoteExport[];
}

interface EtablissementExport {
  id: string;
  nom: string;
  candidats: CandidatExport[];
}

interface ExportResultatsResponse {
  examen_id: string;
  examen_libelle: string;
  examen_annee: number;
  disciplines: DisciplineExport[];
  etablissements: EtablissementExport[];
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

function validateRequest(body: unknown): ExportRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Corps de requête invalide');
  }
  const b = body as Record<string, unknown>;
  if (!b.examen_id || typeof b.examen_id !== 'string') {
    throw new ValidationError('examen_id requis');
  }
  if (b.etablissement_id !== undefined && typeof b.etablissement_id !== 'string') {
    throw new ValidationError('etablissement_id invalide');
  }
  return { examen_id: b.examen_id, etablissement_id: b.etablissement_id as string | undefined };
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
    if (role !== 'admin' && role !== 'chef_etablissement' && role !== 'tutelle') {
      return errJson({ error: 'Accès refusé', code: 'FORBIDDEN' }, 403);
    }

    const input = validateRequest(await req.json());
    const supabase = createServiceClient();

    // ── Vérifier accès établissement pour chef_etablissement ────────────────
    let etablissementFilter: string | null = input.etablissement_id ?? null;

    if (role === 'chef_etablissement') {
      const { data: userEtabs } = await supabase
        .from('user_etablissements')
        .select('etablissement_id')
        .eq('user_id', userId);

      const myEtabIds = (userEtabs ?? []).map((r: { etablissement_id: string }) => r.etablissement_id);

      if (!etablissementFilter) {
        // Chef établissement sans filtre = erreur
        return errJson({ error: 'etablissement_id requis pour ce rôle', code: 'ETABLISSEMENT_REQUIRED' }, 400);
      }
      if (!myEtabIds.includes(etablissementFilter)) {
        return errJson({ error: 'Établissement non autorisé', code: 'FORBIDDEN' }, 403);
      }
    }

    // ── Récupérer les infos de l'examen ─────────────────────────────────────
    const { data: examen, error: examenError } = await supabase
      .from('examens')
      .select('id, libelle, annee, status')
      .eq('id', input.examen_id)
      .single();

    if (examenError || !examen) {
      return errJson({ error: 'Examen introuvable', code: 'EXAMEN_NOT_FOUND' }, 404);
    }

    // Seulement les examens délibérés ou publiés
    if (!['DELIBERE', 'PUBLIE', 'CLOS', 'CORRECTION_POST_DELIBERATION'].includes(examen.status)) {
      return errJson({ error: 'Export disponible uniquement pour les examens délibérés', code: 'EXAMEN_STATUS_INVALID' }, 422);
    }

    // ── Disciplines de l'examen ──────────────────────────────────────────────
    const { data: examDisciplines, error: discError } = await supabase
      .from('examen_disciplines')
      .select(`
        id,
        coefficient,
        ordre_affichage,
        disciplines!inner(id, libelle, code)
      `)
      .eq('examen_id', input.examen_id)
      .order('ordre_affichage');

    if (discError) throw discError;

    const disciplines: DisciplineExport[] = (examDisciplines ?? []).map((ed: {
      id: string;
      coefficient: number;
      ordre_affichage: number;
      disciplines: { id: string; libelle: string; code: string };
    }) => ({
      id: ed.id,
      libelle: ed.disciplines.libelle,
      code: ed.disciplines.code,
      coefficient: ed.coefficient,
      ordre: ed.ordre_affichage,
    }));

    // ── Résultats + candidats ────────────────────────────────────────────────
    let resultatsQuery = supabase
      .from('resultats')
      .select(`
        id,
        candidat_id,
        moyenne_centimes,
        status,
        phase,
        candidats!inner(
          id,
          numero_anonyme,
          nom_enc,
          prenom_enc,
          sexe,
          etablissement_id,
          etablissements!inner(id, nom)
        )
      `)
      .eq('examen_id', input.examen_id)
      .order('candidats(numero_anonyme)');

    if (etablissementFilter) {
      resultatsQuery = resultatsQuery.eq('candidats.etablissement_id', etablissementFilter);
    }

    const { data: resultats, error: resultatsError } = await resultatsQuery;
    if (resultatsError) throw resultatsError;

    if (!resultats || resultats.length === 0) {
      return okJson({
        examen_id: examen.id,
        examen_libelle: examen.libelle,
        examen_annee: examen.annee,
        disciplines,
        etablissements: [],
      });
    }

    // ── Notes (saisies) pour tous les candidats concernés ───────────────────
    const candidatIds = resultats.map((r: { candidat_id: string }) => r.candidat_id);

    const { data: saisies, error: saisiesError } = await supabase
      .from('saisies')
      .select(`
        candidat_id,
        note_centimes,
        code_special,
        lots!inner(examen_discipline_id)
      `)
      .in('candidat_id', candidatIds)
      .not('lots.examen_id', 'is', null);

    if (saisiesError) throw saisiesError;

    // Index saisies par candidat_id
    const saisiesMap = new Map<string, NoteExport[]>();
    for (const s of saisies ?? []) {
      const lot = s.lots as { examen_discipline_id: string };
      const entry: NoteExport = {
        discipline_id: lot.examen_discipline_id,
        note_centimes: s.note_centimes,
        code_special: s.code_special,
      };
      const existing = saisiesMap.get(s.candidat_id) ?? [];
      existing.push(entry);
      saisiesMap.set(s.candidat_id, existing);
    }

    // ── Grouper par établissement ────────────────────────────────────────────
    const etabMap = new Map<string, EtablissementExport>();

    for (const r of resultats) {
      const cand = r.candidats as {
        id: string;
        numero_anonyme: string | null;
        nom_enc: string;
        prenom_enc: string;
        sexe: string | null;
        etablissement_id: string;
        etablissements: { id: string; nom: string };
      };

      const etabId = cand.etablissement_id;
      const etabNom = cand.etablissements.nom;

      if (!etabMap.has(etabId)) {
        etabMap.set(etabId, { id: etabId, nom: etabNom, candidats: [] });
      }

      const candidatExport: CandidatExport = {
        candidat_id: cand.id,
        numero_anonyme: cand.numero_anonyme,
        nom: cand.nom_enc,       // nom_enc contient le nom en texte brut (chiffrement non implémenté côté import)
        prenom: cand.prenom_enc, // idem prenom_enc
        sexe: cand.sexe,
        moyenne_centimes: r.moyenne_centimes,
        status: r.status,
        phase: r.phase,
        notes: saisiesMap.get(cand.id) ?? [],
      };

      etabMap.get(etabId)!.candidats.push(candidatExport);
    }

    // Trier établissements par nom
    const etablissements = Array.from(etabMap.values())
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

    return okJson({
      examen_id: examen.id,
      examen_libelle: examen.libelle,
      examen_annee: examen.annee,
      disciplines,
      etablissements,
    } satisfies ExportResultatsResponse);

  } catch (err) {
    if (err instanceof AuthError) {
      return errJson({ error: err.message, code: 'UNAUTHORIZED' }, 401);
    }
    if (err instanceof ValidationError) {
      return errJson({ error: err.message, code: 'VALIDATION_ERROR' }, 400);
    }
    console.error('[export-results] Erreur inattendue:', err);
    return errJson({ error: 'Erreur interne', code: 'INTERNAL_ERROR' }, 500);
  }
});

function okJson(body: ExportResultatsResponse): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errJson(body: ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
