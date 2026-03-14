import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    ArrowLeft,
    LogOut,
    Settings,
    Building2,
    ClipboardList,
    Home,
    Users,
    TrendingUp,
    Menu,
    ChevronDown,
    ChevronRight,
    type LucideIcon,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigationHistory } from '@/hooks/useNavigationHistory';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';

interface NavItem {
    label: string;
    path: string;
}

interface NavGroup {
    title: string;
    icon: LucideIcon;
    items: NavItem[];
}

export const RootLayout = () => {
    const location = useLocation();
    const { role, signOut } = useAuth();
    const { goBack, canGoBack } = useNavigationHistory();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // State pour gérer les groupes repliés
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    const dashboardPaths = ['/', '/admin', '/centre', '/etablissement', '/tutelle'];
    const isRootPage = dashboardPaths.includes(location.pathname);

    // Définition des menus groupés par rôle
    const navGroups = useMemo((): NavGroup[] => {
        switch (role) {
            case 'admin':
                return [
                    {
                        title: 'Accueil',
                        icon: Home,
                        items: [{ label: 'Dashboard', path: '/admin' }]
                    },
                    {
                        title: 'Configuration',
                        icon: Settings,
                        items: [
                            { label: 'Examens', path: '/admin/examens' },
                            { label: 'Utilisateurs', path: '/admin/utilisateurs' },
                        ]
                    },
                    {
                        title: 'Inscriptions',
                        icon: Users,
                        items: [
                            { label: 'Import', path: '/etablissement/import' },
                            { label: 'Candidats', path: '/etablissement/candidats' },
                        ]
                    },
                    {
                        title: 'Organisation',
                        icon: Building2,
                        items: [
                            { label: 'Salles', path: '/centre/salles' },
                            { label: 'Affectation', path: '/centre/affectation' },
                        ]
                    },
                    {
                        title: 'Secrétariat',
                        icon: ClipboardList,
                        items: [
                            { label: 'Anonymats', path: '/centre/anonymats' },
                            { label: 'Groupage', path: '/centre/lots' },
                            { label: 'Saisie', path: '/centre/saisie' },
                            { label: 'Délibération', path: '/admin/examens?status=DELIBERATION' },
                        ]
                    },
                    {
                        title: 'Résultats',
                        icon: TrendingUp,
                        items: [
                            { label: 'Résultats', path: '/tutelle/resultats' },
                            { label: 'Analyses', path: '/admin/analytics' },
                        ]
                    }
                ];
            case 'chef_centre':
                return [
                    {
                        title: 'Accueil',
                        icon: Home,
                        items: [{ label: 'Dashboard', path: '/centre' }]
                    },
                    {
                        title: 'Organisation',
                        icon: Building2,
                        items: [
                            { label: 'Salles', path: '/centre/salles' },
                            { label: 'Affectation', path: '/centre/affectation' },
                        ]
                    },
                    {
                        title: 'Secrétariat',
                        icon: ClipboardList,
                        items: [
                            { label: 'Anonymats', path: '/centre/anonymats' },
                            { label: 'Groupage', path: '/centre/lots' },
                            { label: 'Saisie', path: '/centre/saisie' },
                        ]
                    },
                    {
                        title: 'Résultats',
                        icon: TrendingUp,
                        items: [
                            { label: 'Résultats', path: '/centre/resultats' },
                            { label: 'Analyses', path: '/centre/analytics' },
                        ]
                    }
                ];
            case 'chef_etablissement':
                return [
                    {
                        title: 'Accueil',
                        icon: Home,
                        items: [{ label: 'Dashboard', path: '/etablissement' }]
                    },
                    {
                        title: 'Inscriptions',
                        icon: Users,
                        items: [
                            { label: 'Import', path: '/etablissement/import' },
                            { label: 'Candidats', path: '/etablissement/candidats' },
                        ]
                    },
                    {
                        title: 'Résultats',
                        icon: TrendingUp,
                        items: [
                            { label: 'Résultats', path: '/etablissement/resultats' },
                            { label: 'Analyses', path: '/etablissement/analytics' },
                        ]
                    }
                ];
            case 'tutelle':
                return [
                    {
                        title: 'Accueil',
                        icon: Home,
                        items: [{ label: 'Dashboard', path: '/tutelle' }]
                    },
                    {
                        title: 'Résultats',
                        icon: TrendingUp,
                        items: [
                            { label: 'Résultats', path: '/tutelle/resultats' },
                            { label: 'Analyses', path: '/tutelle/analytics' },
                        ]
                    }
                ];
            default:
                return [];
        }
    }, [role]);

    // Initialiser/Maintenir l'ouverture des groupes si un élément interne est actif
    useEffect(() => {
        const newOpenGroups = { ...openGroups };
        let hasChanged = false;

        navGroups.forEach(group => {
            const hasActiveItem = group.items.some(item => location.pathname === item.path);
            if (hasActiveItem && !newOpenGroups[group.title]) {
                newOpenGroups[group.title] = true;
                hasChanged = true;
            }
        });

        if (hasChanged) {
            setOpenGroups(newOpenGroups);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, navGroups]);

    // Fermer la sidebar mobile lors d'un changement de route
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    const toggleGroup = (title: string) => {
        setOpenGroups(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    return (
        <div className="min-h-screen flex bg-background">
            {/* Sidebar mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Desktop & Mobile Drawer */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transition-transform duration-300 lg:translate-x-0 lg:static lg:block",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Brand */}
                    <div className="h-16 flex items-center gap-3 px-6 border-b border-border shadow-sm">
                        <span className="w-8 h-8 bg-brand-primary rounded flex items-center justify-center text-white font-bold text-sm">
                            MX
                        </span>
                        <h1 className="text-lg font-bold text-primary">
                            MockExams <span className="text-muted font-normal text-sm">| Alibori</span>
                        </h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {navGroups.map((group) => {
                            const isOpen = !!openGroups[group.title];
                            const hasActiveItem = group.items.some(item => location.pathname === item.path);

                            return (
                                <div key={group.title} className="space-y-1">
                                    <button
                                        onClick={() => toggleGroup(group.title)}
                                        className={cn(
                                            "w-full px-3 py-2 flex items-center justify-between rounded-md transition-colors",
                                            "hover:bg-surface-hover group",
                                            hasActiveItem && !isOpen && "bg-brand-primary/5"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted group-hover:text-primary transition-colors">
                                            <group.icon size={12} className={cn("opacity-70", hasActiveItem && "text-brand-primary opacity-100")} />
                                            <span className={cn(hasActiveItem && !isOpen && "text-brand-primary")}>
                                                {group.title}
                                            </span>
                                        </div>
                                        {isOpen ? (
                                            <ChevronDown size={14} className="text-muted" />
                                        ) : (
                                            <ChevronRight size={14} className="text-muted/50" />
                                        )}
                                    </button>

                                    {/* Items List avec animation (simple height pour l'instant) */}
                                    {isOpen && (
                                        <div className="space-y-0.5 ml-2 border-l border-border pl-2">
                                            {group.items.map((item) => (
                                                <NavLink
                                                    key={item.path}
                                                    to={item.path}
                                                    end={item.path.split('/').length <= 2}
                                                    className={({ isActive }) => cn(
                                                        "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all",
                                                        isActive
                                                            ? "bg-brand-primary/10 text-brand-primary shadow-sm"
                                                            : "text-secondary hover:bg-surface-hover hover:text-primary"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "w-1 h-1 rounded-full mr-3",
                                                        "bg-transparent",
                                                        location.pathname === item.path && "bg-brand-primary scale-150"
                                                    )} />
                                                    {item.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {/* Profile & Footer */}
                    <div className="p-4 border-t border-border bg-surface-hover/30">
                        <div className="flex items-center justify-between">
                            <ThemeToggle />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => signOut()}
                                className="text-secondary hover:text-danger hover:bg-danger/10 gap-2 font-semibold"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden lg:inline text-xs">Déconnexion</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar Interne (Contextuelle) */}
                <header className="h-16 bg-surface border-b border-border sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between shadow-sm lg:shadow-none">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 lg:hidden text-secondary hover:text-primary hover:bg-surface-hover rounded-md transition-colors"
                        >
                            <Menu size={20} />
                        </button>

                        {(canGoBack && !isRootPage) && (
                            <button
                                onClick={goBack}
                                className="p-2 hover:bg-surface-hover rounded-full transition-all text-secondary hover:text-brand-primary active:scale-90"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}

                        <h2 className="font-semibold text-primary truncate max-w-[200px] md:max-w-none">
                            {navGroups.flatMap(g => g.items).find(i => i.path === location.pathname)?.label || "Espace Travail"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-xs font-bold text-primary uppercase">{role?.replace('_', ' ')}</span>
                            <span className="text-[10px] text-muted italic">Session 2026</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xs border border-brand-primary/10 uppercase">
                            {role?.[0] || 'U'}
                        </div>
                    </div>
                </header>

                {/* Page Content Scroll Container */}
                <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
