import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Loader2 } from 'lucide-react';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // La redirection sera gérée par l'AuthLayout / RoleGuard automatiquement
            navigate('/');
        } catch (err: unknown) {
            console.error('Erreur login:', err);
            setError('Identifiants invalides ou problème de connexion.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
                <div className="bg-red-50 text-danger p-3 rounded-md text-sm border border-red-200">
                    {error}
                </div>
            )}

            <div>
                <label gap-2 htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Adresse courriel
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="block w-full pl-10 sm:text-sm border-slate-300 rounded-md focus:ring-brand-primary focus:border-brand-primary border px-3 py-2"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Mot de passe
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        className="block w-full pl-10 sm:text-sm border-slate-300 rounded-md focus:ring-brand-primary focus:border-brand-primary border px-3 py-2"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-brand flex justify-center py-2.5"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se connecter'}
                </button>
            </div>
        </form>
    );
};
