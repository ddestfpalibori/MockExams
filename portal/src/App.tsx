import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RoleGuard } from './components/auth/RoleGuard';
import { AuthProvider } from './context/AuthContext';

const Dashboard = () => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
    <h2 className="text-2xl font-bold mb-4">Tableau de bord (Protégé)</h2>
    <a href="/examens/1" className="text-brand-primary hover:underline">Voir mes examens</a>
  </div>
);

const ExamenDetail = () => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
    <h2 className="text-2xl font-bold mb-4">Détails de l'Examen</h2>
    <p>Regardez en haut à gauche, le bouton Retour est visible.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Routes publiques (Auth) */}
          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
          </Route>

          {/* Routes privées (Protégées par RoleGuard) */}
          <Route path="/" element={<RoleGuard><RootLayout /></RoleGuard>}>
            <Route index element={<Dashboard />} />
            <Route path="examens/:id" element={<ExamenDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
