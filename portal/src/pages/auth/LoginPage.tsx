import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Loader2 } from 'lucide-react';

const loginSchema = z.object({
    identifier: z
        .string()
        .trim()
        .min(3, 'Identifiant trop court')
        .refine((value) => {
            if (value.includes('@')) {
                return z.string().email().safeParse(value).success;
            }
            return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value.toLowerCase());
        }, 'Identifiant invalide'),
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
            const raw = data.identifier.trim();
            const isEmail = raw.includes('@');
            const email = isEmail ? raw.toLowerCase() : `${raw.toLowerCase()}@mockexams.local`;
            const { error } = await supabase.auth.signInWithPassword({
                email,
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
                <label htmlFor="identifier" className="block text-sm font-semibold text-secondary mb-1.5">
                    Identifiant
                </label>
                <div className="relative rounded-md shadow-sm group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-muted group-focus-within:text-brand-primary transition-colors" />
                    </div>
                    <input
                        id="identifier"
                        type="text"
                        className={`block w-full pl-10 sm:text-sm rounded-xl border px-3 py-2.5 bg-surface transition-all ${errors.identifier
                            ? 'border-danger bg-danger/5 focus-visible:ring-danger/20 focus-visible:border-danger'
                            : 'border-border focus-visible:ring-brand-primary/20 focus-visible:border-brand-primary'
                            }`}
                        placeholder="Email ou utilisateur"
                        {...register('identifier')}
                    />
                </div>
                {errors.identifier && (
                    <p className="mt-1.5 text-xs font-medium text-danger pl-1 uppercase tracking-wider">{errors.identifier.message}</p>
                )}
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-semibold text-secondary mb-1.5">
                    Mot de passe
                </label>
                <div className="relative rounded-md shadow-sm group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-muted group-focus-within:text-brand-primary transition-colors" />
                    </div>
                    <input
                        id="password"
                        type="password"
                        className={`block w-full pl-10 sm:text-sm rounded-xl border px-3 py-2.5 bg-surface transition-all ${errors.password
                            ? 'border-danger bg-danger/5 focus-visible:ring-danger/20 focus-visible:border-danger'
                            : 'border-border focus-visible:ring-brand-primary/20 focus-visible:border-brand-primary'
                            }`}
                        placeholder="••••••••"
                        {...register('password')}
                    />
                </div>
                {errors.password && (
                    <p className="mt-1.5 text-xs font-medium text-danger pl-1 uppercase tracking-wider">{errors.password.message}</p>
                )}
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-brand flex justify-center py-3 rounded-xl shadow-brand-md transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Accéder au Portail'}
                </button>
            </div>
        </form>
    );
};
