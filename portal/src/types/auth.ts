/**
 * Types partagés d'authentification
 * Centralisé pour éviter les duplicatas dans AuthContext + RoleGuard
 */

import type { Session, User } from '@supabase/supabase-js';

export type Role = 'admin' | 'chef_centre' | 'chef_etablissement' | 'tutelle' | 'enseignant';

export interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: Role | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    hasPermission: (requiredRoles: Role[]) => boolean;
}
