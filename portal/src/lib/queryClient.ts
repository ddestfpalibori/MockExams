/**
 * TanStack Query Client — Configuration centralisée
 * Retry intelligent, cache strategy, error handling global
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Retry intelligent : skip certaines erreurs réseau/HTTP qui ne se résoudront pas en retrying
 * - 401/403 : authentification/permission — pas de retry
 * - 404 : ressource manquante — pas de retry
 * - AbortError : utilisateur a annulé — pas de retry
 * - Autres erreurs réseau : max 2 tentatives
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false; // Max 2 tentatives

  const err = error as { status?: number; name?: string; message?: string };

  // Skip retry sur erreurs critiques
  if (err?.status === 401 || err?.status === 403 || err?.status === 404) return false;
  if (err?.name === 'AbortError' || err?.message?.includes('aborted')) return false;

  return true;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: unknown) => {
      const err = error as { status?: number };
      if (err?.status === 401) {
        queryClient.clear();
        window.location.href = '/auth/login';
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false, // Pas de refetch au focus (UX calm)
      staleTime: 5 * 60 * 1000, // 5 min par défaut
    },
    mutations: {
      retry: false, // Mutations ne retryent jamais
    },
  },
  mutationCache: new MutationCache({
    onError: (error: unknown) => {
      const err = error as { message?: string; name?: string; context?: { json?: { error?: string } } };
      if (err?.name === 'AbortError') return; // Silencieux si annulé
      const msg = err?.context?.json?.error ?? err?.message ?? 'Une erreur est survenue';
      toast.error(msg);
    },
  }),
});
