import { supabase } from '@/lib/supabase';
import type { ResultatStatus } from '@/types/domain';

export interface ResultatRow {
    id: string;
    examen_id: string;
    candidat_id: string;
    numero_anonyme: string | null;
    status: ResultatStatus;
    moyenne_centimes: number | null;
    phase: number;
    delibere_at: string | null;
}

/**
 * Service résultats — lecture seule.
 * Accessible tutelle (tous examens via RLS) + public via Edge Function.
 */
export const resultatService = {
    async fetchResultats(params: {
        examenId: string;
        page: number;
        pageSize: number;
        statusFilter?: ResultatStatus;
    }): Promise<{ data: ResultatRow[]; count: number }> {
        const from = (params.page - 1) * params.pageSize;
        const to = from + params.pageSize - 1;

        let query = supabase
            .from('resultats')
            .select(`
                id,
                examen_id,
                candidat_id,
                status,
                moyenne_centimes,
                phase,
                delibere_at,
                candidats!inner(numero_anonyme)
            `, { count: 'exact' })
            .eq('examen_id', params.examenId)
            .range(from, to)
            .order('delibere_at', { ascending: false, nullsFirst: false });

        if (params.statusFilter) {
            query = query.eq('status', params.statusFilter);
        }

        const { data, error, count } = await query;
        if (error) throw error;

        // Aplatir la jointure candidats.numero_anonyme
        const rows: ResultatRow[] = (data ?? []).map((r) => ({
            id: r.id,
            examen_id: r.examen_id,
            candidat_id: r.candidat_id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            numero_anonyme: (r as any).candidats?.numero_anonyme ?? null,
            status: r.status,
            moyenne_centimes: r.moyenne_centimes,
            phase: r.phase,
            delibere_at: r.delibere_at,
        }));

        return { data: rows, count: count ?? 0 };
    },
};
