import { supabase } from '@/lib/supabase';
import type { CentreRow, SalleRow } from '@/types/domain';
import type { Database } from '@/lib/database.types';
import type {
    PreparationCentreImportResult,
    PreparationCentreImportRow,
} from '@/services/preparationCentreTypes';

type SalleInsert = Database['public']['Tables']['salles']['Insert'];
type SalleUpdate = Database['public']['Tables']['salles']['Update'];

export interface CentreStats {
    nb_salles: number;
    nb_candidats: number;
}

/**
 * Service pour la gestion des centres et salles (M04)
 */
export const centreService = {
    /** Récupère tous les centres */
    async fetchCentres(): Promise<CentreRow[]> {
        const { data, error } = await supabase
            .from('centres')
            .select('*')
            .order('nom');

        if (error) throw error;
        return data as CentreRow[];
    },

    /** Récupère les centres rattachés à l'utilisateur courant (RLS) */
    async fetchMyCentres(): Promise<CentreRow[]> {
        // La RLS s'occupe de filtrer via my_centre_ids()
        const { data, error } = await supabase
            .from('centres')
            .select('*');

        if (error) throw error;
        return data as CentreRow[];
    },

    /** Récupère les salles d'un centre, optionnellement filtrées par examen */
    async fetchSalles(centreId: string, examenId?: string): Promise<SalleRow[]> {
        let query = supabase
            .from('salles')
            .select('*')
            .eq('centre_id', centreId)
            .order('ordre');

        if (examenId) {
            query = query.eq('examen_id', examenId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as SalleRow[];
    },

    /** Crée une salle */
    async createSalle(input: SalleInsert): Promise<SalleRow> {
        const { data, error } = await supabase
            .from('salles')
            .insert(input)
            .select()
            .single();

        if (error) throw error;
        return data as SalleRow;
    },

    /** Met à jour une salle */
    async updateSalle(id: string, input: SalleUpdate): Promise<SalleRow> {
        const { data, error } = await supabase
            .from('salles')
            .update(input)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as SalleRow;
    },

    /** Supprime une salle */
    async deleteSalle(id: string): Promise<void> {
        const { error } = await supabase
            .from('salles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /** Statistiques d'un centre (nb salles + nb candidats) */
    async fetchCentreStats(centreId: string): Promise<CentreStats> {
        const [sallesRes, candidatsRes] = await Promise.all([
            supabase
                .from('salles')
                .select('id', { count: 'exact', head: true })
                .eq('centre_id', centreId),
            supabase
                .from('candidats')
                .select('id', { count: 'exact', head: true })
                .eq('centre_id', centreId),
        ]);

        if (sallesRes.error) throw sallesRes.error;
        if (candidatsRes.error) throw candidatsRes.error;

        return {
            nb_salles: sallesRes.count ?? 0,
            nb_candidats: candidatsRes.count ?? 0,
        };
    },

    /** RPC F04 — Affecte les candidats aux salles pour un examen+centre */
    async affecter(centreId: string, examenId: string): Promise<number> {
        const { data, error } = await supabase.rpc('affecter_candidats_salles', {
            p_centre_id: centreId,
            p_examen_id: examenId,
        });

        if (error) throw error;
        return data as number;
    },

    /** RPC F05 — Génère les numéros anonymes pour un centre (IDEMPOTENTE) */
    async genererAnonymats(centreId: string, examenId: string): Promise<number> {
        const { data, error } = await supabase.rpc('generer_anonymats_centre', {
            p_centre_id: centreId,
            p_examen_id: examenId,
        });

        if (error) throw error;
        return data as number;
    },

    /** Vérifie si des numéros de table manquent (pré-check UI) */
    async countMissingTableNumbers(centreId: string, examenId: string): Promise<number> {
        const { count, error } = await supabase
            .from('candidats')
            .select('id', { count: 'exact', head: true })
            .eq('centre_id', centreId)
            .eq('examen_id', examenId)
            .is('numero_anonyme', null)
            .is('numero_table', null);

        if (error) throw error;
        return count ?? 0;
    },

    /** RPC — Reprise des informations de preparation deja faites dans un centre */
    async reprendrePreparationCentre(params: {
        centreId: string;
        examenId: string;
        mode: 'validate_only' | 'fill_only' | 'overwrite_confirmed';
        rows: PreparationCentreImportRow[];
    }): Promise<PreparationCentreImportResult> {
        const { data, error } = await supabase.rpc('reprendre_preparation_centre', {
            p_examen_id: params.examenId,
            p_centre_id: params.centreId,
            p_mode: params.mode,
            p_rows: params.rows,
        });

        if (error) throw error;
        return data;
    },

    /** Met à jour un centre */
    async updateCentre(id: string, input: Partial<CentreRow>): Promise<CentreRow> {
        const { data, error } = await supabase
            .from('centres')
            .update(input)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as CentreRow;
    },
};
