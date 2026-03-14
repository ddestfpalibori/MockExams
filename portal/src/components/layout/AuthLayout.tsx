import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ShieldCheck } from 'lucide-react';

/**
 * Layout pour les pages d'authentification (M4)
 * Gère le chargement initial et la redirection des utilisateurs déjà connectés.
 */
export const AuthLayout = () => {
    const { session, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    // Si déjà connecté, on redirige vers l'application principale
    if (session) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
            <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4 border border-brand-primary/20 shadow-sm">
                    <ShieldCheck className="w-6 h-6 text-brand-primary opacity-90" />
                </div>

                <h2 className="text-3xl font-black text-primary tracking-tight">
                    MockExams
                </h2>

                <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70 bg-surface px-3 py-1 rounded-full border border-border shadow-sm">
                    DDESTFP-Alibori
                </div>

                <p className="mt-3 text-center text-xs text-muted max-w-[280px] leading-relaxed">
                    Plateforme de gestion des examens blancs, évaluations et tests
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-surface py-8 px-4 shadow-brand-xl sm:rounded-2xl sm:px-10 border border-border transition-all">
                    <Outlet />
                </div>

                <p className="mt-8 text-center text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                    Copyright &copy; {new Date().getFullYear()} • Chabi Zimé GOUNOU N'GOBI • Tous droits réservés
                </p>
            </div>
        </div>
    );
};
