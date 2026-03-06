# Spécifications Techniques Frontend — MockExams MVP (Incrément 1)

**Statut :** Brouillon V1.0  
**Date :** 06 Mars 2026  
**Auteur :** Lead Frontend Architect  
**Basé sur :** PRD v1.3, DB Schema v2.1

## 1. Vision et Principes Directeurs
L'application MockExams cible un environnement aux contraintes fortes (Bénin, réseau instable, utilisateurs hétérogènes). Le frontend doit être régi par 3 principes :
1. **Résilience et Feedback :** Aucun clic ne doit rester sans réponse. Loaders, Skeletons, et gestion rigoureuse des erreurs réseau sont obligatoires.
2. **Poids Minimal (Performances) :** Bundle JavaScript optimisé, pas de bibliothèques superflues (ex: moment.js, lodash lourd).
3. **Clarté Cognitive (Design System) :** Interface utilitaire et professionnelle. Couleurs "Slate" neutres et alertes sémantiques claires (Bleu d'action, Rouge d'arrêt).

## 2. Architecture des Applications
Conformément au PRD, le frontend est scindé en deux entités distinctes pour répondre à des besoins radicalement différents en termes de scalabilité et de performances.

### 2.1 Le Portail Institutionnel (Admin, Chef de Centre, Tutelle)
*   **Type :** PWA (Progressive Web Application) basée sur une SPA (Single Page Application).
*   **Framework :** React 18 avec Vite.
*   **Routage :** React Router v6.
*   **Objectif PWA :** Uniquement pour le Service Worker (caching des assets statiques) pour garantir le chargement de l'UI même en cas de micro-coupures, et gérer l'état en ligne/hors-ligne (via un hook et un bandeau d'alerte). L'utilisation offline pour la saisie n'est pas gérée dans le navigateur, mais via des fichiers Excel téléchargés (stratégie PRD).
*   **Poids cible (initial JS) :** < 350 Ko (gzippé).

### 2.2 La Page Publique de Résultats (Élèves, Parents)
*   **Type :** Site web statique / rendu serveur ultra-léger.
*   **Framework :** Astro ou HTML/JS Vanilla léger (selon l'infrastructure de déploiement finale).
*   **Objectif :** Chargement instantané sur connexions 2G/3G africaines. Pas de framework React lourd.
*   **Poids cible (total page) :** < 50 Ko.

## 3. Stack Technique et Bibliothèques (Portail Institutionnel)

| Catégorie | Technologie Principale | Justification |
| :--- | :--- | :--- |
| **Cœur** | React 18 + TypeScript | Typage strict pour l'intégration avec le schéma Supabase. |
| **Build Tool** | Vite | Compilation quasi-instantanée et HMR performant. |
| **State Management & Fetch** | TanStack Query (React Query) | Gestion du cache, des états de chargement (loading/error), et des retry réseau automatiques. Indispensable pour la résilience. |
| **Styles & Layout** | Tailwind CSS v3 | Utility-first, bundle CSS généré minuscule, maintenance accélérée. |
| **Composants UI** | Shadcn/ui | Modèles de composants "copy-paste" accessibles (Radix UI) sans ajouter de dépendance lourde au bundle. |
| **Tableaux de Données** | TanStack Table | Agnostique, hyper-performant pour des milliers de lignes, tri/filtre côté client. |
| **Gestion des Formulaires** | React Hook Form + Zod | Validation stricte côté client (Zod partageable avec TypeScript) sans re-renders inutiles. |
| **Manipulation Excel** | SheetJS (version optimisée) | Exigence du PRD pour la génération et le parsing en local (ou via Edge Function si le fichier est complexe). |
| **Backend as a Service** | Supabase JS Client | Authentification, abonnements realtime (si besoin futur), appels aux Edge Functions. |
| **Icônes** | Lucide React | SVG propres, légers, consistants. |

## 4. Organisation du Projet (Structure des Dossiers)

Une architecture "Feature-sliced" allégée est recommandée pour maintenir la clarté.

```text
src/
├── assets/         # Images statiques, logos
├── components/     # Composants partagés
│   ├── ui/         # Composants génériques Shadcn (Button, Input, Table...)
│   └── layout/     # Sidebar, Header, PageContainer
├── config/         # Fichiers de configuration (Tailwind, constantes globales)
├── features/       # Fonctionnalités métier isolées
│   ├── auth/       # Composants, hooks et services liés à l'authentification
│   ├── examens/    # Création, configuration, dashboard de l'examen
│   ├── centres/    # Affectation, liste des centres
│   ├── correction/ # Lots, parsing Excel, validation HMAC
│   └── resultats/  # Délibération, exports
├── hooks/          # Hooks customisés partagés (ex: useNetworkStatus)
├── lib/            # Utilitaires (Supabase client, formatters de dates, cn pour Tailwind)
├── routes/         # Configuration React Router
├── types/          # Types générés depuis Supabase + types partagés
└── index.css       # Tailwind directives
```

## 5. Lignes Directrices UI/UX

### 5.1 Palette de Couleurs (Standard "Utility-first")
*   **Fond principal :** `bg-slate-50` (`#f8fafc`). Évite la fatigue oculaire du blanc pur.
*   **Surfaces (Cartes) :** `bg-white` (`#ffffff`) avec des bordures subtiles (`border-slate-200`).
*   **Texte principal :** `text-slate-900` (`#0f172a`).
*   **Texte secondaire :** `text-slate-500` (`#64748b`).
*   **Action Primaire (Boutons) :** `bg-blue-600` (`#2563eb`) hover `bg-blue-700`.
*   **Sémantique Métier (Bordures, Badges, Alertes) :**
    *   *Admis / Succès :* `text-green-700` bg `green-50`.
    *   *Rattrapage / Avertissement :* `text-amber-700` bg `amber-50`.
    *   *Non Admis / Erreur / Danger :* `text-red-700` bg `red-50`.

### 5.2 Typographie
*   Famille : **Inter**, avec fallback sur les polices système sans-serif.
*   Focus sur la lisibilité des chiffres (tableaux de notes).

### 5.3 Modèles d'Interaction (Patterns)
1.  **Anti-Double Clic :** Tout bouton d'action asynchrone (ex: "Générer les lots") doit passer en état `disabled` avec un texte clair ou un spinner d'attente.
2.  **Destructive Actions :** Les actions irréversibles (ex: "Clôturer l'examen") requièrent une pop-up de confirmation avec saisie texte de validation (ex: `"Pour confirmer, tapez CLOTURE"`).
3.  **Skeleton Screens :** Afficher des maquettes grisées pendant le chargement des premiers écrans (pas de page blanche mystère).
4.  **Toasts :** Notifications non-bloquantes en bas à droite pour valider la réussite d'une action mineure. Préférer les modales bloquantes pour les erreurs critiques.
5.  **Indicateur Réseau :** Bandeau persistant avertissant du passage en mode hors-ligne sans bloquer l'interface pré-chargée.

## 6. Intégration Supabase (Le Lien Backend)
Le frontend ne contient **aucune logique métier complexe** (délibération, algorithme de lots).
Toute la logique est exécutée via des RPC (Remote Procedure Calls) PostgreSQL ou des instances Supabase :
*   `supabase.rpc('calculer_moyenne_candidat', { ... })`
*   `supabase.rpc('generer_anonymats_centre', { ... })`
*   `supabase.functions.invoke('verify-hmac', { ... })` pour la vérification offline des imports.

Le typage TypeScript sur le frontend sera généré directement à partir du schéma de la BDD (commande `supabase gen types typescript`), garantissant une cohérence parfaite et réduisant drastiquement les bugs.

## 7. Prochaines Étapes pour le Développeur
1. Initialiser le projet Vite/React en TypeScript.
2. Configurer Tailwind CSS avec la palette et la typographie définie.
3. Installer et configurer le client Supabase avec les variables d'environnement.
4. Générer les types TypeScript depuis le schéma.
5. Créer la structure de base (layouts, authentification).
