# Spécifications Techniques Frontend — MockExams MVP (Incrément 1)

**Statut :** V2.0 — Approuvé
**Date :** 07 Mars 2026
**Basé sur :** PRD v1.3, DB Schema v2.1, Brief v2.6
**Remplace :** V1.0 (brouillon incomplet)

---

## Table des Matières

1. [Architecture des Applications](#1-architecture-des-applications)
2. [Stack Technique](#2-stack-technique)
3. [Structure des Dossiers](#3-structure-des-dossiers)
4. [Configuration Environnement](#4-configuration-environnement)
5. [Routage et RBAC](#5-routage-et-rbac)
6. [Machine d'États — Représentation UI](#6-machine-détats--représentation-ui)
7. [Mapping Modules → Écrans → RPC/Edge Functions](#7-mapping-modules--écrans--rpcedge-functions)
8. [Patterns d'Intégration Supabase](#8-patterns-dintégration-supabase)
9. [Flux Excel / HMAC](#9-flux-excel--hmac)
10. [Composants Partagés Clés](#10-composants-partagés-clés)
11. [Design System](#11-design-system)
12. [Gestion d'Erreurs et Résilience Réseau](#12-gestion-derreurs-et-résilience-réseau)
13. [Typage TypeScript](#13-typage-typescript)
14. [Stratégie de Test](#14-stratégie-de-test)
15. [Séquence de Développement](#15-séquence-de-développement)

---

## 1. Architecture des Applications

Le frontend est scindé en **deux entités distinctes** avec des contraintes radicalement différentes.

### 1.1 Portail Institutionnel (SPA / PWA)

- **Utilisateurs :** ADMIN, CHEF_CENTRE, CHEF_ETABLISSEMENT, TUTELLE
- **Type :** React 18 SPA avec Service Worker PWA (caching assets statiques uniquement)
- **Hébergement :** Vercel
- **Poids cible bundle JS initial :** < 350 Ko gzippé
- **PWA scope :** caching des chunks JS/CSS pour tolérer les micro-coupures réseau. PAS de saisie offline (les Excel jouent ce rôle).

### 1.2 Page Publique Résultats (Ultra-légère)

- **Utilisateurs :** élèves, parents (smartphones, réseau 2G/3G)
- **Type :** HTML + JS Vanilla pur **OU** Astro (décision finale après PoC perf)
- **Règle absolue :** zéro SDK React, zéro Supabase client côté bundle — appel `fetch` direct vers l'Edge Function `consultation-publique`
- **Poids cible page complète :** < 100 Ko (CSS + JS + HTML)
- **Perf cible :** < 3s First Contentful Paint sur 3G simulée (Lighthouse)
- **Décision d'architecture :** La page publique est un fichier statique servi indépendamment. Elle n'est PAS une route du SPA institutionnel.

---

## 2. Stack Technique

### 2.1 Portail Institutionnel

| Catégorie | Technologie | Version | Justification |
|---|---|---|---|
| Framework | React | 18 | Concurrent features, Suspense |
| Langage | TypeScript | 5.x strict | Typage total DB via `supabase gen types` |
| Build | Vite | 5.x | HMR instantané, tree-shaking agressif |
| Routage | React Router | v6 (createBrowserRouter) | Layouts séparés par rôle |
| State serveur | TanStack Query | v5 | Cache, retry, invalidation ciblée |
| Formulaires | React Hook Form + Zod | 7.x + 3.x | Validation stricte, zéro re-render |
| Styles | Tailwind CSS | v3 | Bundle CSS minimal, utility-first |
| Composants UI | shadcn/ui (Radix UI) | latest | Copy-paste, accessibles, pas de dep bundle |
| Tableaux | TanStack Table | v8 | Agnostique, virtualisation, 8000 lignes |
| Excel | SheetJS (xlsx) | 0.18.x | Parsing + génération côté client |
| Backend | @supabase/supabase-js | v2 | Auth, RPC, Edge Functions, Realtime |
| Icônes | Lucide React | latest | SVG inline, léger |
| Notifications | Sonner | latest | Toast non-bloquant, accessible |
| Utilitaires | clsx + tailwind-merge | latest | Fusion classes Tailwind (`cn()`) |
| PWA | vite-plugin-pwa | latest | Service Worker Workbox |

### 2.2 Page Publique

| Catégorie | Technologie |
|---|---|
| Markup | HTML5 sémantique |
| Style | CSS natif (pas de framework) |
| Script | JS Vanilla ES2020 (< 10 Ko) |
| Appel API | `fetch` natif → Edge Function `consultation-publique` |

---

## 3. Structure des Dossiers

```
src/
├── app/                    # Entrée + configuration globale
│   ├── main.tsx            # Point d'entrée React
│   ├── App.tsx             # Provider tree (Query, Auth, Router)
│   └── router.tsx          # createBrowserRouter — toutes les routes
│
├── features/               # Fonctionnalités métier — un dossier par module PRD
│   ├── auth/               # M01 — Auth & RBAC
│   │   ├── components/     # LoginForm, ProtectedRoute
│   │   ├── hooks/          # useAuth, useSession
│   │   └── AuthProvider.tsx
│   ├── examens/            # M02, M10 — Paramétrage + machine d'états
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/          # ExamenListPage, ExamenDetailPage, ExamenCreatePage
│   ├── candidats/          # M03, M16 — Import élèves + héritage
│   │   ├── components/     # ImportDropzone, ImportReport, CandidatTable
│   │   └── pages/
│   ├── centres/            # M04 — Centres + salles + affectation
│   │   ├── components/
│   │   └── pages/
│   ├── listes/             # M05 — Émargement + fiches anonymat
│   │   └── pages/
│   ├── correction/         # M06, M07, M08 — Excel + import + édition notes
│   │   ├── components/     # LotCard, ImportModal, NoteEditor, ImportReport
│   │   ├── hooks/          # useSignLot, useVerifyImport
│   │   └── pages/
│   ├── deliberation/       # M09 — Moteur délibération
│   │   ├── components/     # DeliberationPanel, ResultatTable
│   │   └── pages/
│   ├── analytics/          # M13 — Tableaux de bord
│   │   └── pages/
│   ├── exports/            # M14 — Exports Excel résultats
│   │   └── pages/
│   ├── audit/              # M15 — Audit log + déblocage consultations
│   │   └── pages/
│   └── users/              # M01 US-03 — Gestion comptes (ADMIN)
│       └── pages/
│
├── components/             # Composants partagés cross-features
│   ├── ui/                 # Composants shadcn/ui (Button, Input, Dialog...)
│   ├── layout/             # AdminLayout, ChefCentreLayout, Sidebar, Header
│   ├── feedback/           # PageSkeleton, EmptyState, ErrorFallback
│   └── guards/             # RoleGuard, StatusGuard
│
├── hooks/                  # Hooks globaux partagés
│   ├── useNetworkStatus.ts # Online/offline detection
│   └── useExamenStatus.ts  # Statut courant de l'examen actif
│
├── lib/                    # Utilitaires et configurations
│   ├── supabase.ts         # createClient (singleton)
│   ├── queryClient.ts      # QueryClient + CACHE_STRATEGY + QUERY_KEYS
│   ├── utils.ts            # cn(), formatters (moyenne centièmes → décimales)
│   ├── excel.ts            # Helpers SheetJS (parse, generate)
│   └── zod-schemas.ts      # Schémas Zod partagés (validations réutilisées)
│
├── types/                  # Types TypeScript
│   ├── database.types.ts   # Généré par `supabase gen types typescript`
│   ├── app.types.ts        # Types applicatifs dérivés (non générés)
│   └── enums.ts            # ExamenStatus, UserRole, etc. (miroir des enums PG)
│
└── public/                 # Assets statiques
    └── resultats/          # Page publique standalone (HTML + CSS + JS vanilla)
        ├── index.html
        ├── style.css
        └── app.js
```

---

## 4. Configuration Environnement

### 4.1 Variables d'environnement (`.env.local`)

```env
# Supabase
VITE_SUPABASE_URL=https://qrkxgqeroijtavrqjfkd.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>

# Page publique (URL de l'Edge Function — peut différer en staging/prod)
VITE_CONSULTATION_FUNCTION_URL=https://qrkxgqeroijtavrqjfkd.supabase.co/functions/v1/consultation-publique

# Monitoring (optionnel en dev)
VITE_SENTRY_DSN=
```

> **Règle de sécurité :** Aucune clé secrète (HMAC_SECRET_KEY, service_role) ne doit apparaître dans les variables `VITE_*`. Ces clés ne vivent que dans les Edge Functions (secrets Supabase).

### 4.2 Initialisation Supabase (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
```

### 4.3 Génération des types (après chaque migration)

```bash
npx supabase gen types typescript --linked > src/types/database.types.ts
```

---

## 5. Routage et RBAC

### 5.1 Architecture des layouts (React Router v6)

```
/login                          → AuthLayout (public)
/resultats                      → ResultatsLayout (public standalone)
/admin/*                        → AdminLayout (rôle: admin)
/centre/*                       → ChefCentreLayout (rôle: chef_centre)
/etablissement/*                → ChefEtabLayout (rôle: chef_etablissement)
/tutelle/*                      → TutelleLayout (rôle: tutelle)
```

Les guards de redirection sont dans les **layouts**, pas dans les routes individuelles.

### 5.2 Table des routes complète

| Route | Composant Page | Rôles autorisés | Module PRD |
|---|---|---|---|
| `/login` | `LoginPage` | — (public) | M01 |
| `/resultats` | `ResultatsPubliquePage` | — (public) | M12 |
| `/admin/examens` | `ExamenListPage` | admin | M02 |
| `/admin/examens/nouveau` | `ExamenCreatePage` | admin | M02 |
| `/admin/examens/:id` | `ExamenDetailPage` | admin | M02, M10 |
| `/admin/examens/:id/candidats` | `CandidatsPage` | admin | M03 |
| `/admin/examens/:id/centres` | `CentresPage` | admin | M04 |
| `/admin/examens/:id/listes` | `ListesPage` | admin | M05 |
| `/admin/examens/:id/correction` | `CorrectionAdminPage` | admin | M06, M07, M08 |
| `/admin/examens/:id/deliberation` | `DeliberationPage` | admin | M09 |
| `/admin/examens/:id/resultats` | `ResultatsAdminPage` | admin | M14 |
| `/admin/examens/:id/analytics` | `AnalyticsPage` | admin, tutelle | M13 |
| `/admin/utilisateurs` | `UsersPage` | admin | M01 US-03 |
| `/admin/audit` | `AuditPage` | admin, tutelle | M15 |
| `/centre/examens` | `ChefCentreExamensPage` | chef_centre | M07, M08 |
| `/centre/examens/:id/correction` | `CorrectionCentrePage` | chef_centre | M07, M08 |
| `/centre/examens/:id/listes` | `ListesCentrePage` | chef_centre | M05 |
| `/etablissement/examens` | `ChefEtabExamensPage` | chef_etablissement | M13, M14 |
| `/etablissement/examens/:id/analytics` | `AnalyticsEtabPage` | chef_etablissement | M13 |
| `/etablissement/examens/:id/export` | `ExportEtabPage` | chef_etablissement | M14 US-23b |
| `/tutelle/examens` | `TutelleExamensPage` | tutelle | M13 |
| `/tutelle/examens/:id/analytics` | `AnalyticsTutellePage` | tutelle | M13 US-22 |

### 5.3 Composant `RoleGuard`

```typescript
interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode; // défaut: redirect /login
}
```

### 5.4 Composant `StatusGuard`

Protège les actions dépendant du statut de l'examen (machine d'états).

```typescript
interface StatusGuardProps {
  allowedStatuses: ExamenStatus[];
  examenId: string;
  children: React.ReactNode;
  fallbackMessage?: string; // ex: "Non disponible en statut PUBLIE"
}
```

---

## 6. Machine d'États — Représentation UI

### 6.1 Indicateur de statut (composant `ExamenStatusBadge`)

Chaque statut a une couleur et un libellé affichés sur toutes les pages liées à l'examen.

| Statut DB | Badge couleur | Libellé affiché |
|---|---|---|
| `CONFIG` | `bg-slate-100 text-slate-700` | Configuration |
| `INSCRIPTIONS` | `bg-blue-100 text-blue-700` | Inscriptions ouvertes |
| `COMPOSITION` | `bg-indigo-100 text-indigo-700` | Composition |
| `CORRECTION` | `bg-amber-100 text-amber-700` | Correction en cours |
| `DELIBERATION` | `bg-orange-100 text-orange-700` | Délibération |
| `DELIBERE` | `bg-purple-100 text-purple-700` | Délibéré |
| `CORRECTION_POST_DELIBERATION` | `bg-red-100 text-red-700` | Correction post-délib. |
| `PUBLIE` | `bg-green-100 text-green-700` | Résultats publiés |
| `CLOS` | `bg-gray-100 text-gray-500` | Archivé |

### 6.2 Boutons de transition (composant `TransitionButton`)

Chaque bouton de transition vers le statut suivant est :
- Visible uniquement pour le rôle habilité (ADMIN pour toutes les transitions)
- Désactivé si les pré-conditions ne sont pas remplies (tooltip d'explication)
- Accompagné d'une modale de confirmation pour les transitions irréversibles

| Transition | Pré-condition vérifiée côté UI |
|---|---|
| CONFIG → INSCRIPTIONS | Grille disciplines complète, ≥1 série configurée |
| INSCRIPTIONS → COMPOSITION | ≥1 centre configuré, ≥1 élève importé |
| CORRECTION → DELIBERATION | Alerte si lots manquants ou notes null (non bloquant) |
| DELIBERATION → DELIBERE | Résultats calculés sans erreur fatale |
| DELIBERE → PUBLIE | Confirmation explicite ("Tapez PUBLIER") |
| PUBLIE → CLOS | Confirmation explicite ("Tapez ARCHIVER") |

### 6.3 Verrouillage des actions par statut

```typescript
// types/enums.ts
export const EDITABLE_STATUSES = ['CONFIG', 'INSCRIPTIONS', 'COMPOSITION', 'CORRECTION'] as const;
export const CORRECTION_STATUSES = ['CORRECTION', 'CORRECTION_POST_DELIBERATION'] as const;
export const READONLY_STATUSES = ['PUBLIE', 'CLOS'] as const;

// Règle : si status ∈ READONLY_STATUSES → tous les boutons d'action masqués
// Règle : si status ∈ CORRECTION_STATUSES → édition notes autorisée (selon rôle)
// Règle : DELIBERATION et DELIBERE → chef_centre = lecture seule
```

---

## 7. Mapping Modules → Écrans → RPC/Edge Functions

### M01 — Auth & RBAC

**Écrans :** `LoginPage`, `UsersPage`

**Supabase calls :**
```typescript
// Login
supabase.auth.signInWithPassword({ email, password })
// Session
supabase.auth.getSession()
supabase.auth.onAuthStateChange(callback)
// Profil courant
supabase.from('profiles').select('role, nom, prenom').eq('id', userId).single()
// Gestion comptes (admin)
supabase.auth.admin.createUser(...)   // via Edge Function sécurisée
supabase.from('profiles').update({ is_active: false }).eq('id', userId)
```

---

### M02 — Paramétrage Examen

**Écrans :** `ExamenListPage`, `ExamenCreatePage`, `ExamenDetailPage`

**Supabase calls :**
```typescript
supabase.from('examens').select('*').order('annee', { ascending: false })
supabase.from('examens').insert({ code, libelle, annee, mode_deliberation, ... })
supabase.from('examen_disciplines').upsert([...])
supabase.from('examen_series').upsert([...])
supabase.from('examen_centres').upsert([...])
```

**Règle verrouillage (US-05) :** les champs `anonymat`, `mode_deliberation`, `grille disciplines` sont `disabled` dès que `status !== 'CONFIG'`. Vérification locale via le statut en cache — pas de requête supplémentaire.

---

### M03 — Import Élèves

**Écrans :** `CandidatsPage` (onglets : liste / import / héritage)

**Supabase calls :**
```typescript
// Import via Edge Function (chiffrement AES côté serveur)
supabase.functions.invoke('import-candidats', { body: { examen_id, rows } })
// Liste candidats (paginée)
supabase.from('candidats').select('id, numero_anonyme, serie_id, etablissement_id, ...').eq('examen_id', id).range(0, 99)
// Héritage (US-08)
supabase.functions.invoke('heritage-candidats', { body: { source_examen_id, target_examen_id, mode } })
```

**Rapport d'import :** affiché dans une modale après appel. Structure `{ nb_success, nb_errors, lines: [{ row, status, errors }] }`.

---

### M04 — Centres de Composition

**Écrans :** `CentresPage` (liste centres + détail centre : salles + affectation)

**Supabase calls :**
```typescript
supabase.from('centres').select('*')
supabase.from('examen_centres').upsert(...)
supabase.from('salles').select('*').eq('centre_id', id)
// Affectation automatique (F04)
supabase.rpc('affecter_candidats_salles', { p_examen_id, p_centre_id })
// Génération anonymats (F05)
supabase.rpc('generer_anonymats_centre', { p_examen_id, p_centre_id })
```

---

### M05 — Génération Listes

**Écrans :** `ListesPage`, `ListesCentrePage`

**Génération côté client (SheetJS) :**
- Liste d'émargement : `generateEmargementExcel(candidats, colonnes_config)`
- Fiche d'Attribution : `generateFicheAttribution(salles, candidats_par_salle)`
- Grille de Rangement : `generateGrilleRangement(lots, candidats_par_lot)`

**Pas d'appel Edge Function** pour ces fichiers — génération 100% locale.

---

### M06 — Génération Fichiers de Saisie

**Écrans :** `CorrectionAdminPage` (onglet "Générer les fichiers")

**Flux :**
1. `supabase.rpc('creer_lots_centre', ...)` → crée les lots en DB (F06)
2. `supabase.functions.invoke('sign-lot', { body: meta })` → reçoit `hmac_signature`
3. Injection du HMAC dans l'onglet `_meta` du fichier Excel (SheetJS)
4. Téléchargement ZIP local (JSZip)

**Règle :** le HMAC est toujours demandé à l'Edge Function — jamais calculé côté client (la clé secrète n'est pas accessible au navigateur).

---

### M07 — Import Notes

**Écrans :** `CorrectionAdminPage`, `CorrectionCentrePage`

**Flux :**
1. Upload fichier → parsing SheetJS côté client (extraction `_meta` + lignes)
2. Pré-validation locale : colonnes attendues, valeurs hors [0-20]/ABS/ABD, cellules vides
3. `supabase.functions.invoke('verify-import', { body: { meta, rows } })` → réponse `VerifyImportResponse`
4. Affichage rapport d'erreurs avec option "corriger manuellement" ou "re-télécharger"

**Détection lot existant (avertissement UPSERT §3.2) :**
```typescript
// Avant l'appel Edge Function, vérifier si le lot existe déjà
const { data: existingLot } = await supabase
  .from('lots')
  .select('id, status')
  .eq('centre_id', meta.centre_id)
  .eq('examen_id', meta.examen_id)
  .eq('lot_numero', meta.lot_numero)
  .maybeSingle();

if (existingLot?.status === 'TERMINE') {
  // Afficher modale de confirmation avant de continuer
}
```

---

### M08 — Édition Notes In-App

**Composant :** `NoteEditor` (cellule inline-editable dans `ResultatTable`)

**Supabase call :**
```typescript
supabase.from('saisies')
  .update({ note_centimes: newValue, code_special: null })
  .eq('lot_id', lotId)
  .eq('candidat_id', candidatId)
```

**Indicateur de modification manuelle :** badge sur chaque cellule modifiée (info depuis `audit_log` ou colonne `updated_manually` à ajouter si nécessaire).

---

### M09 — Délibération

**Écran :** `DeliberationPage`

**Flux :**
1. Vérification pré-délibération :
   ```typescript
   supabase.rpc('compter_notes_manquantes', { p_examen_id })
   ```
2. Affichage alertes (lots non importés, notes null)
3. Confirmation → transition statut → délibération :
   ```typescript
   // Transition statut
   supabase.from('examens').update({ status: 'DELIBERATION' }).eq('id', examenId)
   // Délibération (F03)
   supabase.rpc('deliberer_examen', { p_examen_id, p_delibere_par: userId })
   ```
4. Affichage résultats : tableau `resultats` avec filtres ADMIS/NON_ADMIS/RATTRAPAGE

**Affichage des centièmes :**
```typescript
// lib/utils.ts
export const formatMoyenne = (centimes: number | null): string => {
  if (centimes === null) return '—';
  return (centimes / 100).toFixed(2);
};
```

---

### M12 — Page Publique Résultats

**Fichier :** `public/resultats/app.js` (Vanilla JS, < 10 Ko)

```javascript
// app.js — appel direct fetch, zéro dépendance
async function consulter(examenId, numeroAnonyme, codeAcces) {
  const res = await fetch(CONSULTATION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examen_id: examenId, numero_anonyme: numeroAnonyme, code_acces: codeAcces })
  });
  // Affichage résultat ou message d'erreur
}
```

**Données affichées** (conformes US-19) : notes par discipline, moyenne, mention, décision.
**Données masquées** : nom, prénom, établissement.

---

### M13 — Tableau de Bord Analytique

**Écrans :** `AnalyticsPage`, `AnalyticsEtabPage`, `AnalyticsTutellePage`

**Supabase calls :**
```typescript
// Stats globales via RPC (à créer en I1 ou via view)
supabase.rpc('stats_examen', { p_examen_id })
// Détail par établissement
supabase.from('resultats')
  .select('status, moyenne_centimes, candidats!inner(etablissement_id, ...)')
  .eq('examen_id', id)
```

**Perf :** TanStack Table avec virtualisation pour 8000 lignes. Pas de rechargement à chaque filtre — filtrage côté client sur données déjà en cache React Query.

---

### M14 — Exports Excel Résultats

**Génération côté client (SheetJS) :**
```typescript
// lib/excel.ts
export function generateResultatsExcel(resultats: ResultatRow[], mode: 'A' | 'B'): Blob
```

Mode B (nominatif, ADMIN only) : déchiffrement des noms via Edge Function avant génération.

---

### M15 — Audit Log

**Écran :** `AuditPage` (filtre : tout / consultations bloquées)

```typescript
supabase.from('audit_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100)
// Vue filtrée consultations bloquées
supabase.from('consultation_tentatives')
  .select('*')
  .not('lockout_until', 'is', null)
  .gt('lockout_until', new Date().toISOString())
// Déblocage
supabase.from('consultation_tentatives')
  .update({ tentatives: 0, lockout_until: null })
  .eq('id', tentativeId)
```

---

## 8. Patterns d'Intégration Supabase

### 8.1 QueryClient — CACHE_STRATEGY et QUERY_KEYS

```typescript
// lib/queryClient.ts
const ONE_MINUTE = 60_000;

export const CACHE_STRATEGY = {
  examens:      { staleTime: 30 * ONE_MINUTE, gcTime: 24 * 60 * ONE_MINUTE },
  candidats:    { staleTime: 5 * ONE_MINUTE,  gcTime: 24 * 60 * ONE_MINUTE },
  resultats:    { staleTime: 5 * ONE_MINUTE,  gcTime: 24 * 60 * ONE_MINUTE },
  saisies:      { staleTime: 2 * ONE_MINUTE,  gcTime: 24 * 60 * ONE_MINUTE },
  referentiels: { staleTime: 60 * ONE_MINUTE, gcTime: 7 * 24 * 60 * ONE_MINUTE },
  auditLog:     { staleTime: 1 * ONE_MINUTE,  gcTime: 60 * ONE_MINUTE },
} as const;

export const QUERY_KEYS = {
  examens: {
    all: ['examens'] as const,
    list: () => ['examens', 'list'] as const,
    detail: (id: string) => ['examens', id] as const,
    status: (id: string) => ['examens', id, 'status'] as const,
  },
  candidats: {
    byExamen: (examenId: string) => ['candidats', examenId] as const,
  },
  resultats: {
    byExamen: (examenId: string) => ['resultats', examenId] as const,
  },
  saisies: {
    byLot: (lotId: string) => ['saisies', lotId] as const,
  },
} as const;
```

### 8.2 Retry — Ne jamais retry sur 401/403/404

```typescript
const retryFn = (failureCount: number, error: unknown) => {
  const err = error as { status?: number };
  if ([401, 403, 404].includes(err?.status ?? 0)) return false;
  return failureCount < 2;
};
```

### 8.3 Réponse générique d'erreur Supabase

```typescript
// types/app.types.ts
type SupabaseError = { message: string; code?: string; details?: string };

function handleSupabaseError(error: SupabaseError): string {
  // Mapper les codes d'erreur PostgreSQL vers des messages FR lisibles
  if (error.code === '23505') return 'Cet enregistrement existe déjà.';
  if (error.code === '42501') return 'Accès refusé — permissions insuffisantes.';
  return error.message;
}
```

---

## 9. Flux Excel / HMAC

### 9.1 Génération d'un fichier de saisie (M06)

```
ADMIN clique "Générer lot"
  │
  ├─ 1. supabase.rpc('creer_lots_centre') → lot.id créé en DB
  │
  ├─ 2. supabase.functions.invoke('sign-lot', { meta }) → { hmac_signature }
  │       (ADMIN → Edge Function seulement — clé secrète jamais exposée)
  │
  ├─ 3. SheetJS.buildWorkbook(candidats, meta, hmac_signature)
  │       - Onglet "Saisie" : N°_Anonyme + colonnes disciplines (cellules éditables)
  │       - Onglet "_meta" : caché, toutes les métadonnées + hmac_signature
  │       - Protection Excel sur en-têtes et numéros anonymes
  │
  └─ 4. Téléchargement .xlsx (ou ZIP multi-lots via JSZip)
```

### 9.2 Import d'un fichier de notes (M07)

```
CHEF_CENTRE dépose le fichier .xlsx
  │
  ├─ 1. SheetJS.parse(file)
  │       - Extraire onglet "_meta" → { centre_id, examen_id, ..., hmac_signature }
  │       - Extraire onglet "Saisie" → rows[]
  │
  ├─ 2. Pré-validation locale (immédiate, sans réseau)
  │       - Colonnes attendues présentes ?
  │       - Valeurs : nombre [0-20], "ABS", "ABD" — cellule vide = erreur
  │       - Virgules normalisées : "10,5" → 10.5
  │
  ├─ 3. Vérification lot existant (avertissement UPSERT §3.2)
  │
  ├─ 4. supabase.functions.invoke('verify-import', { meta, rows })
  │       - HMAC vérifié côté Edge Function
  │       - Anti-replay timestamp vérifié
  │       - UPSERT saisies en DB
  │       - Retourne { nb_success, nb_errors, lines[], warnings[] }
  │
  └─ 5. Affichage rapport dans une modale
```

### 9.3 Parsing SheetJS — Règles obligatoires

```typescript
// lib/excel.ts
import * as XLSX from 'xlsx';

export function parseNotesFile(file: File): Promise<ParsedNotesFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: 'binary' });

      // Onglet _meta obligatoire
      if (!wb.SheetNames.includes('_meta')) {
        reject(new Error('Fichier invalide : onglet _meta absent'));
        return;
      }

      const meta = XLSX.utils.sheet_to_json(wb.Sheets['_meta'], { header: 1 });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['Saisie']);

      resolve({ meta: parseMeta(meta), rows: parseRows(rows) });
    };
    reader.readAsBinaryString(file);
  });
}
```

---

## 10. Composants Partagés Clés

### 10.1 `ExamenStatusBadge`
Badge coloré affichant le statut courant de l'examen.

### 10.2 `TransitionButton`
Bouton avec confirmation modale + pré-condition check. Props : `transition`, `examenId`, `preConditionCheck`.

### 10.3 `ImportDropzone`
Zone drag-and-drop pour fichiers Excel. Validation MIME type + taille. Feedback visuel immédiat.

### 10.4 `ImportReport`
Affiche les résultats d'un import (nb succès, nb erreurs, détail par ligne). Exportable en CSV.

### 10.5 `NoteCell`
Cellule de tableau inline-editable. Affiche la note en décimales, accepte [0-20]/ABS/ABD. Badge si modifiée manuellement. Disabled hors statuts autorisés.

### 10.6 `PageSkeleton`
Skeleton screen avec animation pulse. Variantes : `table`, `card`, `form`.

### 10.7 `NetworkBanner`
Bandeau persistant haut de page si `!navigator.onLine`. Non bloquant.

### 10.8 `ConfirmDialog`
Modale de confirmation. Variantes : `simple` (bouton OK) et `typed` (saisie texte obligatoire pour actions destructives).

---

## 11. Design System

### 11.1 Palette

| Usage | Classe Tailwind | Hex |
|---|---|---|
| Fond page | `bg-slate-50` | `#f8fafc` |
| Surface carte | `bg-white border-slate-200` | — |
| Texte principal | `text-slate-900` | `#0f172a` |
| Texte secondaire | `text-slate-500` | `#64748b` |
| Action primaire | `bg-blue-600 hover:bg-blue-700` | `#2563eb` |
| Danger / NON_ADMIS | `text-red-700 bg-red-50` | — |
| Avertissement / RATTRAPAGE | `text-amber-700 bg-amber-50` | — |
| Succès / ADMIS | `text-green-700 bg-green-50` | — |

### 11.2 Typographie

- Famille : **Inter** (Google Fonts), fallback `system-ui, sans-serif`
- Chiffres : `tabular-nums` sur toutes les cellules de notes et moyennes (alignement parfait)

### 11.3 Patterns d'interaction

| Pattern | Implémentation |
|---|---|
| Anti-double clic | Bouton `disabled` + spinner pendant toute requête asynchrone |
| Actions destructives | `ConfirmDialog` variante `typed` (saisie "PUBLIER", "ARCHIVER") |
| Skeleton loading | `PageSkeleton` sur tout composant avec données async |
| Toast succès | Sonner, position `bottom-right`, durée 3s, non bloquant |
| Erreur critique | `Dialog` bloquant avec message explicite + action corrective |
| Réseau offline | `NetworkBanner` — bandeau haut de page, non bloquant |
| Note modifiée manuellement | Badge `●` + tooltip avec date/heure sur la cellule |

### 11.4 Storybook — Documentation des Composants

**Objectif :** Chaque composant UI documenté avec Storybook. Setup via `npx storybook@latest init`.

**Structure :**
```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Button.stories.tsx    ← Baseline + variantes (size, variant, state)
│   │   ├── Dialog.tsx
│   │   └── Dialog.stories.tsx
│   └── ...
└── .storybook/
    ├── main.ts                    ← Config Vite + addons
    └── preview.ts                 ← Theme global, decorators
```

**Couverture obligatoire :**
- Tous les composants du design system (`Button`, `Input`, `Select`, `Dialog`, `Badge`, etc.)
- Variantes via CVA (size, variant, disabled, loading)
- États (`normal`, `hover`, `active`, `disabled`, `error`)
- Responsive (mobile/tablet/desktop si pertinent)
- Accessibilité (ARIA, labels, etc.)

**Pas de composants en production sans story.**

### 11.5 Thème Dynamique (Light/Dark)

**Provider global :**
```typescript
// src/context/ThemeContext.tsx
interface ThemeContextType {
  theme: 'light' | 'dark' | 'auto';
  setTheme: (t: 'light' | 'dark' | 'auto') => void;
}

export const ThemeProvider: React.FC<{ children }> = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme-preference') || 'auto');

  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme-preference', theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};
```

**Variables CSS :**
```css
/* src/styles/theme.css */
:root {
  --color-primary: #2563eb;
  --color-bg: #f8fafc;
  --color-fg: #0f172a;
  /* ... */
}

:root.dark {
  --color-bg: #0f172a;
  --color-fg: #f8fafc;
  /* ... */
}
```

**Commutateur de thème :**
```typescript
// Petit toggle en haut à droite du header (à côté de la déconnexion)
export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
};
```

### 11.6 Navigation & Bouton Retour

**Hook custom pour l'historique :**
```typescript
// src/hooks/useNavigationHistory.ts
export function useNavigationHistory() {
  const navigate = useNavigate();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Vérifier si historique navigateur disponible
    setCanGoBack(window.history.length > 1);
  }, []);

  const goBack = useCallback(() => {
    if (canGoBack) navigate(-1);
  }, [canGoBack, navigate]);

  return { canGoBack, goBack };
}
```

**Bouton retour unique (haut à gauche) :**
```typescript
// src/components/navigation/BackButton.tsx
export const BackButton = () => {
  const { canGoBack, goBack } = useNavigationHistory();

  if (!canGoBack) return null;

  return (
    <button
      onClick={goBack}
      className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
      aria-label="Retour"
    >
      <ChevronLeft size={20} />
      <span className="text-sm">Retour</span>
    </button>
  );
};
```

**Placement dans le layout :**
```typescript
// src/layouts/RootLayout.tsx
export const RootLayout = () => {
  return (
    <div className="min-h-screen">
      {/* Barre de navigation fixe haut */}
      <nav className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4">
        <BackButton />  {/* ← Flèche + "Retour" */}
        <h1 className="flex-1">MockExams</h1>
        <ThemeToggle />
        <UserMenu />
      </nav>

      {/* Contenu principal */}
      <main className="p-4">{/* routes */}</main>
    </div>
  );
};
```

**Comportement :**
- Visible sur toutes les pages sauf la page d'accueil/login
- Clique = `navigate(-1)` (pop de la pile du navigateur)
- Gère automatiquement les transitions React Router

---

## 12. Gestion d'Erreurs et Résilience Réseau

### 12.1 Hiérarchie des erreurs

```
ErrorBoundary (niveau page)
  └── Suspense (données async)
        └── Composant avec useQuery/useMutation
              └── Erreur Supabase → toast OU dialog selon criticité
```

### 12.2 Comportement selon le type d'erreur

| Type | Traitement UI |
|---|---|
| 401 Unauthorized | Redirect `/login` + toast "Session expirée" |
| 403 Forbidden | Toast "Accès refusé" — ne pas retry |
| 404 Not Found | Empty state dans le composant |
| 422 (HMAC invalide, timestamp expiré) | Dialog bloquant avec message explicite + action |
| 500 Internal | Toast erreur + log Sentry |
| Réseau offline | NetworkBanner + données en cache affichées |

### 12.3 Stratégie PWA Workbox (portail institutionnel)

| Type ressource | Stratégie | TTL |
|---|---|---|
| Auth (`/auth/`) | `NetworkOnly` | — |
| API REST Supabase | `NetworkFirst` | 15 min |
| Edge Functions | `NetworkOnly` | — |
| JS/CSS chunks | `StaleWhileRevalidate` | 7 jours |
| Images/fonts | `CacheFirst` | 30 jours |

---

## 13. Typage TypeScript

### 13.1 Types générés vs types applicatifs

```typescript
// types/database.types.ts — GÉNÉRÉ (ne pas modifier manuellement)
// Contient : Database['public']['Tables']['examens']['Row'] etc.

// types/app.types.ts — types dérivés adaptés à l'UI
import type { Database } from './database.types';

type ExamenRow = Database['public']['Tables']['examens']['Row'];
type CandidatRow = Database['public']['Tables']['candidats']['Row'];

// Types enrichis pour l'UI
export interface ExamenWithStats extends ExamenRow {
  nb_candidats: number;
  nb_resultats: number;
}
```

### 13.2 Enums miroir des enums PostgreSQL

```typescript
// types/enums.ts — miroir des enums DB (maintenir en sync)
export type ExamenStatus =
  | 'CONFIG' | 'INSCRIPTIONS' | 'COMPOSITION' | 'CORRECTION'
  | 'DELIBERATION' | 'DELIBERE' | 'CORRECTION_POST_DELIBERATION'
  | 'PUBLIE' | 'CLOS';

export type UserRole = 'admin' | 'chef_centre' | 'chef_etablissement' | 'tutelle';
export type CodeSpecial = 'ABS' | 'ABD' | 'INAPTE';
export type DecisionStatut = 'ADMIS' | 'NON_ADMIS' | 'RATTRAPAGE';
```

### 13.3 Règle `any` interdite

```typescript
// ✅ Correct
catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
}

// ❌ Interdit
catch (error: any) { ... }
```

---

## 14. Stratégie de Test

### 14.1 Ce qui doit être testé (obligatoire avant merge)

| Type | Outil | Cible |
|---|---|---|
| Unitaire | Vitest | `formatMoyenne()`, `parseNote()`, `buildHmacInput()`, algorithme bon §3.6 |
| Hook | Vitest + @testing-library/react-hooks | `useAuth`, `useExamenStatus` |
| Composant | @testing-library/react | `NoteCell`, `TransitionButton`, `ConfirmDialog` |
| Intégration | Vitest + msw | Flux import Excel complet (mock Edge Function) |
| E2E critique | Playwright | Login → import notes → délibération → consultation publique |

### 14.2 Cas de test obligatoires (PRD §8)

- [ ] ABS/ABD → NON_ADMIS automatique (pas de calcul de moyenne)
- [ ] Note pile 10.00 → ADMIS (seuil_phase2 = 1000 centièmes)
- [ ] Note 9.99 → NON_ADMIS
- [ ] HMAC invalide → import refusé, message explicite
- [ ] Timestamp expiré → import refusé, message "Fichier expiré — régénérer"
- [ ] Lockout tentative 6 → blocage 1h, message avec délai
- [ ] Propriété réassemblage bon=3 → séquence 1→N par interleave

---

## 15. Séquence de Développement

Découpage en **5 sprints** de ~3 jours chacun (J1-J15 après initialisation).

### Sprint 1 — Socle + Auth (J1-J3)

- [ ] Init Vite + React + TypeScript strict
- [ ] Tailwind + shadcn/ui setup
- [ ] Supabase client + `gen types`
- [ ] QueryClient + CACHE_STRATEGY + QUERY_KEYS
- [ ] React Router — layouts (Admin, Centre, Etab, Tutelle, Auth)
- [ ] `AuthProvider` — login/logout/session persistante
- [ ] `LoginPage` — formulaire email/password
- [ ] `RoleGuard` — redirection post-login par rôle
- [ ] `NetworkBanner` — détection offline
- [ ] **Livrable :** login fonctionnel avec redirection par rôle

### Sprint 2 — Paramétrage Examen + Machine d'États (J4-J6)

- [ ] `ExamenListPage` + `ExamenCreatePage`
- [ ] `ExamenStatusBadge` + `TransitionButton` + `StatusGuard`
- [ ] `ExamenDetailPage` — vue d'ensemble + navigation modules
- [ ] Grille disciplines/séries — formulaire dynamique
- [ ] `UsersPage` — CRUD comptes (admin)
- [ ] **Livrable :** cycle de vie examen complet navigable

### Sprint 3 — Import Élèves + Centres (J7-J9)

- [ ] `CandidatsPage` — liste paginée (TanStack Table)
- [ ] `ImportDropzone` + `ImportReport`
- [ ] Appel Edge Function `import-candidats`
- [ ] `CentresPage` — salles + affectation (F04, F05)
- [ ] `ListesPage` — génération émargement + fiches anonymat (SheetJS)
- [ ] **Livrable :** inscriptions complètes, listes téléchargeables

### Sprint 4 — Correction + Délibération (J10-J12)

- [ ] `CorrectionAdminPage` / `CorrectionCentrePage`
- [ ] Flux génération lot HMAC (sign-lot) + SheetJS
- [ ] Flux import notes (verify-import) + rapport erreurs
- [ ] `NoteCell` — édition inline
- [ ] `DeliberationPage` — pré-checks + lancement F03
- [ ] `ResultatsAdminPage` — tableau résultats + révision post-délib
- [ ] **Livrable :** cycle correction → délibération → publication complet

### Sprint 5 — Analytics + Exports + Page Publique (J13-J15)

- [ ] `AnalyticsPage` (admin + tutelle + établissement)
- [ ] Exports Excel résultats (Modèle A + B)
- [ ] `AuditPage` + déblocage consultations
- [ ] Page publique `public/resultats/` (HTML vanilla + fetch)
- [ ] Tests E2E Playwright (flux critiques)
- [ ] Audit perf Lighthouse (page publique < 100 Ko, < 3s 3G)
- [ ] **Livrable :** MVP I1 complet

---

## Annexe — Prérequis avant Sprint 1 (PRD §2)

**P1 — PoC Parseur Excel** (1 demi-journée)
Script Node.js standalone qui parse un fichier test et valide les cas : colonne manquante, note invalide, HMAC invalide, centre_id incorrect.
Livrable : `scripts/test-excel-parser.ts`

**P2 — Jeu de données DDEST-FP réel**
Grilles disciplines/coefficients officielles + distribution de notes réaliste avec cas limites.
Nécessaire pour valider F03 sur données production avant déploiement.
