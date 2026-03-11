import { supabase } from '@/lib/supabase';
import type { ProfileRow, UserRole } from '@/types/domain';

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
        const { data, error } = await supabase.functions.invoke('manage-users', {
            body: { action: 'create', ...payload },
        });

        if (error) throw error;
        return data;
    },

    /** Réinitialise le mot de passe d'un utilisateur via Edge Function (Admin uniquement) */
    async resetPassword(userId: string, newPassword: string) {
        const { data, error } = await supabase.functions.invoke('manage-users', {
            body: { action: 'update', user_id: userId, password: newPassword },
        });

        if (error) throw error;
        return data;
    },

    /**
     * Désactive un utilisateur via Edge Function
     * (Supabase Auth ne permet pas de désactiver directement depuis le client)
     */
    async disableUser(userId: string) {
        const { data, error } = await supabase.functions.invoke('manage-users', {
            body: { action: 'disable', user_id: userId },
        });

        if (error) throw error;
        return data;
    },
};
