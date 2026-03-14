import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
}

/**
 * ErrorBoundary pour capturer les erreurs de rechargement de chunks (lazy load)
 * et les erreurs de rendu imprévues.
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-6 text-center space-y-4 bg-surface rounded-lg shadow-sm border border-border m-4">
                    <h2 className="text-xl font-bold text-primary">Oups ! Une erreur est survenue</h2>
                    <p className="text-secondary">
                        Impossible de charger cette section. Cela peut être dû à une coupure réseau.
                    </p>
                    <Button onClick={() => window.location.reload()} variant="primary">
                        Rafraîchir la page
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
