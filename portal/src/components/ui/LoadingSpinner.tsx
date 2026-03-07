import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
    className?: string;
    fullScreen?: boolean;
}

/**
 * Composant de chargement unifié (M4)
 * Évite la duplication de code dans RoleGuard et AuthLayout.
 */
export const LoadingSpinner = ({ className, fullScreen = false }: LoadingSpinnerProps) => {
    const containerClasses = cn(
        "flex items-center justify-center",
        fullScreen ? "h-screen w-full bg-brand-subtle" : "w-full p-8",
        className
    );

    return (
        <div className={containerClasses} role="status" aria-label="Chargement...">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        </div>
    );
};
