import { supabase } from '@/lib/supabase';
import type { EtablissementRow } from '@/types/domain';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ExamenLien {
    id: string;
    examen_cible_id: string;
    examen_source_id: string;
    mode_heritage: 'tous' | 'non_admis_uniquement';
    created_at: string;
}

export interface ExamenLienDetail extends ExamenLien {
    etablissement_ids: string[];
    examen_source: { id: string; libelle: string; annee: number; status: string } | null;
}

export interface CopierCandidatsResult {
    copies: number;
    ignores: number;
}

export interface CreateLienInput {
    examen_cible_id: string;
    examen_source_id: string;
    mode_heritage: 'tous' | 'non_admis_uniquement';
    etablissement_ids: string[];
}

export interface UpdateLienInput {
    mode_heritage: 'tous' | 'non_admis_uniquement';
    etablissement_ids: string[];
}

// ── Service ────────────────────────────────────────────────────────────────────

export const examenLiensService = {
    /**
     * Récupère le lien source d'un examen cible (au plus un, contrainte UNIQUE)
     */
    async fetchLienByExamenCible(examenCibleId: string): Promise<ExamenLienDetail | null> {
        const { data, error } = await supabase
            .from('examen_liens')
            .select(`
                id,
                examen_cible_id,
                examen_source_id,
                mode_heritage,
                created_at,
                examen_lien_etablissements ( etablissement_id ),
                examen_source:examens!examen_liens_examen_source_id_fkey (
                    id,
                    libelle,
                    annee,
                    status
                )
            `)
            .eq('examen_cible_id', examenCibleId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        const raw = data as {
            id: string;
            examen_cible_id: string;
            examen_source_id: string;
            mode_heritage: string;
            created_at: string;
            examen_lien_etablissements: Array<{ etablissement_id: string }>;
            examen_source: { id: string; libelle: string; annee: number; status: string } | null;
        };

        return {
            id: raw.id,
            examen_cible_id: raw.examen_cible_id,
            examen_source_id: raw.examen_source_id,
            mode_heritage: raw.mode_heritage as 'tous' | 'non_admis_uniquement',
            created_at: raw.created_at,
            etablissement_ids: raw.examen_lien_etablissements.map((e) => e.etablissement_id),
            examen_source: raw.examen_source,
        };
    },

    /**
     * Récupère les établissements communs entre deux examens
     * (intersection de leurs examen_etablissements respectifs)
     */
    async fetchEtablissementsCommuns(
        examenSourceId: string,
        examenCibleId: string,
    ): Promise<EtablissementRow[]> {
        // Établissements de l'examen source
        const { data: sourceData, error: sourceError } = await supabase
            .from('examen_etablissements')
            .select('etablissement_id, etablissements ( id, code, nom, ville, is_active, created_at, updated_at )')
            .eq('examen_id', examenSourceId);

        if (sourceError) throw sourceError;

        // Établissements de l'examen cible
        const { data: cibleData, error: cibleError } = await supabase
            .from('examen_etablissements')
            .select('etablissement_id')
            .eq('examen_id', examenCibleId);

        if (cibleError) throw cibleError;

        const cibleIds = new Set(cibleData.map((r) => r.etablissement_id));

        return (sourceData ?? [])
            .filter((r) => cibleIds.has(r.etablissement_id))
            .map((r) => r.etablissements as unknown as EtablissementRow)
            .filter(Boolean);
    },

    /**
     * Crée un nouveau lien inter-examens (avec sous-ensemble d'établissements optionnel)
     */
    async createLien(data: CreateLienInput): Promise<ExamenLien> {
        const { data: lien, error } = await supabase
            .from('examen_liens')
            .insert({
                examen_cible_id: data.examen_cible_id,
                examen_source_id: data.examen_source_id,
                mode_heritage: data.mode_heritage,
            })
            .select()
            .single();

        if (error) throw error;

        // Insérer les établissements sélectionnés (si liste non vide)
        if (data.etablissement_ids.length > 0) {
            const { error: eleError } = await supabase
                .from('examen_lien_etablissements')
                .insert(
                    data.etablissement_ids.map((etablissement_id) => ({
                        lien_id: lien.id,
                        etablissement_id,
                    })),
                );
            if (eleError) throw eleError;
        }

        return {
            id: lien.id,
            examen_cible_id: lien.examen_cible_id,
            examen_source_id: lien.examen_source_id,
            mode_heritage: lien.mode_heritage as 'tous' | 'non_admis_uniquement',
            created_at: lien.created_at,
        };
    },

    /**
     * Met à jour le mode d'héritage et les établissements d'un lien existant
     */
    async updateLien(id: string, data: UpdateLienInput): Promise<void> {
        // Mettre à jour le mode
        const { error: updateError } = await supabase
            .from('examen_liens')
            .update({ mode_heritage: data.mode_heritage })
            .eq('id', id);

        if (updateError) throw updateError;

        // Remplacer les établissements (DELETE + INSERT)
        const { error: deleteError } = await supabase
            .from('examen_lien_etablissements')
            .delete()
            .eq('lien_id', id);

        if (deleteError) throw deleteError;

        if (data.etablissement_ids.length > 0) {
            const { error: insertError } = await supabase
                .from('examen_lien_etablissements')
                .insert(
                    data.etablissement_ids.map((etablissement_id) => ({
                        lien_id: id,
                        etablissement_id,
                    })),
                );
            if (insertError) throw insertError;
        }
    },

    /**
     * Supprime un lien inter-examens (cascade sur examen_lien_etablissements)
     */
    async deleteLien(id: string): Promise<void> {
        const { error } = await supabase
            .from('examen_liens')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Déclenche la copie des candidats via la RPC
     * Note: cast nécessaire car la RPC n'est pas encore dans les types générés
     */
    async copierCandidats(lienId: string): Promise<CopierCandidatsResult> {
        type RpcFn = (fn: string, args: Record<string, unknown>) => ReturnType<typeof supabase.rpc>;
        const rpc = supabase.rpc as unknown as RpcFn;
        const { data, error } = await rpc('copier_candidats_depuis_lien', { p_lien_id: lienId });

        if (error) throw error;

        const result = data as { copies: number; ignores: number };
        return { copies: result.copies, ignores: result.ignores };
    },
};
