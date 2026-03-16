/**
 * Edge Function : get-releve-notes
 * M14 — Génération des relevés de notes par candidat / établissement / centre
 *
 * Accès : admin | tutelle | chef_etablissement | chef_centre
 * POST /functions/v1/get-releve-notes
 *
 * Body : {
 *   examen_id: string,
 *   scope: 'candidat' | 'etablissement' | 'centre',
 *   scope_id: string,         // candidat_id | etablissement_id | centre_id
 *   lot_size?: number,        // pagination (défaut 50)
 *   lot_offset?: number       // 0-based (défaut 0)
 * }
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { requireAuth, createServiceClient, AuthError } from '../_shared/auth.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReleveScope = 'candidat' | 'etablissement' | 'centre';

interface ReleveRequest {
  examen_id: string;
  scope: ReleveScope;
  scope_id: string;
  lot_size: number;
  lot_offset: number;
}

interface NoteItem {
  discipline_id: string;
  discipline_libelle: string;
  coefficient: number;
  note_centimes: number | null;
}

interface CandidatReleve {
  candidat: {
    id: string;
    nom: string;
    prenom: string;
    date_naissance: string | null;
    lieu_naissance: string | null;
    matricule: string | null;
    numero_table: number | null;
    etablissement_nom: string | null;
    serie_code: string | null;
  };
  examen: {
    id: string;
    libelle: string;
    annee: number;
    logo_url: string | null;
    signature_url: string | null;
    organisateur: string;
  };
  notes: NoteItem[];
  resultat: {
    status: string | null;
    moyenne_centimes: number | null;
    phase: string | null;
    delibere_at: string | null;
  };
}

interface ReleveResponse {
  data: CandidatReleve[];
  total: number;
  lot_size: number;
  lot_offset: number;
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

function validateRequest(body: unknown): ReleveRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Corps de requête invalide');
  }
  const b = body as Record<string, unknown>;

  if (!b.examen_id || typeof b.examen_id !== 'string') {
    throw new ValidationError('examen_id requis');
  }
  if (!b.scope || !['candidat', 'etablissement', 'centre'].includes(b.scope as string)) {
    throw new ValidationError('scope invalide (candidat | etablissement | centre)');
  }
  if (!b.scope_id || typeof b.scope_id !== 'string') {
    throw new ValidationError('scope_id requis');
  }

  const lot_size = typeof b.lot_size === 'number' && b.lot_size > 0 ? b.lot_size : 50;
  const lot_offset = typeof b.lot_offset === 'number' && b.lot_offset >= 0 ? b.lot_offset : 0;

  return {
    examen_id: b.examen_id,
    scope: b.scope as ReleveScope,
    scope_id: b.scope_id,
    lot_size,
    lot_offset,
  };
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

    // Seuls ces rôles peuvent accéder aux relevés
    if (
      role !== 'admin' &&
      role !== 'tutelle' &&
      role !== 'chef_etablissement' &&
      role !== 'chef_centre'
    ) {
      return errJson({ error: 'Accès refusé', code: 'FORBIDDEN' }, 403);
    }

    const input = validateRequest(await req.json());
    const supabase = createServiceClient();

    // ── Vérifier que l'examen existe ─────────────────────────────────────────
    const { data: examen, error: examenError } = await supabase
      .from('examens')
      .select('id, libelle, annee, status, logo_url, signature_url')
      .eq('id', input.examen_id)
      .single();

    if (examenError || !examen) {
      return errJson({ error: 'Examen introuvable', code: 'EXAMEN_NOT_FOUND' }, 404);
    }

    // ── Contrôle RBAC par scope ───────────────────────────────────────────────
    if (role === 'chef_centre') {
      // Un chef de centre peut seulement voir les relevés de son centre
      if (input.scope !== 'centre') {
        return errJson(
          { error: 'Un chef de centre ne peut accéder qu\'aux relevés par centre', code: 'FORBIDDEN' },
          403,
        );
      }
      // Vérifier que le centre appartient à cet utilisateur
      const { data: uc, error: ucErr } = await supabase
        .from('user_centres')
        .select('centre_id')
        .eq('user_id', userId)
        .eq('centre_id', input.scope_id)
        .maybeSingle();

      if (ucErr) throw ucErr;
      if (!uc) {
        return errJson({ error: 'Accès refusé à ce centre', code: 'FORBIDDEN' }, 403);
      }
    } else if (role === 'chef_etablissement') {
      // Un chef d'établissement peut seulement voir les relevés de son établissement
      if (input.scope !== 'etablissement') {
        return errJson(
          { error: 'Un chef d\'établissement ne peut accéder qu\'aux relevés par établissement', code: 'FORBIDDEN' },
          403,
        );
      }
      // Vérifier que l'établissement appartient à cet utilisateur
      const { data: ue, error: ueErr } = await supabase
        .from('user_etablissements')
        .select('etablissement_id')
        .eq('user_id', userId)
        .eq('etablissement_id', input.scope_id)
        .maybeSingle();

      if (ueErr) throw ueErr;
      if (!ue) {
        return errJson({ error: 'Accès refusé à cet établissement', code: 'FORBIDDEN' }, 403);
      }
    }
    // admin et tutelle : accès libre à tous les scopes

    // ── Construire la liste des candidat_id à traiter ─────────────────────────
    let candidatIds: string[] = [];
    let total = 0;

    if (input.scope === 'candidat') {
      // Un seul candidat — vérifier qu'il existe dans cet examen
      const { data: cand, error: candErr } = await supabase
        .from('candidats')
        .select('id')
        .eq('id', input.scope_id)
        .eq('examen_id', input.examen_id)
        .maybeSingle();

      if (candErr) throw candErr;
      if (!cand) {
        return errJson({ error: 'Candidat introuvable pour cet examen', code: 'CANDIDAT_NOT_FOUND' }, 404);
      }
      candidatIds = [input.scope_id];
      total = 1;
    } else if (input.scope === 'etablissement') {
      // Compter le total
      const { count, error: countErr } = await supabase
        .from('candidats')
        .select('id', { count: 'exact', head: true })
        .eq('examen_id', input.examen_id)
        .eq('etablissement_id', input.scope_id);

      if (countErr) throw countErr;
      total = count ?? 0;

      // Récupérer les IDs paginés
      const { data: cands, error: candsErr } = await supabase
        .from('candidats')
        .select('id')
        .eq('examen_id', input.examen_id)
        .eq('etablissement_id', input.scope_id)
        .order('id')
        .range(input.lot_offset, input.lot_offset + input.lot_size - 1);

      if (candsErr) throw candsErr;
      candidatIds = (cands ?? []).map((c: { id: string }) => c.id);
    } else {
      // scope === 'centre'
      const { count, error: countErr } = await supabase
        .from('candidats')
        .select('id', { count: 'exact', head: true })
        .eq('examen_id', input.examen_id)
        .eq('centre_id', input.scope_id);

      if (countErr) throw countErr;
      total = count ?? 0;

      const { data: cands, error: candsErr } = await supabase
        .from('candidats')
        .select('id')
        .eq('examen_id', input.examen_id)
        .eq('centre_id', input.scope_id)
        .order('id')
        .range(input.lot_offset, input.lot_offset + input.lot_size - 1);

      if (candsErr) throw candsErr;
      candidatIds = (cands ?? []).map((c: { id: string }) => c.id);
    }

    if (candidatIds.length === 0) {
      const response: ReleveResponse = {
        data: [],
        total,
        lot_size: input.lot_size,
        lot_offset: input.lot_offset,
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Récupérer les données complètes des candidats ─────────────────────────
    type CandidatDbRow = {
      id: string;
      nom: string;
      prenom: string;
      date_naissance: string | null;
      lieu_naissance: string | null;
      matricule: string | null;
      etablissements: { nom: string } | null;
      series: { code: string } | null;
    };

    const { data: candidatsData, error: candidatsErr } = await supabase
      .from('candidats')
      .select(`
        id,
        nom,
        prenom,
        date_naissance,
        lieu_naissance,
        matricule,
        etablissements ( nom ),
        series ( code )
      `)
      .in('id', candidatIds);

    if (candidatsErr) throw candidatsErr;

    // ── Numéros de table depuis candidat_lots (1 par candidat par examen) ─────
    type CandidatLotRow = {
      candidat_id: string;
      numero_table: number | null;
    };

    const { data: lotsData, error: lotsErr } = await supabase
      .from('candidat_lots')
      .select(`
        candidat_id,
        numero_table
      `)
      .in('candidat_id', candidatIds)
      .eq('lots.examen_id', input.examen_id);

    if (lotsErr) {
      // La jointure interne peut échouer si lots n'a pas de ligne pour cet examen ;
      // on continue avec un tableau vide (numero_table sera null)
      console.warn('[get-releve-notes] Erreur récupération lots:', lotsErr.message);
    }

    // Construire une map candidat_id → numero_table
    const tableMap = new Map<string, number | null>();
    for (const lt of (lotsData ?? []) as CandidatLotRow[]) {
      if (!tableMap.has(lt.candidat_id)) {
        tableMap.set(lt.candidat_id, lt.numero_table);
      }
    }

    // Fallback si la jointure interne a foiré : requête directe candidat_lots → lots
    if (tableMap.size === 0 && candidatIds.length > 0) {
      const { data: lotsAlt } = await supabase
        .from('candidat_lots')
        .select('candidat_id, numero_table, lots!inner(examen_id)')
        .in('candidat_id', candidatIds)
        .eq('lots.examen_id', input.examen_id);

      for (const lt of (lotsAlt ?? []) as Array<{ candidat_id: string; numero_table: number | null }>) {
        if (!tableMap.has(lt.candidat_id)) {
          tableMap.set(lt.candidat_id, lt.numero_table);
        }
      }
    }

    // ── Disciplines de l'examen ───────────────────────────────────────────────
    type ExDisciplineRow = {
      id: string;
      coefficient: number;
      disciplines: { id: string; libelle: string } | null;
    };

    const { data: disciplinesData, error: discErr } = await supabase
      .from('examen_disciplines')
      .select(`
        id,
        coefficient,
        disciplines ( id, libelle )
      `)
      .eq('examen_id', input.examen_id);

    if (discErr) throw discErr;

    // Map examen_discipline_id → { discipline_id, libelle, coefficient }
    const discMap = new Map<string, { discipline_id: string; libelle: string; coefficient: number }>();
    for (const ed of (disciplinesData ?? []) as ExDisciplineRow[]) {
      if (ed.disciplines) {
        discMap.set(ed.id, {
          discipline_id: ed.disciplines.id,
          libelle: ed.disciplines.libelle,
          coefficient: ed.coefficient,
        });
      }
    }

    // ── Notes des candidats ───────────────────────────────────────────────────
    // saisies → via candidat_lots (filtré par examen via la discipline)
    type SaisieRow = {
      candidat_lot_id: string;
      note_centimes: number | null;
      candidat_lots: {
        candidat_id: string;
        examen_discipline_id: string;
      } | null;
    };

    const { data: saisiesData, error: saisiesErr } = await supabase
      .from('saisies')
      .select(`
        candidat_lot_id,
        note_centimes,
        candidat_lots!inner (
          candidat_id,
          examen_discipline_id
        )
      `)
      .in('candidat_lots.candidat_id', candidatIds);

    if (saisiesErr) {
      console.warn('[get-releve-notes] Erreur récupération saisies:', saisiesErr.message);
    }

    // Construire map : candidat_id → Map<examen_discipline_id, note_centimes>
    const notesMap = new Map<string, Map<string, number | null>>();
    for (const s of (saisiesData ?? []) as SaisieRow[]) {
      if (!s.candidat_lots) continue;
      const { candidat_id, examen_discipline_id } = s.candidat_lots;
      if (!notesMap.has(candidat_id)) {
        notesMap.set(candidat_id, new Map());
      }
      notesMap.get(candidat_id)!.set(examen_discipline_id, s.note_centimes);
    }

    // ── Résultats ─────────────────────────────────────────────────────────────
    type ResultatRow = {
      candidat_id: string;
      status: string;
      moyenne_centimes: number | null;
      phase: string | null;
      delibere_at: string | null;
    };

    const { data: resultatsData, error: resultatsErr } = await supabase
      .from('resultats')
      .select('candidat_id, status, moyenne_centimes, phase, delibere_at')
      .eq('examen_id', input.examen_id)
      .in('candidat_id', candidatIds);

    if (resultatsErr) {
      console.warn('[get-releve-notes] Erreur récupération résultats:', resultatsErr.message);
    }

    const resultatMap = new Map<string, ResultatRow>();
    for (const r of (resultatsData ?? []) as ResultatRow[]) {
      resultatMap.set(r.candidat_id, r);
    }

    // ── Assembler la réponse ──────────────────────────────────────────────────
    const examenOrganisateur = 'DDEST-FP Alibori — Bénin';

    const releveData: CandidatReleve[] = (candidatsData ?? []).map((c: CandidatDbRow) => {
      const candidatNotes = notesMap.get(c.id) ?? new Map<string, number | null>();
      const resultat = resultatMap.get(c.id);

      const notes: NoteItem[] = [];
      for (const [edId, discInfo] of discMap.entries()) {
        notes.push({
          discipline_id: discInfo.discipline_id,
          discipline_libelle: discInfo.libelle,
          coefficient: discInfo.coefficient,
          note_centimes: candidatNotes.get(edId) ?? null,
        });
      }

      return {
        candidat: {
          id: c.id,
          nom: c.nom,
          prenom: c.prenom,
          date_naissance: c.date_naissance,
          lieu_naissance: c.lieu_naissance,
          matricule: c.matricule,
          numero_table: tableMap.get(c.id) ?? null,
          etablissement_nom: c.etablissements?.nom ?? null,
          serie_code: c.series?.code ?? null,
        },
        examen: {
          id: examen.id,
          libelle: examen.libelle,
          annee: examen.annee,
          logo_url: examen.logo_url,
          signature_url: examen.signature_url,
          organisateur: examenOrganisateur,
        },
        notes,
        resultat: {
          status: resultat?.status ?? null,
          moyenne_centimes: resultat?.moyenne_centimes ?? null,
          phase: resultat?.phase ?? null,
          delibere_at: resultat?.delibere_at ?? null,
        },
      };
    });

    const response: ReleveResponse = {
      data: releveData,
      total,
      lot_size: input.lot_size,
      lot_offset: input.lot_offset,
    };

    return new Response(JSON.stringify(response), {
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
    console.error('[get-releve-notes] Erreur inattendue:', err);
    return errJson({ error: 'Erreur interne', code: 'INTERNAL_ERROR' }, 500);
  }
});

function errJson(body: ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
