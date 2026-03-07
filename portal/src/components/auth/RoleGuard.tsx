import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types/auth';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles?: Role[];
}

/**
 * Gardien de route par rôle (M4)
 * Utilise désormais le LoadingSpinner partagé pour la cohérence visuelle.
 */
export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
    const { session, isLoading, hasPermission } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
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
