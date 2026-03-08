import { supabase } from '@/lib/supabase';
import type { CandidatRow } from '@/types/domain';

/**
 * Service pour la gestion des candidats (M03)
 * Focus sur la pagination serveur et la sécurité (PII).
 */
export const candidatService = {
    /**
     * Récupère les candidats d'un examen avec pagination et recherche
     * JAMAIS de select('*') pour éviter les colonnes chiffrées _enc.
     */
    async fetchCandidats(params: {
        examenId: string;
        page: number;
        pageSize: number;
        search?: string;
    }): Promise<{ data: CandidatRow[]; count: number }> {
        const from = (params.page - 1) * params.pageSize;
        const to = from + params.pageSize - 1;

        let query = supabase
            .from('candidats')
            .select(`
                id,
                numero_anonyme,
                serie_id,
                centre_id,
                salle_id,
                numero_table
            `, { count: 'exact' })
            .eq('examen_id', params.examenId)
            .range(from, to);

        if (params.search) {
            // Recherche simple sur le numéro anonyme (déjà non-PII)
            query = query.ilike('numero_anonyme', `%${params.search}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return {
            data: (data || []) as CandidatRow[],
            count: count || 0,
        };
    },

};
