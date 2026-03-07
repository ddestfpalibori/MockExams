import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types/auth';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles?: Role[];
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
    const { session, isLoading, hasPermission } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-brand-subtle">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    // Non authentifié -> Login
    if (!session) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    // Vérification des rôles si spécifiés
    if (allowedRoles && allowedRoles.length > 0 && !hasPermission(allowedRoles)) {
        return <Navigate to="/403" replace />;
    }

    return <>{children}</>;
};
