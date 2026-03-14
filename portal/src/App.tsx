import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RoleGuard } from './components/auth/RoleGuard';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Skeleton } from './components/ui/Skeleton';
import { useAuth } from './hooks/useAuth';

// ─── Lazy pages ───────────────────────────────────────────────────────────────

// Public (no auth required)
const ConsultationPage = lazy(() => import('./pages/public/ConsultationPage'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ExamensPage = lazy(() => import('./pages/admin/ExamensPage'));
const ExamenDetailPage = lazy(() => import('./pages/admin/ExamenDetailPage'));
const ExamenFormPage = lazy(() => import('./pages/admin/ExamenFormPage'));
const UtilisateursPage = lazy(() => import('./pages/admin/UtilisateursPage'));

// Chef Centre
const CentreDashboard = lazy(() => import('./pages/centre/CentreDashboard'));
const SallesPage = lazy(() => import('./pages/centre/SallesPage'));
const AffectationPage = lazy(() => import('./pages/centre/AffectationPage'));
const AnonymatsPage = lazy(() => import('./pages/centre/AnonymatsPage'));
const LotsPage = lazy(() => import('./pages/centre/LotsPage'));
const SaisieNotesPage = lazy(() => import('./pages/centre/SaisieNotesPage'));

// Chef Établissement
const EtablissementDashboard = lazy(() => import('./pages/etablissement/EtablissementDashboard'));
const CandidatsEtabPage = lazy(() => import('./pages/etablissement/CandidatsPage'));
const ImportPage = lazy(() => import('./pages/etablissement/ImportPage'));

// Tutelle
const TutelleDashboard = lazy(() => import('./pages/tutelle/TutelleDashboard'));
const ResultatsPage = lazy(() => import('./pages/tutelle/ResultatsPage'));

// Analytics (admin + tutelle)
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'));

// ─── Shared ───────────────────────────────────────────────────────────────────

const LoadingFallback = () => (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton variant="line" size="lg" className="w-1/3" />
        <div className="space-y-3 mt-6">
            <Skeleton variant="line" size="md" />
            <Skeleton variant="line" size="md" />
            <Skeleton variant="line" size="sm" className="w-5/6" />
        </div>
    </div>
);

const UnauthorizedPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-slate-300">403</div>
            <h1 className="text-2xl font-bold text-slate-900">Accès refusé</h1>
            <p className="text-slate-600">
                Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <Link
                to="/"
                className="inline-block mt-6 px-6 py-2.5 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 transition-colors"
            >
                Retour à l'accueil
            </Link>
        </div>
    </div>
);

const RoleRedirect = () => {
    const { role, isLoading } = useAuth();

    if (isLoading) return <LoadingFallback />;

    switch (role) {
        case 'admin': return <Navigate to="/admin" replace />;
        case 'chef_centre': return <Navigate to="/centre" replace />;
        case 'chef_etablissement': return <Navigate to="/etablissement" replace />;
        case 'tutelle': return <Navigate to="/tutelle" replace />;
        default: return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold mb-4">Tableau de bord</h2>
                <p className="text-slate-600">Bienvenue. Votre rôle n'est pas encore configuré.</p>
            </div>
        );
    }
};

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* ── Consultation publique (AVANT le bloc protégé) ── */}
                    <Route
                        path="/consultation"
                        element={
                            <Suspense fallback={<LoadingFallback />}>
                                <ConsultationPage />
                            </Suspense>
                        }
                    />

                    {/* ── Auth ── */}
                    <Route path="/auth" element={<AuthLayout />}>
                        <Route path="login" element={<LoginPage />} />
                    </Route>

                    {/* ── 403 ── */}
                    <Route path="/403" element={<UnauthorizedPage />} />

                    {/* ── Routes protégées ── */}
                    <Route path="/" element={<RoleGuard><RootLayout /></RoleGuard>}>
                        <Route index element={<RoleRedirect />} />

                        {/* ── Admin ── */}
                        <Route
                            path="admin/*"
                            element={
                                <RoleGuard allowedRoles={['admin']}>
                                    <ErrorBoundary>
                                        <Suspense fallback={<LoadingFallback />}>
                                            <Routes>
                                                <Route index element={<AdminDashboard />} />
                                                <Route path="examens" element={<ExamensPage />} />
                                                <Route path="examens/nouveau" element={<ExamenFormPage />} />
                                                <Route path="examens/:id/edit" element={<ExamenFormPage />} />
                                                <Route path="examens/:id" element={<ExamenDetailPage />} />
                                                <Route path="utilisateurs" element={<UtilisateursPage />} />
                                                <Route path="analytics" element={<AnalyticsPage />} />
                                            </Routes>
                                        </Suspense>
                                    </ErrorBoundary>
                                </RoleGuard>
                            }
                        />

                        {/* ── Chef Centre ── */}
                        <Route
                            path="centre/*"
                            element={
                                <RoleGuard allowedRoles={['chef_centre']}>
                                    <ErrorBoundary>
                                        <Suspense fallback={<LoadingFallback />}>
                                            <Routes>
                                                <Route index element={<CentreDashboard />} />
                                                <Route path="salles" element={<SallesPage />} />
                                                <Route path="affectation" element={<AffectationPage />} />
                                                <Route path="anonymats" element={<AnonymatsPage />} />
                                                <Route path="lots" element={<LotsPage />} />
                                                <Route path="saisie" element={<SaisieNotesPage />} />
                                            </Routes>
                                        </Suspense>
                                    </ErrorBoundary>
                                </RoleGuard>
                            }
                        />

                        {/* ── Chef Établissement ── */}
                        <Route
                            path="etablissement/*"
                            element={
                                <RoleGuard allowedRoles={['chef_etablissement']}>
                                    <ErrorBoundary>
                                        <Suspense fallback={<LoadingFallback />}>
                                            <Routes>
                                                <Route index element={<EtablissementDashboard />} />
                                                <Route path="candidats" element={<CandidatsEtabPage />} />
                                                <Route path="import" element={<ImportPage />} />
                                            </Routes>
                                        </Suspense>
                                    </ErrorBoundary>
                                </RoleGuard>
                            }
                        />

                        {/* ── Tutelle ── */}
                        <Route
                            path="tutelle/*"
                            element={
                                <RoleGuard allowedRoles={['tutelle']}>
                                    <ErrorBoundary>
                                        <Suspense fallback={<LoadingFallback />}>
                                            <Routes>
                                                <Route index element={<TutelleDashboard />} />
                                                <Route path="resultats" element={<ResultatsPage />} />
                                                <Route path="analytics" element={<AnalyticsPage />} />
                                            </Routes>
                                        </Suspense>
                                    </ErrorBoundary>
                                </RoleGuard>
                            }
                        />
                    </Route>

                    {/* ── Catch-all ── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
