import { supabase } from '@/lib/supabase';
import type { LotRow } from '@/types/domain';

export interface LotWithDetails extends LotRow {
    discipline_libelle: string;
    discipline_code: string;
    serie_code: string | null;
}

type LotQueryResult = LotRow & {
    examen_disciplines: {
        disciplines: { code: string; libelle: string } | null;
    } | null;
    series: { code: string } | null;
};

/**
 * Service pour la gestion des lots de correction (M06)
 * Workflow : creerLots (F06) → signerLot (sign-lot) → verify-import
 */
export const lotService = {
    /** Récupère les lots d'un centre pour un examen, avec infos discipline et série */
    async fetchLots(centreId: string, examenId: string): Promise<LotWithDetails[]> {
        const { data, error } = await supabase
            .from('lots')
            .select(`
                *,
                examen_disciplines(
                    disciplines(code, libelle)
                ),
                series(code)
            `)
            .eq('centre_id', centreId)
            .eq('examen_id', examenId)
            .order('lot_numero');

        if (error) throw error;

        return (data as unknown as LotQueryResult[]).map((l) => ({
            id: l.id,
            centre_id: l.centre_id,
            examen_id: l.examen_id,
            examen_discipline_id: l.examen_discipline_id,
            serie_id: l.serie_id,
            lot_numero: l.lot_numero,
            nb_copies: l.nb_copies,
            status: l.status,
            hmac_signature: l.hmac_signature,
            generation_timestamp: l.generation_timestamp,
            created_at: l.created_at,
            updated_at: l.updated_at,
            discipline_libelle: l.examen_disciplines?.disciplines?.libelle ?? '',
            discipline_code: l.examen_disciplines?.disciplines?.code ?? '',
            serie_code: l.series?.code ?? null,
        }));
    },

    /** RPC F06 — Crée les lots pour une discipline (idempotent) */
    async creerLots(params: {
        centreId: string;
        examenDisciplineId: string;
        examenId: string;
        serieId?: string;
    }): Promise<number> {
        const { data, error } = await supabase.rpc('creer_lots_centre', {
            p_centre_id: params.centreId,
            p_examen_discipline_id: params.examenDisciplineId,
            p_examen_id: params.examenId,
            p_serie_id: params.serieId,
        });

        if (error) throw error;
        return data as number;
    },

    /** Signe un lot via Edge Function sign-lot (génère HMAC) */
    async signerLot(lotId: string): Promise<void> {
        const { error } = await supabase.functions.invoke('sign-lot', {
            body: { lot_id: lotId },
        });

        if (error) throw error;
    },
};
