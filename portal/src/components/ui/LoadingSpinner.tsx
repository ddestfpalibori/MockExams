import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
    className?: string;
    fullScreen?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Composant de chargement unifié (M4)
 * Évite la duplication de code dans RoleGuard et AuthLayout.
 */
export const LoadingSpinner = ({ className, fullScreen = false, size = 'md' }: LoadingSpinnerProps) => {
    const sizeMap = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };

    const containerClasses = cn(
        "flex items-center justify-center",
        fullScreen ? "h-screen w-full bg-brand-subtle" : "w-full p-8",
        className
    );

    return (
        <div className={containerClasses} role="status" aria-label="Chargement...">
            <div className={cn("animate-spin rounded-full border-b-2 border-brand-primary", sizeMap[size])}></div>
        </div>
    );
};
