import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RoleGuard } from './components/auth/RoleGuard';
import { AuthProvider } from './context/AuthContext';
import { Skeleton } from './components/ui/Skeleton';

// Lazy-loaded pages
const AdminDashboard = lazy(() =>
    import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard }))
);
const CentreDashboard = lazy(() =>
    import('./pages/centre/CentreDashboard').then(m => ({ default: m.CentreDashboard }))
);
const EtablissementDashboard = lazy(() =>
    import('./pages/etablissement/EtablissementDashboard').then(m => ({ default: m.EtablissementDashboard }))
);
const TutelleDashboard = lazy(() =>
    import('./pages/tutelle/TutelleDashboard').then(m => ({ default: m.TutelleDashboard }))
);

// Loading fallback
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

// Default dashboard for authenticated users (redirect based on role)
const Dashboard = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-4">Tableau de bord</h2>
        <p className="text-slate-600">Bienvenue. Accédez à votre espace en fonction de votre rôle.</p>
    </div>
);

// Unauthorized page
const UnauthorizedPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-4">
            <div className="text-6xl font-bold text-slate-300">403</div>
            <h1 className="text-2xl font-bold text-slate-900">Accès refusé</h1>
            <p className="text-slate-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
            <a
                href="/"
                className="inline-block mt-6 px-6 py-2.5 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 transition-colors"
            >
                Retour à l'accueil
            </a>
        </div>
    </div>
);

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Routes publiques */}
                    <Route path="/auth" element={<AuthLayout />}>
                        <Route path="login" element={<LoginPage />} />
                    </Route>

                    {/* Page non autorisé */}
                    <Route path="/403" element={<UnauthorizedPage />} />

                    {/* Routes protégées */}
                    <Route path="/" element={<RoleGuard><RootLayout /></RoleGuard>}>
                        <Route index element={<Dashboard />} />

                        {/* Admin routes */}
                        <Route
                            path="admin/*"
                            element={
                                <RoleGuard allowedRoles={['admin']}>
                                    <Suspense fallback={<LoadingFallback />}>
                                        <AdminDashboard />
                                    </Suspense>
                                </RoleGuard>
                            }
                        />

                        {/* Chef Centre routes */}
                        <Route
                            path="centre/*"
                            element={
                                <RoleGuard allowedRoles={['chef_centre']}>
                                    <Suspense fallback={<LoadingFallback />}>
                                        <CentreDashboard />
                                    </Suspense>
                                </RoleGuard>
                            }
                        />

                        {/* Chef Établissement routes */}
                        <Route
                            path="etablissement/*"
                            element={
                                <RoleGuard allowedRoles={['chef_etablissement']}>
                                    <Suspense fallback={<LoadingFallback />}>
                                        <EtablissementDashboard />
                                    </Suspense>
                                </RoleGuard>
                            }
                        />

                        {/* Tutelle routes */}
                        <Route
                            path="tutelle/*"
                            element={
                                <RoleGuard allowedRoles={['tutelle']}>
                                    <Suspense fallback={<LoadingFallback />}>
                                        <TutelleDashboard />
                                    </Suspense>
                                </RoleGuard>
                            }
                        />
                    </Route>

                    {/* Catch-all: redirect to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
