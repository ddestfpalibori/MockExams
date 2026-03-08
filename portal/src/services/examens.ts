import { supabase } from '@/lib/supabase';
import type { ExamenRow, ExamStatus } from '@/types/domain';
import type { Database } from '@/lib/database.types';

export type CreateExamenInput = Database['public']['Tables']['examens']['Insert'];
export type UpdateExamenInput = Database['public']['Tables']['examens']['Update'];

/**
 * Service pour la gestion des examens (M02)
 */
export const examenService = {
    /** Récupère la liste des examens accessibles à l'utilisateur */
    async fetchExamens(): Promise<ExamenRow[]> {
        const { data, error } = await supabase
            .from('examens')
            .select('*')
            .order('annee', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as ExamenRow[];
    },

    /** Récupère un examen par son ID */
    async fetchExamenById(id: string): Promise<ExamenRow> {
        const { data, error } = await supabase
            .from('examens')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as ExamenRow;
    },

    /** Crée un nouvel examen */
    async createExamen(input: CreateExamenInput): Promise<ExamenRow> {
        const { data, error } = await supabase
            .from('examens')
            .insert(input)
            .select()
            .single();

        if (error) throw error;
        return data as ExamenRow;
    },

    /** Met à jour un examen existant */
    async updateExamen(id: string, input: UpdateExamenInput): Promise<ExamenRow> {
        const { data, error } = await supabase
            .from('examens')
            .update(input)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as ExamenRow;
    },

    /** Change le statut (phase) d'un examen */
    async transitionnerPhase(id: string, phase: ExamStatus): Promise<void> {
        const { error } = await supabase
            .from('examens')
            .update({ status: phase })
            .eq('id', id);

        if (error) throw error;
    },

    /** Récupère les statistiques globales pour le Dashboard Admin */
    async fetchExamenStats() {
        // En conditions réelles, on pourrait utiliser un RPC ou des count séparés
        const [
            { count: total_examens },
            { count: examens_actifs },
            { count: total_centres },
            { count: total_candidats }
        ] = await Promise.all([
            supabase.from('examens').select('*', { count: 'exact', head: true }),
            supabase.from('examens').select('*', { count: 'exact', head: true }).not('status', 'in', '("PUBLIE","CLOS")'),
            supabase.from('centres').select('*', { count: 'exact', head: true }),
            supabase.from('candidats').select('*', { count: 'exact', head: true }),
        ]);

        return {
            total_examens: total_examens || 0,
            examens_actifs: examens_actifs || 0,
            total_centres: total_centres || 0,
            total_candidats: total_candidats || 0,
        };
    },

    /** Lancement de la délibération (RPC F03) */
    async delibererExamen(id: string, userId: string) {
        const { data, error } = await supabase.rpc('deliberer_examen', {
            p_examen_id: id,
            p_delibere_par: userId
        });

        if (error) throw error;
        return data;
    }
};
