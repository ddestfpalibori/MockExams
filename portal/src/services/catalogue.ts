import { supabase } from '@/lib/supabase';
import type { DisciplineRow, SerieRow } from '@/types/domain';

/**
 * Service pour les données de référence du catalogue (M00)
 * disciplines et séries sont quasi-statiques — cachées longtemps.
 */
export const catalogueService = {
    async fetchDisciplines(): Promise<DisciplineRow[]> {
        const { data, error } = await supabase
            .from('disciplines')
            .select('*')
            .order('libelle');

        if (error) throw error;
        return data as DisciplineRow[];
    },

    async fetchSeries(): Promise<SerieRow[]> {
        const { data, error } = await supabase
            .from('series')
            .select('*')
            .order('ordre');

        if (error) throw error;
        return data as SerieRow[];
    },
};
