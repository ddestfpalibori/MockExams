import { supabase } from '@/lib/supabase';
import type { EtablissementRow, ImportLogRow } from '@/types/domain';

export interface EtablissementStats {
    nb_candidats: number;
    nb_examens_actifs: number;
    derniere_import_at: string | null;
}

/**
 * Service pour la gestion des établissements (M05)
 */
export const etablissementService = {
    /** Récupère les établissements de l'utilisateur courant (RLS via my_etablissement_ids) */
    async fetchMyEtablissements(): Promise<EtablissementRow[]> {
        const { data, error } = await supabase
            .from('etablissements')
            .select('*')
            .order('nom');

        if (error) throw error;
        return data as EtablissementRow[];
    },

    /** Statistiques d'un établissement */
    async fetchEtablissementStats(etablissementId: string): Promise<EtablissementStats> {
        const [candidatsRes, importsRes] = await Promise.all([
            supabase
                .from('candidats')
                .select('id', { count: 'exact', head: true })
                .eq('etablissement_id', etablissementId),
            supabase
                .from('imports_log')
                .select('created_at')
                .eq('etablissement_id', etablissementId)
                .order('created_at', { ascending: false })
                .limit(1),
        ]);

        if (candidatsRes.error) throw candidatsRes.error;
        if (importsRes.error) throw importsRes.error;

        return {
            nb_candidats: candidatsRes.count ?? 0,
            nb_examens_actifs: 0, // calculé côté page via useExamens
            derniere_import_at: importsRes.data?.[0]?.created_at ?? null,
        };
    },

    /** Historique des imports d'un établissement (10 derniers) */
    async fetchImportsLog(etablissementId: string): Promise<ImportLogRow[]> {
        const { data, error } = await supabase
            .from('imports_log')
            .select(
                'id, examen_id, etablissement_id, imported_by, fichier_nom, nb_candidats_fichier, nb_succes, nb_erreurs, import_legal_confirmed, import_legal_confirmed_at, created_at'
            )
            .eq('etablissement_id', etablissementId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data as ImportLogRow[];
    },
};
