import { Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';

export const RootLayout = () => {
    const location = useLocation();
    const { goBack, canGoBack } = useNavigationHistory();

    // On n'affiche pas le bouton retour si on est sur la page d'accueil d'un Dashboard
    // ou si l'historique est vide (canGoBack le gère déjà mais on garde la liste pour sécurité)
    const dashboardPaths = ['/', '/admin', '/centre', '/etablissement', '/tutelle'];
    const isRootPage = dashboardPaths.includes(location.pathname);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Header Global */}
            <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-50 px-4 flex items-center shadow-sm">
                {(canGoBack && !isRootPage) && (
                    <button
                        onClick={goBack}
                        className="mr-4 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-brand-primary active:scale-95"
                        aria-label="Retour"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-brand-primary rounded flex items-center justify-center text-white font-bold text-sm">
                        MX
                    </span>
                    <h1 className="text-lg font-bold text-brand-secondary hidden sm:block">
                        MockExams <span className="text-slate-400 font-normal">| DDEST-FP</span>
                    </h1>
                </div>
            </header>

            {/* Contenu principal de la page (les enfants) */}
            <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
};
