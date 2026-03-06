# 🎓 Plateforme de Gestion des Examens Blancs — DDEST-FP Alibori

> **Organisme** : Direction Départementale des Enseignements Secondaire et Technique de Formation Professionnelle de l'Alibori — Bénin  
> **Contexte** : ~8 000 élèves · ~60 établissements · ~20 centres de composition

---

## 🎯 Objectif

Remplacer les processus manuels Excel par une plateforme centralisée qui orchestre l'intégralité du cycle de vie d'un examen blanc : de la création et du paramétrage jusqu'à l'analyse des résultats et les propositions de remédiation, en tenant compte des contraintes de connectivité terrain.

---

## ❌ Problèmes actuels résolus

| Problème | Solution |
|---|---|
| Listes d'émargement créées manuellement | Import centralisé + génération automatique |
| Saisie et traitement des notes sous Excel | Fichiers de saisie générés par l'appli, réimportés après terrain |
| Résultats affichés uniquement en centre (papier) | Consultation en ligne semi-publique |
| Aucune analyse pédagogique | Statistiques, classements, remédiation automatique |
| Processus non reproductible d'un examen à l'autre | Instances paramétrables et reliables entre elles |

---

## ⚙️ Paramétrage d'un Examen

Chaque examen est une **instance indépendante et configurable** :

| Paramètre | Options |
|---|---|
| **Anonymat des copies** | Oui → numéros anonymes + directives de tri / Non → nominatif |
| **Catégorisation** | Sans série → une grille unique / Avec séries (A, B, C, D…) → une grille par série |
| **EPS** | Mode normal (avec toutes les disciplines) / Mode post-admissibilité (uniquement pour les admissibles en Phase 1) |
| **Seuil d'admissibilité** | Configurable (ex : 10/20) |
| **Mentions** | Passable / Assez Bien / Bien / Très Bien / Excellent |
| **Rattrapage** | Oui (avec seuil) / Non |
| **Aptitude EPS élève** | Apte / Inapte (inapte + admissible Phase 1 → admis automatiquement) |
| **Lien avec un examen précédent** | Aucun / Mêmes élèves / Admissibles seulement / Non-admissibles seulement |
| **Taille des lots Excel** | Configurable (pour la saisie hors-ligne et les grands centres) |

---

## 🔄 Cycle de Vie d'un Examen

```
1. CRÉATION & PARAMÉTRAGE
   └── Définir toutes les règles de l'examen

2. IMPORT DES ÉLÈVES
   └── Saisie directe ou fichier Excel (avec validation et rapport d'erreurs)
   └── Reprise automatique d'un examen précédent (tous / admissibles / non-admissibles)

3. CENTRES DE COMPOSITION
   └── Regroupement d'établissements et/ou de filières
   └── Répartition automatique des élèves

4. GÉNÉRATION DES LISTES
   └── Export Excel par centre, en lots configurables
   └── Avec numéros anonymes + instructions de tri des copies si anonymat activé

5. COMPOSITION & CORRECTION
   └── Hors application — sur papier

6. EXPORT FICHIERS DE SAISIE DE NOTES
   └── Excel par centre : colonnes = disciplines + coefficients selon la série
   └── Feuilles par lots — utilisable hors-ligne

7. SAISIE DES NOTES (hors-ligne dans Excel)

8. IMPORT DES NOTES
   └── Réimport du fichier complété → validation + rapport d'erreurs

9. DÉLIBÉRATION
   ├── Mode EPS normal → délibération unique
   └── Mode EPS post-admissibilité → 2 phases :
         Phase 1 : Moyenne sans EPS → liste des admissibles provisoires
         Phase 2 : EPS ajoutée pour les aptes admissibles → délibération finale

10. PUBLICATION DES RÉSULTATS
    └── Code d'accès unique par délibéré (généré par l'ADMIN)
    └── Consultation : numéro de composition + code d'accès
    └── Exports : PDF bulletins, Excel (par établissement, global)

11. ANALYSE & REMÉDIATION
    └── Tableau de bord : taux de réussite, distribution des notes, comparatifs
    └── Liste des élèves en difficulté par discipline
    └── Propositions de remédiation automatiques par classe et par élève
    └── Suivi longitudinal inter-examens (si examens liés)
```

---

## 👥 Rôles Utilisateurs

| Rôle | Accès |
|---|---|
| **ADMIN** | Accès complet — paramétrage, délibération, exports globaux, code d'accès |
| **CHEF_ÉTABLISSEMENT** | Ses élèves, résultats et analyses de son établissement |
| **CHEF_CENTRE** | Import des notes de son centre, résultats de son centre |
| **CONSULTANT** | Lecture seule — statistiques et résultats globaux |

---

## 📴 Résilience Hors-Ligne

La connexion Internet est instable dans certains centres. L'application s'adapte :

- Tous les fichiers nécessaires au terrain sont **générés et téléchargés avant** la composition
- La **saisie des notes se fait dans Excel, hors-ligne**
- L'import se déclenche **en une seule opération** à la reconnexion
- Les fichiers sont structurés en **lots configurables** pour les grands centres (facilité de saisie et d'import)

---

## 🔐 Sécurité & Conformité APDP

- **Noms et prénoms chiffrés** avant stockage en base de données
- **Numéros anonymes irréversibles** — l'association élève ↔ anonyme n'est visible que par l'ADMIN après délibération
- **Résultats semi-publics** : numéro de composition + code d'accès unique, sans affichage du nom
- **Audit log** : toute action sensible (import, modification, délibération) est tracée
- **RLS Supabase** : chaque rôle ne peut accéder qu'aux données qui le concernent

---

## 🛠️ Stack Technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + Shadcn/ui |
| État serveur | TanStack Query |
| État UI | Zustand |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Excel | SheetJS |
| Déploiement | Vercel (CD depuis GitHub) |
