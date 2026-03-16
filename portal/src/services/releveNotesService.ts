import { efInvoke } from '@/lib/efInvoke';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NoteItem {
    discipline_id: string;
    discipline_libelle: string;
    coefficient: number;
    note_centimes: number | null;
}

export interface CandidatReleve {
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

export interface ReleveResponse {
    data: CandidatReleve[];
    total: number;
    lot_size: number;
    lot_offset: number;
}

export type ReleveScope = 'candidat' | 'etablissement' | 'centre';

export interface FetchReleveParams {
    examenId: string;
    scope: ReleveScope;
    scopeId: string;
    lotSize?: number;
    lotOffset?: number;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchReleve(params: FetchReleveParams): Promise<ReleveResponse> {
    return efInvoke<ReleveResponse>('get-releve-notes', {
        examen_id: params.examenId,
        scope: params.scope,
        scope_id: params.scopeId,
        ...(params.lotSize !== undefined ? { lot_size: params.lotSize } : {}),
        ...(params.lotOffset !== undefined ? { lot_offset: params.lotOffset } : {}),
    });
}
