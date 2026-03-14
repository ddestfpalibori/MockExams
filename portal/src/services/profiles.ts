import { supabase } from '@/lib/supabase';
import { efInvoke } from '@/lib/efInvoke';
import type { ProfileRow, UserRole, CentreRow, EtablissementRow } from '@/types/domain';

export interface UserAssignments {
    centres: CentreRow[];
    etablissements: EtablissementRow[];
}

/**
 * Service pour la gestion des profils et utilisateurs (M01)
 * Certaines actions passent par des Edge Functions (manage-users).
 */
export const profileService = {
    /** Récupère tous les profils (Admin uniquement) */
    async fetchProfiles(): Promise<ProfileRow[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as ProfileRow[];
    },

    /** Récupère le profil de l'utilisateur courant */
    async fetchMe(): Promise<ProfileRow> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Non authentifié');

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw error;
        return data as ProfileRow;
    },

    /** Crée un utilisateur via Edge Function manage-users */
    async createUser(payload: {
        identifier: string;
        password: string;
        role: UserRole;
        nom: string;
        prenom: string;
        telephone?: string;
    }) {
        return efInvoke('manage-users', { action: 'create', ...payload });
    },

    /** Réinitialise le mot de passe d'un utilisateur via Edge Function (Admin uniquement) */
    async resetPassword(userId: string, newPassword: string) {
        return efInvoke('manage-users', { action: 'update', user_id: userId, password: newPassword });
    },

    /**
     * Désactive un utilisateur via Edge Function
     * (Supabase Auth ne permet pas de désactiver directement depuis le client)
     */
    async disableUser(userId: string) {
        return efInvoke('manage-users', { action: 'disable', user_id: userId });
    },

    /** Récupère les centres et établissements affectés à un utilisateur */
    async fetchUserAssignments(userId: string): Promise<UserAssignments> {
        const [centresRes, etablissementsRes] = await Promise.all([
            supabase
                .from('user_centres')
                .select('centres(*)')
                .eq('user_id', userId),
            supabase
                .from('user_etablissements')
                .select('etablissements(*)')
                .eq('user_id', userId),
        ]);

        if (centresRes.error) throw centresRes.error;
        if (etablissementsRes.error) throw etablissementsRes.error;

        return {
            centres: (centresRes.data ?? [])
                .map((r) => r.centres)
                .flatMap((c) => c ? [c] : []),
            etablissements: (etablissementsRes.data ?? [])
                .map((r) => r.etablissements)
                .flatMap((e) => e ? [e] : []),
        };
    },

    /** Affecte un centre à un utilisateur (admin only via RLS) */
    async assignCentre(userId: string, centreId: string): Promise<void> {
        const { error } = await supabase
            .from('user_centres')
            .insert({ user_id: userId, centre_id: centreId });

        if (error) throw error;
    },

    /** Retire l'affectation d'un centre à un utilisateur */
    async removeCentre(userId: string, centreId: string): Promise<void> {
        const { error } = await supabase
            .from('user_centres')
            .delete()
            .eq('user_id', userId)
            .eq('centre_id', centreId);

        if (error) throw error;
    },

    /** Affecte un établissement à un utilisateur (admin only via RLS) */
    async assignEtablissement(userId: string, etablissementId: string): Promise<void> {
        const { error } = await supabase
            .from('user_etablissements')
            .insert({ user_id: userId, etablissement_id: etablissementId });

        if (error) throw error;
    },

    /** Retire l'affectation d'un établissement à un utilisateur */
    async removeEtablissement(userId: string, etablissementId: string): Promise<void> {
        const { error } = await supabase
            .from('user_etablissements')
            .delete()
            .eq('user_id', userId)
            .eq('etablissement_id', etablissementId);

        if (error) throw error;
    },
};
