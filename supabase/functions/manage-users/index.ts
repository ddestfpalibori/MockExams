/**
 * Edge Function : manage-users
 * B5 — Proxy Admin API Supabase pour la gestion des comptes utilisateurs
 *
 * Appelée par : ADMIN uniquement
 *
 * Opérations supportées :
 *   POST   /functions/v1/manage-users          — créer un utilisateur + profil
 *   PATCH  /functions/v1/manage-users/:id      — mettre à jour email/password
 *   DELETE /functions/v1/manage-users/:id      — désactiver (ban) un utilisateur
 *
 * Le client Supabase JS ne peut pas appeler l'Admin API (service_role requis).
 * Cette Edge Function est le seul point d'entrée autorisé.
 *
 * POST /functions/v1/manage-users
 */

import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { requireAuth, createServiceClient, AuthError } from '../_shared/auth.ts';

// ─── Contrat API ──────────────────────────────────────────────────────────────

interface CreateUserRequest {
  action: 'create';
  identifier: string; // email or username
  password: string;
  role: 'admin' | 'chef_centre' | 'chef_etablissement' | 'tutelle';
  nom: string;
  prenom: string;
  telephone?: string;
}

interface UpdateUserRequest {
  action: 'update';
  user_id: string;
  password: string;
}

interface DisableUserRequest {
  action: 'disable';
  user_id: string;
}

type ManageUsersRequest = CreateUserRequest | UpdateUserRequest | DisableUserRequest;

interface ErrorResponse {
  error: string;
  code: string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errJson({ error: 'Méthode non autorisée', code: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};

    const { role } = await requireAuth(req, body as Record<string, unknown>);
    if (role !== 'admin') {
      return errJson({ error: 'Accès réservé aux administrateurs', code: 'FORBIDDEN' }, 403);
    }
    const supabase = createServiceClient();

    // ── Action : créer un utilisateur ───────────────────────────────────────
    if (body.action === 'create') {
      const { identifier, password, role: userRole, nom, prenom, telephone } = body;

      if (!identifier || !password || !userRole || !nom || !prenom) {
        return errJson({ error: 'Champs requis : identifiant, password, role, nom, prenom', code: 'BAD_REQUEST' }, 400);
      }

      const raw = identifier.trim();
      const isEmail = raw.includes('@');
      let username: string | null = null;
      let email_login: string;

      if (isEmail) {
        // Validation basique de l'email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
          return errJson({ error: 'Email invalide', code: 'INVALID_EMAIL' }, 400);
        }
        if (raw.toLowerCase().endsWith('@mockexams.local')) {
          return errJson({ error: 'Domaine @mockexams.local réservé au système', code: 'RESERVED_DOMAIN' }, 400);
        }
        email_login = raw.toLowerCase();
      } else {
        username = raw.toLowerCase();
        if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
          return errJson({ error: "Nom d'utilisateur invalide", code: 'INVALID_USERNAME' }, 400);
        }
        email_login = `${username}@mockexams.local`;
      }

      // Longueur minimale du mot de passe
      if (password.length < 8) {
        return errJson({ error: 'Mot de passe trop court (8 caractères minimum)', code: 'WEAK_PASSWORD' }, 400);
      }

      // 1. Créer le compte auth.users via Admin API
      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        email: email_login,
        password,
        email_confirm: true, // Pas de vérification email requise (contexte interne)
      });

      if (createError) {
        console.error('[manage-users] Erreur création auth.users:', createError);
        if (createError.message?.includes('already registered')) {
          return errJson({ error: 'Cet email est déjà utilisé', code: 'EMAIL_EXISTS' }, 409);
        }
        return errJson({ error: createError.message, code: 'AUTH_CREATE_ERROR' }, 500);
      }

      // 2. Insérer le profil (déclenche trigger handle_new_user si présent)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          username,
          email_login,
          nom,
          prenom,
          role: userRole,
          ...(telephone ? { telephone } : {}),
        });

      if (profileError) {
        // Rollback best-effort : supprimer l'utilisateur auth créé
        console.error('[manage-users] Erreur création profil:', profileError);
        try {
          await supabase.auth.admin.deleteUser(authUser.user.id);
        } catch (rollbackErr) {
          console.error('[manage-users] Rollback échoué (non bloquant):', rollbackErr);
        }
        return errJson({ error: 'Erreur lors de la création du profil', code: 'PROFILE_CREATE_ERROR' }, 500);
      }

      return jsonOk({
        user_id: authUser.user.id,
        email: email_login,
        username,
        role: userRole,
        message: 'Utilisateur créé avec succès',
      }, 201);
    }

    // ── Action : réinitialiser le mot de passe ──────────────────────────────
    if (body.action === 'update') {
      const { user_id, password } = body;

      if (!user_id) {
        return errJson({ error: 'user_id requis', code: 'BAD_REQUEST' }, 400);
      }
      if (!password || password.length < 8) {
        return errJson({ error: 'Mot de passe trop court (8 caractères minimum)', code: 'WEAK_PASSWORD' }, 400);
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, { password });

      if (updateError) {
        console.error('[manage-users] Erreur réinitialisation mot de passe:', updateError);
        if (updateError.message?.includes('User not found')) {
          return errJson({ error: 'Utilisateur introuvable', code: 'USER_NOT_FOUND' }, 404);
        }
        return errJson({ error: updateError.message, code: 'AUTH_UPDATE_ERROR' }, 500);
      }

      return jsonOk({ user_id, message: 'Mot de passe réinitialisé' });
    }

    // ── Action : désactiver (ban) ────────────────────────────────────────────
    if (body.action === 'disable') {
      const { user_id } = body;

      if (!user_id) {
        return errJson({ error: 'user_id requis', code: 'BAD_REQUEST' }, 400);
      }

      // Ban permanent via Admin API (préférable à delete pour audit trail)
      // IMPORTANT : 'none' = DÉBANNIR dans Supabase. Pour ban permanent → durée très longue.
      const { error: banError } = await supabase.auth.admin.updateUserById(user_id, {
        ban_duration: '876000h', // ~100 ans = ban permanent effectif
      });

      if (banError) {
        console.error('[manage-users] Erreur désactivation utilisateur:', banError);
        if (banError.message?.includes('User not found')) {
          return errJson({ error: 'Utilisateur introuvable', code: 'USER_NOT_FOUND' }, 404);
        }
        return errJson({ error: banError.message, code: 'AUTH_DISABLE_ERROR' }, 500);
      }

      return jsonOk({ user_id, message: 'Utilisateur désactivé' });
    }

    return errJson({ error: 'Action non reconnue', code: 'UNKNOWN_ACTION' }, 400);

  } catch (err) {
    if (err instanceof AuthError) {
      return errJson({ error: err.message, code: 'UNAUTHORIZED' }, 401);
    }
    console.error('[manage-users] Erreur inattendue:', err);
    return errJson({ error: 'Erreur interne', code: 'INTERNAL_ERROR' }, 500);
  }
});

function errJson(body: ErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonOk(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
