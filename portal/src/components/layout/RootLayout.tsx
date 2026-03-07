import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const RootLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // On n'affiche pas le bouton retour si on est sur la page d'accueil d'un Dashboard
    const dashboardPaths = ['/', '/admin', '/centre', '/etablissement', '/tutelle'];
    const isRootPage = dashboardPaths.includes(location.pathname);

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header Global */}
            <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 px-4 flex items-center">
                {!isRootPage && (
                    <button
                        onClick={() => navigate(-1)}
                        className="mr-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                        aria-label="Retour"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <h1 className="text-lg font-bold text-brand-secondary">MockExams DDEST-FP</h1>
            </header>

            {/* Contenu principal de la page (les enfants) */}
            <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
};
