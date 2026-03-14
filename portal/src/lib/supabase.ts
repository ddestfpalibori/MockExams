import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variables d\'environnement Supabase manquantes.');
}

// Singleton résistant au HMR de Vite : si le module est rechargé à chaud,
// on réutilise l'instance existante (même session, même token).
const _global = globalThis as typeof globalThis & { __supabase?: ReturnType<typeof createClient<Database>> };

if (!_global.__supabase) {
    _global.__supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });
}

export const supabase = _global.__supabase;
