import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Loader2 } from 'lucide-react';

const loginSchema = z.object({
    email: z.string().email('Adresse courriel invalide'),
    password: z.string().min(6, 'Mot de passe trop court (minimum 6 caractères)'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage = () => {
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        mode: 'onBlur',
    });

    const onSubmit = async (data: LoginFormValues) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) throw error;

            // La redirection sera gérée par l'AuthLayout / RoleGuard automatiquement
            navigate('/');
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : 'Identifiants invalides ou problème de connexion';
            toast.error(message);
        }
    };

    return (
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Adresse courriel
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        id="email"
                        type="email"
                        className={`block w-full pl-10 sm:text-sm rounded-md border px-3 py-2 transition-colors ${
                            errors.email
                                ? 'border-danger bg-red-50 focus:ring-danger focus:border-danger'
                                : 'border-slate-300 focus:ring-brand-primary focus:border-brand-primary'
                        }`}
                        placeholder="vous@exemple.fr"
                        {...register('email')}
                    />
                </div>
                {errors.email && (
                    <p className="mt-1 text-sm text-danger">{errors.email.message}</p>
                )}
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
                        type="password"
                        className={`block w-full pl-10 sm:text-sm rounded-md border px-3 py-2 transition-colors ${
                            errors.password
                                ? 'border-danger bg-red-50 focus:ring-danger focus:border-danger'
                                : 'border-slate-300 focus:ring-brand-primary focus:border-brand-primary'
                        }`}
                        placeholder="••••••••"
                        {...register('password')}
                    />
                </div>
                {errors.password && (
                    <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
                )}
            </div>

            <div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-brand flex justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se connecter'}
                </button>
            </div>
        </form>
    );
};
