import { createContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Role, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRole = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (!error && data) {
                setRole(data.role as Role);
            }
        } catch (err) {
            console.error('Erreur récupération rôle:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Le listener onAuthStateChange de Supabase v2 émet INITIAL_SESSION
        // immédiatement, ce qui remplace le besoin de getSession() et évite les doubles appels.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchRole(session.user.id);
            } else {
                setRole(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchRole]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const hasPermission = (requiredRoles: Role[]) => {
        if (!role) return false;
        if (role === 'admin') return true; // admin accède à tout
        return requiredRoles.includes(role);
    };

    const value = {
        session,
        user,
        role,
        isLoading,
        signOut,
        hasPermission,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export du contexte pour le hook séparé
export { AuthContext };
