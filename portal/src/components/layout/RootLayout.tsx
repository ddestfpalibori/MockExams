import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';

export const RootLayout = () => {
    const location = useLocation();
    const { role, signOut } = useAuth();
    const { goBack, canGoBack } = useNavigationHistory();

    const dashboardPaths = ['/', '/admin', '/centre', '/etablissement', '/tutelle'];
    const isRootPage = dashboardPaths.includes(location.pathname);

    // Définition des menus par rôle
    const getNavItems = () => {
        switch (role) {
            case 'admin':
                return [
                    { label: 'Examens', path: '/admin/examens' },
                    { label: 'Utilisateurs', path: '/admin/utilisateurs' },
                    { label: 'Résultats', path: '/tutelle/resultats' },
                    { label: 'Salles', path: '/centre/salles' },
                    { label: 'Affectation', path: '/centre/affectation' },
                    { label: 'Anonymats', path: '/centre/anonymats' },
                    { label: 'Lots', path: '/centre/lots' },
                    { label: 'Saisie', path: '/centre/saisie' },
                    { label: 'Candidats', path: '/etablissement/candidats' },
                    { label: 'Import', path: '/etablissement/import' },
                ];
            case 'chef_centre':
                return [
                    { label: 'Dashboard', path: '/centre' },
                    { label: 'Salles', path: '/centre/salles' },
                    { label: 'Affectation', path: '/centre/affectation' },
                    { label: 'Anonymats', path: '/centre/anonymats' },
                    { label: 'Lots', path: '/centre/lots' },
                    { label: 'Saisie', path: '/centre/saisie' },
                ];
            case 'chef_etablissement':
                return [
                    { label: 'Dashboard', path: '/etablissement' },
                    { label: 'Candidats', path: '/etablissement/candidats' },
                    { label: 'Import', path: '/etablissement/import' },
                ];
            case 'tutelle':
                return [
                    { label: 'Dashboard', path: '/tutelle' },
                    { label: 'Résultats', path: '/tutelle/resultats' },
                ];
            default:
                return [];
        }
    };

    const navItems = getNavItems();

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            {/* Header Global */}
            <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-50 px-4 flex items-center shadow-sm">
                <div className="flex items-center gap-2 mr-6 shrink-0">
                    <span className="w-8 h-8 bg-brand-primary rounded flex items-center justify-center text-white font-bold text-sm">
                        MX
                    </span>
                    <h1 className="text-lg font-bold text-brand-secondary hidden md:block">
                        MockExams <span className="text-slate-400 font-normal">| Alibori</span>
                    </h1>
                </div>

                {/* Navigation Contextuelle */}
                <nav className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar h-full py-2">
                    {(canGoBack && !isRootPage) && (
                        <button
                            onClick={goBack}
                            className="mr-2 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-brand-primary active:scale-95 shrink-0"
                            aria-label="Retour"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}

                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path.split('/').length <= 2}
                            className={({ isActive }) => cn(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                                "hover:bg-slate-100/80 hover:text-brand-primary",
                                isActive
                                    ? "bg-brand-primary/10 text-brand-primary shadow-sm"
                                    : "text-slate-600"
                            )}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="ml-4 pl-4 border-l border-slate-200 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => signOut()}
                        title="Déconnexion"
                        className="text-slate-400 hover:text-danger hover:bg-danger/10"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Contenu principal de la page */}
            <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
};
