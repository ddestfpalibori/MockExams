import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../ui/LoadingSpinner';

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
        <div className="min-h-screen bg-brand-subtle flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-secondary">
                    MockExams
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    Système Institutionnel DDEST-FP
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-brand-subtle sm:rounded-lg sm:px-10 border border-slate-200">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};
