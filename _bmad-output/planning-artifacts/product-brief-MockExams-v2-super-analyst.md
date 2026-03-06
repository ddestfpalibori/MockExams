---
version: "2.6"
revisedBy: "Super Analyst — révision critique du brief Mary v1"
basedOn: "product-brief-MockExams-2026-03-04.md"
date: "2026-03-05"
status: "FINAL"
---

# Product Brief v2 — MockExams
## Plateforme de Gestion des Examens Blancs — DDEST-FP Alibori

---

## Changelog

### v2.5 → v2.6

| Section | Modification |
|---|---|
| **§4.1.1** | Codes ABS/ABD/0 — trois statuts distincts par discipline, règle NON ADMIS automatique |
| **§4.1.2** | Types de disciplines : ecrit_obligatoire, oral (Modèle A/B), eps, facultatif (Option 1/2) |
| **§4.1.3** | Formule arithmétique entière — reformulation centrée sur les centièmes |
| **§4.1.4** | Mode délibération unique (ex-EPS Normal) — étendu avec oral + facultatives |
| **§4.1.5** | Mode 2 phases (ex-EPS Post-Admissibilité) — étendu : seuil phase1=9, phase2=10, oral, facultatives, bonus |
| **§4.1.6** | Tableau paramètres moteur de délibération (mode, seuils, oral, EPS, facultatif, rattrapage) |
| **§4.1.7** | Multi-séries + matières au choix — clé lot complète, règle choix manquant bloquant |
| §4.1.8 | Révision post-délibération (ex-§4.1.4, renommé) |
| §4.2.1 | Clé `_meta` étendue : matiere_id, serie_id, option_id ajoutés au HMAC |
| §4.2.1 | Colonnes Excel : valeurs ABS/ABD acceptées, cellule vide = erreur |
| §4.4.3 | Champ conditionnel `Choix_[Discipline]` ajouté pour disciplines au_choix |
| §4.9 | bon=1 clarifié = lots séquentiels de taille_salle_ref (pas un seul lot global) |
| §4.9 | Unification terminologique : lot anonymat = lot saisie Excel = paquet correcteur |
| §4.9 | Clé lot complète documentée |

---

### v2.4 → v2.5

| Section | Modification |
|---|---|
| **§4.9** | **Nouvelle section : Numérotation Anonyme — Paramétrage, Algorithme Bons, Fiches d'Orientation, Distribution codes d'accès** |
| §4.6.3 | Workflow physique mis à jour — référence aux fiches d'orientation §4.9.4 |
| §5.1 | Ajout "Fiches d'orientation anonymat" dans le module Anonymat physique |

---

### v2.3 → v2.4

| Section | Modification |
|---|---|
| §3.1 | Séparation des personas TUTELLE et SUPER_ADMIN (précédemment fusionnées) |
| §3.2 | Modèle RBAC à délégation par ressource — 3 modes + table `exam_members` |
| §4.2.1 | HMAC-SHA256 ajouté dans l'onglet `_meta` (signature serveur inforgeable) |
| §4.2.2 | Vérification checksum → vérification HMAC via Edge Function |
| §4.8.1 | Mention HMAC dans l'architecture de sécurité des fichiers |
| §4.8.4 | Captcha retiré de I1 — remplacé par lockout par (numero_composition + IP) + procédure déblocage ADMIN |

### v2.2 → v2.3

| Section | Modification |
|---|---|
| Entête | Version prod-ready — suppression de tout le vocabulaire MVP |
| Section 4.1.1 | Correction règle d'arrondi : arithmétique entière normative (pas flottant natif) |
| Section 4.1.1 | Correction contradiction notes manquantes : modèle à deux couches clarifié |
| Section 4.2.2 | Précision sémantique UPSERT à la réimport |
| Section 4.4.3 | Champs libres (niveau 3) restaurés comme requis en V1 (scope prod-ready) |
| Section 4.5.5 | Suppression du scope MVP — tout inclus en production |
| **Section 4.6** | **Nouvelle section : Anonymat physique — souche détachable** |
| Section 4.8 | Correction numérotation (4.4.x → 4.8.x) |
| Section 4.8.1 | Correction architecture chiffrement : Edge Function uniquement, jamais client React |
| **Section 4.8.4** | **Nouvelle section : Sécurité de la consultation publique (rate limiting, lockout)** |
| Section 5 | Reframing complet : MVP → Application de production par incréments |
| Section 5.1 | Incrément 1 — toutes les features opérationnelles |
| Section 5.2 | Incrément 2 — features durcies et analytiques (précédemment "reportées") |
| Section 5.3 | Critères de validation par incrément (+ PoC parseur comme prérequis) |
| Section 8 | Correction note chiffrement : Edge Function uniquement |
| Section 9 | Ajout PoC parseur comme critère bloquant avant tout développement UI |

### v2.1 → v2.2

| Section | Modification |
|---|---|
| Section 4.2.1 | Décision : un fichier par lot (pas multi-onglets) |
| Section 4.2.2 | Règles de validation mises à jour |
| Section 4.3 | Droits d'édition des notes et matrice de verrouillage |
| Section 4.4 | Import élèves — modèle interne, template 3 niveaux, propriétés champs, salle/table |
| Section 4.5 | Affectation enseignant par discipline et classe |

### v1 → v2.1

| Section | Statut | Motif |
|---|---|---|
| Executive Summary | Enrichi | Précision du périmètre institutionnel |
| Core Vision | Conservé + complété | Ajout des hypothèses critiques |
| Target Users | Enrichi | Ajout des cas d'échec par persona |
| Moteur de délibération | Nouveau | Spécification mathématique exhaustive |
| Stratégie hors-ligne | Nouveau | Un fichier par lot, règles parseur, suivi d'avancement |
| Édition notes & verrouillage | Nouveau | Droits d'édition in-app par statut, garde-fous |
| Import élèves & template | Nouveau | Modèle interne, template configurable 3 niveaux |
| Affectation enseignant | Nouveau | Association discipline/classe/enseignant |
| Remédiation | Nouveau | Définition concrète — promesse v1 non spécifiée |
| Sécurité & APDP | Nouveau | Architecture de conformité détaillée |
| Registre des risques | Nouveau | Absent en v1 |
| Success Metrics | Enrichi | Baselines et cibles mesurables |

---

## 1. Executive Summary

Le DDEST-FP Alibori (Bénin) organise chaque année plusieurs sessions d'examens blancs pour environ **8 000 élèves** répartis dans **60 établissements** et **20 centres de composition**. Aujourd'hui, l'ensemble du processus repose sur des fichiers Excel créés manuellement, sans cohérence entre les examens, sans consultation des résultats en ligne, et sans analyse pédagogique exploitable.

**MockExams** est une plateforme web de production centralisée qui orchestre le cycle complet d'un examen blanc — du paramétrage à l'analyse de remédiation — en s'adaptant aux contraintes de connectivité du terrain béninois grâce à une stratégie hors-ligne robuste basée sur des fichiers Excel générés par l'application.

**Contexte technique :** Application web React/TypeScript, backend Supabase (PostgreSQL + Auth + RLS), déployée sur Vercel. La stratégie hors-ligne repose sur la génération et le réimport de fichiers Excel (SheetJS). Le chiffrement des données d'identité est exécuté exclusivement dans des Edge Functions Supabase, jamais dans le bundle client.

**Approche de livraison :** L'application est livrée en deux incréments — Incrément 1 (fonctionnalités opérationnelles) puis Incrément 2 (fonctionnalités analytiques, exports avancés, durcissement) — mais le périmètre cible est l'application complète de production. Aucune fonctionnalité n'est définitivement exclue.

---

## 2. Core Vision

### 2.1 Problèmes réels (pondérés par criticité)

| Priorité | Problème | Impact opérationnel |
|---|---|---|
| P0 | Calcul manuel des moyennes → erreurs de délibération | Risque institutionnel fort — un élève mal délibéré génère une contestation |
| P0 | Listes Excel incohérentes → doubles numéros de copie | Fragilise l'anonymat et rend le dépouillement impossible |
| P1 | Résultats accessibles sur papier uniquement | Délai d'attente, déplacement obligatoire, perte de confiance |
| P1 | Aucune reproductibilité d'un examen à l'autre | Temps de setup identique à chaque session |
| P2 | Absence d'analyse pédagogique exploitable | Dommage pédagogique à long terme, mais non bloquant immédiatement |

### 2.2 Hypothèses critiques (à valider avant développement)

Ces hypothèses doivent être validées avec l'équipe DDEST-FP **avant** de démarrer le développement :

| Hypothèse | Risque si fausse |
|---|---|
| H1 — Les chefs de centre maîtrisent Excel suffisamment pour saisir des notes dans un fichier structuré | Si faux → tout le workflow hors-ligne s'effondre |
| H2 — L'administration DDEST-FP dispose d'un ordinateur connecté pour opérer la plateforme | Si faux → l'ADMIN ne peut pas utiliser l'application |
| H3 — Les résultats seront effectivement consultés via le web (smartphones disponibles) | Si faux → la page de résultats n'apporte aucune valeur |
| H4 — Les grilles disciplines/coefficients par série sont stables d'une session à l'autre | Si faux → le paramétrage doit être refait entièrement à chaque examen |
| H5 — La DDEST-FP est prête à adopter un outil numérique dès la prochaine session | Si faux → risque de non-adoption même avec un produit fonctionnel |

### 2.3 Solutions existantes et leurs limites

- **Excel** : Outil de calcul, pas un système de gestion — aucune traçabilité, aucune validation, pas de collaboration sécurisée.
- **Logiciels génériques (SGS, etc.)** : Non adaptés au contexte béninois — pas de gestion de l'anonymat, pas de stratégie hors-ligne, pas de configuration EPS post-admissibilité.
- **Solutions papier** : Délibération lente, résultats non consultables à distance, aucune analyse possible.

---

## 3. Target Users

### 3.1 Personas enrichis avec cas d'échec

---

#### Abdoulaye — ADMIN / GESTIONNAIRE_EXAMEN (Directeur / Responsable informatique DDEST-FP)

**Objectif principal :** Orchestrer l'intégralité d'un cycle d'examen sans toucher à Excel.

**Parcours clé :** Créer l'examen → configurer anonymat/séries/EPS → superviser l'import des élèves → valider la répartition → télécharger les listes → superviser l'import des notes → lancer la délibération → publier → exporter le rapport.

**Cas d'échec critiques :**
- Il commet une erreur de configuration (mauvais seuil d'admissibilité) et la découvre après délibération → besoin d'un mécanisme de correction pré-publication
- Il publie des résultats avant que tous les centres aient importé leurs notes → besoin d'une alerte de contrôle avant publication
- Il perd son accès administrateur le jour de la délibération → besoin d'un mécanisme de récupération d'accès robuste et d'un rôle SUPER_ADMIN distinct

---

#### Brice — CHEF_ETABLISSEMENT

**Objectif principal :** Connaître les résultats de ses élèves et identifier ceux qui ont besoin de soutien.

**Parcours clé :** Se connecter → voir ses élèves → consulter résultats → analyser matières faibles → exporter rapport.

**Cas d'échec critiques :**
- Il découvre qu'un de ses élèves est absent de la liste → canal de signalement vers l'ADMIN
- Il a accès à des données d'un autre établissement → faille RLS critique

---

#### Clarisse — CHEF_CENTRE

**Objectif principal :** Saisir les notes hors-ligne et les importer sans erreur.

**Parcours clé :** Télécharger les fichiers avant le jour J → saisir les notes dans Excel hors-ligne → importer à la reconnexion → corriger les erreurs signalées.

**Cas d'échec critiques :**
- Elle modifie accidentellement la structure du fichier Excel → le parseur doit détecter et signaler clairement
- Elle importe un fichier pour le mauvais centre → la validation doit inclure une vérification d'identité du fichier
- Elle a saisi les notes avec des virgules (10,5 au lieu de 10.5) → le parseur doit normaliser automatiquement
- Elle importe le même fichier deux fois → comportement UPSERT défini (voir section 4.2.2)

---

#### Didier — ENSEIGNANT

**Objectif principal :** Identifier ses élèves en difficulté et adapter sa pédagogie.

**Parcours clé :** Se connecter → voir résultats de ses classes → lire les recommandations → planifier soutien.

**Cas d'échec critiques :**
- Il s'attend à des recommandations granulaires (par chapitre) mais reçoit des alertes par discipline → message d'interface honnête sur les limites du système

---

#### Fatou — TUTELLE (Lecture seule, multi-dimensionnel)

**Objectif principal :** Analyser les résultats avec des filtres combinables pour produire des rapports institutionnels. Aucun droit d'écriture, aucune action sur les examens.

**Filtres requis :** Par examen · par centre · par établissement · par classe · par série/filière · par discipline · par sexe · par commune · par type de milieu.

**Cas d'échec critiques :**
- Les exports PDF/Excel pour 8 000 élèves sont trop lents → génération asynchrone avec job queue requise (Incrément 2)
- Elle voit par erreur l'interface de gestion des comptes → faille RBAC critique (les deux rôles doivent avoir des interfaces entièrement séparées)

---

#### Issiaka — SUPER_ADMIN (Administration système)

**Objectif principal :** Administrer la plateforme — gérer les comptes utilisateurs, superviser tous les examens, intervenir en cas d'incident. Ce rôle n'est pas pédagogique : il n'a pas besoin de filtres analytics avancés.

**Parcours clé :** Créer des comptes (GESTIONNAIRE, CHEF_CENTRE, CHEF_ETAB, TUTELLE) → créer ou déléguer des examens → intervenir sur n'importe quel examen en cas d'incident → consulter l'audit log global.

**Cas d'échec critiques :**
- Il est le seul SUPER_ADMIN et perd son accès le jour d'une délibération → prévoir au moins 2 comptes SUPER_ADMIN actifs
- Il confond son rôle avec celui de GESTIONNAIRE et crée lui-même tous les examens → point de défaillance unique à éviter

---

#### Kevin — ELEVE / Aïssatou — PARENT

**Objectif principal :** Consulter le résultat depuis un smartphone, sur réseau lent.

**Contrainte technique critique :** La page de consultation doit fonctionner sur 2G/3G. Charge initiale < 100 KB. Cette page est une route ultra-légère, distincte du SPA principal.

---

### 3.2 Synthèse RBAC

#### État cible (application complète)

| Rôle | Périmètre des données | Actions autorisées |
|---|---|---|
| SUPER_ADMIN | Tous les examens, tous les établissements | Bypass global — gestion comptes, création examens, intervention sur tout examen, audit log global |
| GESTIONNAIRE_EXAMEN | Ses examens (créés ou assignés) | Paramétrage, import élèves, délibération, publication |
| CHEF_CENTRE | Son centre uniquement | Téléchargement listes, import notes, édition notes (statut CORRECTION uniquement) |
| CHEF_ETABLISSEMENT | Ses élèves uniquement | Lecture résultats, exports de son établissement, affectation enseignants |
| TUTELLE | Tous les examens | Lecture seule, tous les filtres, tous les exports — zéro droit d'écriture |
| ENSEIGNANT | Ses classes uniquement | Lecture résultats de ses classes, remédiation |
| (Public) | Page de résultats | Consultation par numéro + code d'accès uniquement |

#### Modèle de délégation SUPER_ADMIN → GESTIONNAIRE_EXAMEN

Le SUPER_ADMIN dispose de 3 modes d'opération non exclusifs :

```
Mode 1 — SUPER_ADMIN opère seul
  SUPER_ADMIN crée l'examen et le gère lui-même de bout en bout.
  Aucun GESTIONNAIRE impliqué.

Mode 2 — SUPER_ADMIN crée, GESTIONNAIRE gère
  SUPER_ADMIN crée l'examen → ajoute un GESTIONNAIRE_EXAMEN
  dans la table exam_members avec role='gestionnaire'.
  Le GESTIONNAIRE a les mêmes droits qu'en mode 3, mais sur un examen préexistant.
  SUPER_ADMIN garde un droit d'intervention à tout moment.

Mode 3 — GESTIONNAIRE autonome
  SUPER_ADMIN crée un compte GESTIONNAIRE_EXAMEN.
  Le GESTIONNAIRE crée lui-même ses examens et les gère en autonomie.
  SUPER_ADMIN garde un bypass global (peut intervenir sur tout examen).
```

**Implémentation (Supabase RLS) :**

```sql
-- Table d'appartenance par examen
exam_members (
  examen_id   uuid  REFERENCES examens(id),
  user_id     uuid  REFERENCES auth.users(id),
  role        text  -- 'gestionnaire' | 'chef_centre' | 'chef_etab'
)

-- RLS : GESTIONNAIRE accède uniquement aux examens
--       où il est inscrit dans exam_members
-- SUPER_ADMIN : BYPASSRLS (politique globale sans filtre)
```

Les privilèges partagés sont tout-ou-rien (pas de sous-ensemble configurable) : un GESTIONNAIRE assigné à un examen a exactement les mêmes droits qu'un GESTIONNAIRE autonome sur cet examen.

#### État Incrément 1 (déploiement initial)

En Incrément 1, les rôles sont simplifiés pour réduire la complexité de configuration initiale :

| Rôle cible | Couvert par en I1 | Note |
|---|---|---|
| SUPER_ADMIN | ADMIN (rôle unique élargi) | Distinction SUPER_ADMIN / GESTIONNAIRE dès l'Incrément 2 |
| GESTIONNAIRE_EXAMEN | ADMIN | Idem |
| TUTELLE | TUTELLE | Disponible dès I1 |
| ENSEIGNANT | CHEF_ETABLISSEMENT avec filtre classe | Interface enseignant dédiée en I2 |

---

## 4. Spécification Fonctionnelle des Modules Critiques

### 4.1 Moteur de Délibération — Spécification Mathématique

> **Avertissement :** Cette spécification doit être validée par la DDEST-FP avant implémentation. Tout écart par rapport aux règles officielles constitue un bug de délibération.

#### 4.1.1 Codes de statut par discipline

Trois codes distincts, en plus d'une note numérique, peuvent être saisis dans le fichier de saisie pour chaque discipline :

| Code | Signification | Traitement délibération | Affichage bulletin |
|---|---|---|---|
| `[0..20]` | Note numérique normale | Incluse dans le calcul | Note affichée |
| `ABS` | Absent à cette épreuve | NON ADMIS automatique — aucun calcul | "Absent — Non délibéré" |
| `ABD` | Abandon de cette épreuve | NON ADMIS automatique — aucun calcul | "Abandon — Non délibéré" |

**Règle absolue : si une seule discipline a le statut `ABS` ou `ABD` → NON ADMIS automatique, sans exception, sans calcul de moyenne.**

**Cellule vide dans le fichier de saisie = erreur à l'import** — jamais interprétée comme `ABS`.

**Statuts globaux dérivés :**
- Absent global = toutes disciplines `ABS` → bulletin : "Absent — Non délibéré"
- Abandon global = au moins une `ABD`, reste `ABS`/notes → bulletin : "Abandon — Non délibéré"
- `ABS`/`ABD` partiel = au moins une note + au moins un `ABS`/`ABD` → bulletin : "Non délibéré — discipline(s) manquante(s) : [liste]"

**Modèle à deux couches (inchangé pour les autres cas) :**

*Couche 1 — Parseur (import Excel) :*

| Cas | Comportement |
|---|---|
| Cellule vide sur discipline obligatoire | Ligne en erreur — rapport d'import |
| Code `ABS` ou `ABD` | Accepté — stocké comme statut distinct en base |
| Note avec virgule ("10,5") | Normalisation automatique → 10.5 |
| Note textuelle non convertible ("dix") | Ligne en erreur |
| Note hors plage [0, 20] | Ligne en erreur |

*Couche 2 — Moteur de délibération :*

| Cas | Comportement |
|---|---|
| `ABS` ou `ABD` sur une discipline | NON ADMIS automatique — pas de calcul |
| Note toujours absente en base (null) | Délibération bloquée — alerte pré-délibération |
| Note = 0 | Incluse dans le calcul (note normale) |
| Discipline non applicable à la série du candidat | Exclue du numérateur ET du dénominateur |

---

#### 4.1.2 Types de disciplines — Paramétrage par examen

Chaque discipline est configurée avec un type qui détermine sa phase d'intégration et son mode de calcul :

| Type | Phase incluse | Paramètres spécifiques |
|---|---|---|
| `ecrit_obligatoire` | Phase 1 + Phase 2 | `series_applicables`, `type` (obligatoire/au_choix), `options` |
| `oral` | Phase 2 uniquement | `modele_oral` : A ou B |
| `eps` | Phase 2 uniquement | `inapte_possible` : oui/non |
| `facultatif` | Phase 2 uniquement | `modele_facultatif` : bonus ou normal |

**Modèle A — Oral discipline séparée (défaut Bénin) :**
Discipline "Français Oral" avec son propre coefficient — deux entrées indépendantes dans la grille.

**Modèle B — Oral composante d'une discipline écrite :**
Discipline "Français" = `(note_ecrit × poids_ecrit) + (note_oral × poids_oral)`, coefficient global unique.
Les deux notes sont saisies séparément ; la combinaison est calculée avant d'entrer dans la formule.

**Option 1 — Facultatif bonus pur (défaut) :**
```
Si note_facultatif > seuil_facultatif (défaut 10/20) :
  points_bonus = (note_facultatif - seuil_facultatif) × coeff_facultatif × 100
  → ajoutés aux points totaux (le dénominateur n'est PAS modifié)
Si note_facultatif ≤ seuil_facultatif : ignorée (ne pénalise pas)
```

**Option 2 — Facultatif comptée normalement :**
Intégrée au calcul comme toute autre discipline (numérateur ET dénominateur modifiés).

---

#### 4.1.3 Formule de calcul — Arithmétique entière normative

```
Moyenne_centièmes = Math.round(SUM(note_i * coeff_i * 100) / SUM(coeff_i))
                    pour les disciplines du périmètre actif

Stockage en base : INTEGER (ex: 11.77 → 1177)
Affichage        : Moyenne_centièmes / 100
Comparaison seuil: Moyenne_centièmes >= Seuil × 100
```

Cette règle élimine toute erreur d'accumulation en virgule flottante aux valeurs de seuil.

**Exemple :**
```
Série D — Écrit : Maths (coeff 4), Français (coeff 3), SVT (coeff 3), Anglais (coeff 2)

Notes : Maths=12, Français=10, SVT=14, Anglais=9
Calcul Phase 1 :
  Math.round((12×4 + 10×3 + 14×3 + 9×2) × 100 / (4+3+3+2))
= Math.round((48+30+42+18) × 100 / 12)
= Math.round(138 × 100 / 12)
= Math.round(1150) = 1150  →  11.50/20
```

---

#### 4.1.4 Mode délibération unique (sans phases)

```
Configuration : mode_deliberation = "unique"
Disciplines    : toutes (écrit + oral + EPS + facultatives si activées)

Pour chaque élève :
  1. Si ABS ou ABD sur n'importe quelle discipline → NON ADMIS automatique
  2. Calculer Moyenne_centièmes (§4.1.3) sur toutes disciplines actives
     + bonus facultatif Option 1 si activé
  3. Décision :
     ADMIS       si Moyenne_centièmes >= Seuil_admission × 100
     RATTRAPAGE  si activé ET Seuil_rattrapage × 100 <= Moyenne < Seuil_admission × 100
     NON ADMIS   sinon
  4. Mention calculée selon les seuils configurés
```

---

#### 4.1.5 Mode 2 phases — Admissibilité provisoire puis Délibération finale

```
Configuration : mode_deliberation = "deux_phases"
  seuil_phase1  : seuil admissibilité provisoire  (défaut 9/20  → 900 centièmes)
  seuil_phase2  : seuil admission définitive       (défaut 10/20 → 1000 centièmes)
  Composantes Phase 2 activables : oral / EPS / facultatives (indépendants)

─────────────────────────────────────────────────────────────────
PHASE 1 — Admissibilité provisoire (disciplines ecrit_obligatoire uniquement)
─────────────────────────────────────────────────────────────────
Pour chaque élève :
  1. Si ABS ou ABD sur n'importe quelle discipline ecrit_obligatoire
     → NON ADMIS DEFINITIF (résultat final, pas de Phase 2)
  2. Sinon :
     Moyenne_phase1 = Math.round(SUM(note_i × coeff_i × 100) / SUM(coeff_i))
                      disciplines ecrit_obligatoire applicables à la série
     Si Moyenne_phase1 >= seuil_phase1 × 100 → ADMISSIBLE (continue Phase 2)
     Sinon → NON ADMIS DEFINITIF

─────────────────────────────────────────────────────────────────
PHASE 2 — Délibération finale (admissibles uniquement)
─────────────────────────────────────────────────────────────────
Pour chaque ADMISSIBLE :
  1. Si ABS ou ABD sur n'importe quelle discipline Phase 2 activée
     SAUF INAPTE EPS → NON ADMIS
  2. Calculer Points_total et Coeff_total :
     a. Partir des disciplines ecrit_obligatoire (déjà calculées en Phase 1)
     b. Ajouter disciplines oral activées (Modèle A : notes séparées / Modèle B : combinaison poids)
     c. Ajouter EPS si activée et élève APTE
        Si élève INAPTE EPS : EPS exclue, Moyenne_phase2 = Moyenne_phase1
        → ADMIS automatique si Moyenne_phase1 >= seuil_phase1 × 100
     d. Ajouter facultatives :
        Option 1 (bonus) : points_bonus = MAX(0, note - seuil_facultatif × 100) × coeff
                           → ajoutés à Points_total, Coeff_total inchangé
        Option 2 (normal): note × coeff ajoutés à Points_total ET Coeff_total
  3. Moyenne_phase2 = Math.round(Points_total / Coeff_total)
  4. Décision :
     ADMIS     si Moyenne_phase2 >= seuil_phase2 × 100
     NON ADMIS sinon
     (RATTRAPAGE non applicable en mode deux_phases — décision binaire)
  5. Mention calculée sur Moyenne_phase2
```

---

#### 4.1.6 Paramètres de configuration du moteur

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `mode_deliberation` | enum | `deux_phases` | `unique` ou `deux_phases` |
| `seuil_phase1` | decimal | 9.00 | Seuil admissibilité Phase 1 |
| `seuil_phase2` | decimal | 10.00 | Seuil admission Phase 2 (aussi seuil unique si mode=unique) |
| `rattrapage_actif` | boolean | false | Active la décision RATTRAPAGE (mode unique seulement) |
| `seuil_rattrapage` | decimal | null | Seuil inférieur RATTRAPAGE |
| `oral_actif` | boolean | false | Active les disciplines orales en Phase 2 |
| `modele_oral_defaut` | enum | `A` | `A` (discipline séparée) ou `B` (composante) |
| `eps_actif` | boolean | false | Active l'EPS en Phase 2 |
| `facultatif_actif` | boolean | false | Active les épreuves facultatives en Phase 2 |
| `modele_facultatif` | enum | `bonus` | `bonus` (Option 1) ou `normal` (Option 2) |
| `seuil_facultatif` | decimal | 10.00 | Seuil bonus Option 1 |
| `mentions` | JSONB | `[{seuil:16,libelle:"Très Bien"},…]` | Seuils des mentions (configurables) |

---

#### 4.1.7 Multi-séries et matières au choix

Chaque discipline est associée à une liste de séries applicables et un type d'obligation :

| Paramètre discipline | Valeurs | Exemple |
|---|---|---|
| `series_applicables` | `["toutes"]` / `["A","C"]` / `["D"]`… | `["C","D"]` pour SVT |
| `type_obligation` | `obligatoire` / `au_choix` | `au_choix` pour LV2 |
| `options_choix` | `[]` / `["Anglais","Espagnol","Arabe"]` | Pour LV2 au choix |

**Règles :**
- Discipline non applicable à la série du candidat → exclue du calcul (numérateur + dénominateur)
- Candidat sans choix renseigné sur une discipline `au_choix` → **import bloqué**, message explicite
- Les lots sont série-homogènes et option-homogènes (cf. §4.9.3)

**Clé d'un lot de saisie :** `(centre_id, examen_id, matiere_id, serie_id, option_id, lot_numero)`

---

#### 4.1.8 Révision post-délibération

Avant publication officielle, l'ADMIN peut :
- Corriger une note individuelle → recalcul automatique + alerte si changement de décision
- Verrouiller la délibération → plus aucune modification possible

Après publication : **aucune modification permise en base**. Une réclamation génère un ticket dans l'audit log, traité hors application.

---

### 4.2 Stratégie Hors-Ligne — Spécification du Parseur

#### 4.2.1 Structure des fichiers Excel générés — Décision : un fichier par lot

**Décision retenue : un fichier Excel distinct par lot** (et non plusieurs onglets dans un seul fichier).

Raisons :
- **Isolation des défaillances** : un fichier corrompu n'affecte pas les autres lots
- **Saisie parallèle** : plusieurs personnes peuvent saisir simultanément sur des lots différents
- **Import progressif** : les lots peuvent être importés au fur et à mesure
- **Fiabilité réseau** : des fichiers de 30-50 lignes se téléchargent/uploadent en quelques secondes sur 3G

```
Fichier par lot : notes_[nom_centre]_[nom_examen]_lot[n].xlsx
  (ex: notes_CentreNord_ExamBlanc1_Lot3.xlsx)

Structure interne :
  Onglet unique "Notes"
    Ligne 1 : En-têtes verrouillées [PROTEGEES — NE PAS MODIFIER]
              → Colonnes : N°_Anonyme | [Discipline] | ... (disciplines de la série + option)
    Ligne 2 : Coefficients [LIGNE INFO — NE PAS MODIFIER]
    Lignes 3..N : Données élèves — seules les colonnes de notes sont éditables
              → Valeurs acceptées : numérique [0..20] | "ABS" | "ABD"
              → Cellule vide = erreur à l'import (jamais équivalente à ABS)

  Onglet caché "_meta" :
    - centre_id, examen_id, matiere_id, serie_id, option_id, lot_numero, nb_eleves_attendus
    - date_generation, version_template
    - hmac_signature : HMAC-SHA256(centre_id + examen_id + matiere_id + serie_id + option_id
                                   + lot_numero + nb_eleves + generation_timestamp, SECRET_KEY)
      → Calculé et signé côté serveur (Edge Function) à la génération
      → Signe UNIQUEMENT les métadonnées _meta — PAS le contenu Excel (les notes saisies ne cassent pas la signature)
      → Inforgeable côté client — SECRET_KEY jamais exposée dans le bundle React
      → generation_timestamp inclus pour l'anti-replay (fenêtre d'acceptation configurable, défaut 90 jours)
```

**Distribution terrain :** Un bouton "Télécharger tous les lots (ZIP)" génère une archive contenant
tous les fichiers du centre. Clarisse extrait le ZIP, distribue les fichiers si nécessaire,
puis uploade chaque fichier séparément à la reconnexion.

**Suivi d'avancement par lot dans l'interface :**
```
Centre Nord — Examen Blanc 1
────────────────────────────────────────────────────
Lot 1 (50 élèves)  ✓ Importé le 12/03 à 14h32
Lot 2 (50 élèves)  ✓ Importé le 12/03 à 14h45
Lot 3 (50 élèves)  ⚠ 2 erreurs à corriger
Lot 4 (47 élèves)  — En attente d'import
────────────────────────────────────────────────────
Total : 150 / 197 notes importées
```

#### 4.2.2 Règles de validation à l'import

| Contrôle | Comportement en cas d'échec |
|---|---|
| Vérification HMAC-SHA256 (via Edge Function) | Import refusé — "Fichier modifié, corrompu ou non généré par l'application" — un fichier reconstruit manuellement avec la bonne structure est également rejeté car le HMAC ne peut être recalculé sans la clé serveur |
| Correspondance centre_id/examen_id avec l'interface | Import refusé — "Ce fichier n'appartient pas à ce centre/examen" |
| Double import du même lot (même centre_id + lot_numero) | **Comportement UPSERT** : les notes existantes sont écrasées ligne par ligne par (numero_anonyme, lot_numero). Si des corrections manuelles in-app existent sur ces lignes, un avertissement explicite s'affiche avant de continuer : "X notes modifiées manuellement seront écrasées. Confirmer ?" Chaque écrasement est tracé en audit log. |
| Note hors plage [0, 20] | Ligne en erreur — les autres lignes du fichier sont importées |
| Note avec virgule ("10,5") | Normalisation automatique → 10.5 (transparent) |
| Note textuelle non convertible ("dix") | Ligne en erreur — signalée dans le rapport |
| Note vide pour une discipline obligatoire | Ligne en erreur — import partiel de la ligne refusé |
| Colonne supprimée ou renommée | Import refusé — "Structure invalide : colonne [X] manquante" |
| Nombre de lignes ne correspond pas au nb_eleves_attendus | Avertissement non bloquant — des élèves ont peut-être été omis |

#### 4.2.3 Rapport d'erreurs post-import

```
Rapport d'import — Centre Nord — Lot 3 — 12/03 à 14h52
────────────────────────────────────────────────────────
Lignes importées avec succès : 48 / 50
Lignes en erreur : 2

  N° anonyme 3045 : note "dix" non valide pour Maths
  N° anonyme 3089 : note 25 hors plage [0, 20] pour Français

Options :
  [Corriger dans l'application]   ← édition directe en ligne dans l'interface
  [Re-télécharger le fichier corrigé et réimporter]
```

> **Note :** L'option "Corriger dans l'application" est disponible uniquement en statut CORRECTION.
> Voir section 4.3 pour les droits d'édition et les points de verrouillage.

---

### 4.3 Droits d'Édition des Notes et Verrouillage par Statut

#### 4.3.1 Décision : édition in-app autorisée pour le Chef de Centre

**Décision retenue : oui, le Chef de Centre peut corriger des notes directement dans l'interface
après import**, uniquement en statut CORRECTION.

Raisons :
- Évite le cycle fastidieux "erreur → ouvrir Excel → corriger → réimporter" pour 1-2 notes
- Particulièrement utile après le rapport d'erreurs d'import (corrections ciblées)
- Périmètre strictement limité par RLS et par le statut de l'examen

**Contraintes d'édition :**
- Uniquement les notes de son propre centre (RLS)
- Uniquement les cellules de notes — pas l'identité, pas le numéro anonyme, pas la série
- Chaque modification tracée en audit log : user_id, note_id, ancienne_valeur, nouvelle_valeur, timestamp
- Indicateur visuel sur les notes modifiées post-import ("modifiée manuellement le JJ/MM à HH:MM")

#### 4.3.2 Matrice des droits par statut d'examen

```
COMPOSITION
  → Aucune note saisie — édition non applicable
  → Admin : paramétrage, import élèves, gestion centres

  ↓ Premier import de notes par un Chef de Centre

CORRECTION
  → Chef Centre : import + édition individuelle des notes de son centre
  → Admin       : import + édition individuelle de toutes les notes

  ↓ Admin clique "Lancer la délibération"
  ↓ [Alerte si des lots de certains centres ne sont pas encore importés]
  ↓ [Alerte si des élèves ont des notes manquantes]

DELIBERATION
  → Chef Centre : LECTURE SEULE — verrouillé
  → Admin       : édition individuelle toujours possible + recalcul automatique
                  [Alerte si la correction change une décision Admis ↔ Non Admis]

  ↓ Admin valide la délibération

DELIBERE
  → Chef Centre : LECTURE SEULE
  → Admin       : édition + recalcul encore possible (dernière chance avant publication)
                  [Toute modification remet le statut à CORRECTION_POST_DELIBERATION]
                  [L'Admin doit re-valider la délibération avant de pouvoir publier]

  ↓ Admin publie les résultats

PUBLIE
  → Chef Centre : LECTURE SEULE
  → Admin       : LECTURE SEULE — aucune modification en base
  → Toute réclamation = procédure institutionnelle hors application
                        (tracée en audit log comme ticket manuel)
```

#### 4.3.3 Résumé des droits par statut

| Statut | Chef Centre | Admin |
|---|---|---|
| COMPOSITION | — | Paramétrage uniquement |
| CORRECTION | Import + édition de ses notes | Import + édition de toutes les notes |
| DELIBERATION | Lecture seule | Édition + recalcul |
| DELIBERE | Lecture seule | Édition + recalcul (retour à CORRECTION_POST_DELIBERATION) |
| PUBLIE | Lecture seule | Lecture seule |

#### 4.3.4 Garde-fous pour l'édition Admin en post-délibération

1. **Alerte de changement de décision** : si la correction modifie le résultat d'un élève
   (ex : 9.98 → 10.02), une alerte explicite s'affiche avant la sauvegarde :
   "Cette modification change la décision de l'élève N°XXXX de NON ADMIS à ADMIS. Confirmer ?"

2. **Re-délibération obligatoire** : toute modification en statut DELIBERE remet le statut
   à CORRECTION_POST_DELIBERATION. L'Admin doit re-valider la délibération avant de republier.
   Cette action est tracée en audit log avec le motif saisi par l'Admin.

---

### 4.4 Import Élèves — Modèle de Données et Configuration du Template

#### 4.4.1 Principe : template dérivé de la configuration de l'examen

Le format du fichier d'import élèves **n'est pas libre ni universel**. Il est configuré une seule fois à la création de l'examen par l'Admin, en fonction du format que ses établissements peuvent fournir. Ce choix est verrouillé dès le premier import.

La divergence de format entre examens est réelle et attendue — elle est gérée par configuration, pas par tolérance du parseur.

#### 4.4.2 Modèle interne élève (ce que l'app stocke)

```
eleve {
  // Champs d'identité — chiffrés AES-256 via Edge Function avant stockage
  id             uuid
  nom            encrypted
  prenom         encrypted       (null si nom_complet utilisé)
  date_naissance encrypted       (null si absent)
  lieu_naissance encrypted       (null si absent)

  // Champs organisationnels — en clair
  examen_id      uuid
  etablissement_id uuid
  classe         text            (null si absent)
  serie          text            (null si examen sans catégorisation)
  sexe           enum(M,F)       (null si absent)
  matricule      text            (null si absent)
  commune        text            (null si absent)
  type_milieu    enum(Urbain, Rural, Semi-urbain) (null si absent)
  aptitude_eps   enum(Apte, Inapte) (null si EPS mode normal)

  // Champs additionnels libres
  champs_supplementaires jsonb   (ex: {"Zone_IEP": "Nord", "Code_Inscription": "2025-042"})

  // Champs générés par l'app (pas dans l'import)
  numero_anonyme text            (généré si anonymat activé)
  salle          text            (affecté après configuration du centre)
  numero_table   integer         (affecté après configuration du centre)
  code_acces     text            (hashé bcrypt — généré à la délibération)
}
```

#### 4.4.3 Configuration du template à la création de l'examen

L'Admin configure le format du fichier d'import en 3 niveaux :

**Niveau 1 — Champs standards (variantes prédéfinies)**

| Champ | Options |
|---|---|
| Nom / Prénom | ○ Colonnes séparées ○ Colonne unique `Nom_Complet` (scindée sur le premier espace) |
| Date de naissance | ○ Colonne séparée `Date_Naissance` ○ Combinée avec lieu `Date_Lieu_Naissance` ○ Absente |
| Lieu de naissance | ○ Colonne séparée ○ Combiné avec date (voir ci-dessus) ○ Absent |
| Matricule | ○ Présent ○ Absent |
| Classe | ○ Présente ○ Absente |
| Sexe | ○ Présent ○ Absent |
| Commune | ○ Présente ○ Absente |
| Type de milieu | ○ Présent ○ Absent |

**Niveau 2 — Champs conditionnels (automatiques)**

| Champ | Condition |
|---|---|
| `Serie` | Ajouté automatiquement si catégorisation activée |
| `Aptitude_EPS` | Ajouté automatiquement si EPS activée en Phase 2 |
| `Choix_[Discipline]` | Ajouté automatiquement pour chaque discipline `au_choix` (ex: `Choix_LV2`) — obligatoire à l'import, valeur doit correspondre à une option configurée. Import bloqué si valeur absente ou invalide. |

**Niveau 3 — Champs additionnels libres**

```
[+ Ajouter un champ]
  Intitulé : [Zone_IEP           ]   Requis à l'import : ○ Oui  ○ Non
  Intitulé : [Code_Inscription   ]   Requis à l'import : ○ Oui  ○ Non
```
- Type : texte uniquement
- Stockés dans `champs_supplementaires` (JSONB)
- Non validés en format — juste présence/absence si requis
- Non utilisés par le moteur de délibération
- Disponibles comme dimensions d'analyse si `dans_analyse = true`

#### 4.4.4 Propriétés par champ — rôles indépendants

Chaque champ possède 5 rôles indépendants configurables par l'Admin :

| Propriété | Description |
|---|---|
| `dans_import` | Le champ est attendu dans le fichier d'import |
| `requis_import` | Obligatoire — ligne en erreur si absent |
| `dans_analyse` | Disponible comme dimension de filtre analytics (Tutelle) |
| `dans_emargement` | Apparaît dans la liste d'émargement imprimée |
| `ordre_emargement` | Position dans la liste (1, 2, 3…) — défini par l'Admin via flèches ▲▼ |

**Exemples de configuration typique :**

| Champ | Import | Requis | Analyse | Émargement | Ordre |
|---|---|---|---|---|---|
| Nom | Oui | Oui | Non | Oui | 1 |
| Prénom | Oui | Oui | Non | Oui | 2 |
| Classe | Oui | Non | Oui | Oui | 3 |
| Matricule | Oui | Non | Non | Oui | 4 |
| Commune | Oui | Non | **Oui** | **Non** | — |
| Type_Milieu | Oui | Non | **Oui** | **Non** | — |
| Sexe | Oui | Non | **Oui** | **Non** | — |
| N°_Table | Non (généré) | — | Non | Oui | 5 |
| Salle | Non (généré) | — | Non | Oui | 6 |
| Signature | Non (vide) | — | Non | Oui | 7 |

L'Admin ordonne les colonnes d'émargement via les flèches ▲▼. La liste générée respecte exactement cet ordre.

#### 4.4.5 Affectation Salle et Numéro de Table

Salle et N° de table **ne peuvent pas être spécifiés à l'import par établissement** — ils dépendent de l'ensemble des élèves du centre (multi-établissements), pas d'un seul.

**Workflow d'affectation :**

```
1. Tous les élèves du centre importés
   ↓
2. Admin configure les salles du centre :
   - Nombre de salles, capacité par salle
   - Règle d'affectation : Alphabétique par nom | Par N° anonyme | Par établissement
   ↓
3. App génère automatiquement : Salle + N° de table pour chaque élève
   (N° de table = numéro de composition, séquentiel GLOBAL au centre :
    Salle A → tables 1..n1, Salle B → tables n1+1..n1+n2, etc.
    Un numéro identifie un candidat de façon unique dans tout le centre, pas dans une salle.)
   ↓
4. Admin ou Chef de Centre ajuste manuellement si besoin (réaffectation individuelle)
   ↓
5. Génération des listes d'émargement finales — colonnes et ordre configurés
```

**Règle d'affectation "Par établissement" :**
L'Admin assigne chaque établissement à une salle : "Collège A → Salle 1, Collège B → Salle 2".
L'app affecte automatiquement tous les élèves de chaque établissement à la salle désignée.

**Règle d'affectation "Alphabétique / N° anonyme" (standard) :**
Les élèves de tous les établissements sont mélangés et numérotés séquentiellement.

---

### 4.5 Affectation Enseignant par Discipline et Classe

#### 4.5.1 Objectif

Permettre à l'Admin ou au Chef d'Établissement d'associer un enseignant à chaque couple `(discipline, classe)` afin d'enrichir les analyses pédagogiques post-délibération.

Cette association est **optionnelle** — elle n'affecte ni le calcul des moyennes, ni la délibération, ni les droits d'accès. Elle enrichit uniquement les tableaux de bord analytiques.

#### 4.5.2 Modèle de données

```
affectation_enseignant {
  examen_id        uuid
  etablissement_id uuid
  classe           text          (ex: "3ème A")
  discipline       text          (ex: "Mathématiques")
  nom_enseignant   text          (ex: "AÏNA Didier")
}
```

Un enseignant peut être affecté à plusieurs couples discipline/classe.
L'entrée est libre — pas de table `enseignants` à maintenir.

#### 4.5.3 Qui saisit, quand

| Acteur | Périmètre | Moment |
|---|---|---|
| Chef d'Établissement | Ses classes uniquement | Après import des élèves — avant ou après délibération |
| Admin | Tous les établissements | Idem |

La saisie se fait via un formulaire dans l'interface — pas à l'import.

#### 4.5.4 Impact sur les analyses

Quand une affectation est saisie, le tableau de bord analytique affiche :

```
Discipline : Mathématiques — Classe : 3ème A — Collège de Kandi
Enseignant : AÏNA Didier
────────────────────────────────────────────────────────────
Taux de réussite : 42% (21/50 élèves >= 10/20)
Note médiane : 8.5/20   Écart-type : 3.2
Élèves sous seuil d'alerte (< 8/20) : 18 élèves  [Voir liste]
Comparaison département : -12 pts vs moyenne Alibori
```

Quand aucune affectation n'est saisie, la ligne enseignant est absente — pas d'erreur.

---

### 4.6 Anonymat Physique — Souche Détachable

#### 4.6.1 Principe

Quand l'anonymat est activé, la garantie d'intégrité repose non seulement sur le système informatique, mais aussi sur un processus physique qui empêche toute manipulation entre la composition et le dépouillement.

#### 4.6.2 Document "Souche détachable" généré par l'application

Pour chaque élève, l'application génère (ou intègre dans la liste d'émargement) une **souche détachable** avec :

```
┌─────────────────────────────────┐  ┊  ┌─────────────────────────────────┐
│  [NOM PRÉNOM — CLASSE — ETAB]   │  ┊  │    N° ANONYME : 3045            │
│  Salle 2 — Table 14             │  ┊  │    Examen : Blanc 1 — 2026       │
│  Signature élève : ____________ │  ┊  │    [À CONSERVER PAR L'ÉLÈVE]    │
└─────────────────────────────────┘  ┊  └─────────────────────────────────┘
  ← Partie conservée par le centre      ← Partie remise à l'élève (reçu)
```

#### 4.6.3 Workflow physique

```
1. AVANT la composition :
   - L'app génère la liste d'émargement avec souches détachables
   - Le chef de centre distribue les souches à chaque élève lors de l'appel

2. PENDANT la composition :
   - L'élève écrit son numéro anonyme sur sa copie, PAS son nom
   - La souche "partie centre" est conservée pour le contrôle d'identité
   - Les copies sont triées dans l'ordre croissant des numéros anonymes pour remise

3. APRÈS la composition :
   - L'app génère les fiches d'orientation pour l'équipe d'anonymat (cf. §4.9.4) :
     Fiche d'Attribution (par salle, ordre table → numéro anonyme + lot) et
     Grille de Rangement (par lot, ordre numéro anonyme → vérification)
   - La correspondance élève ↔ numéro anonyme est verrouillée en base (RLS ADMIN uniquement)
   - Elle n'est déchiffrée qu'après délibération, par l'ADMIN, pour la publication des résultats

4. LORS DE LA CONSULTATION :
   - L'élève utilise son numéro de souche (= numéro de composition) + code d'accès
   - Son nom n'apparaît jamais sur la page de résultats publique
```

#### 4.6.4 Support applicatif

- Export dédié "Listes avec souches" — séparé des listes d'émargement sans souche
- Instruction de tri automatique générée dans l'export si anonymat activé :
  *"Classer les copies dans l'ordre croissant des numéros anonymes avant remise."*
- La table `correspondances_anonymat` n'est accessible que par le rôle ADMIN (RLS stricte)

---

### 4.7 Remédiation — Définition Concrète

> La "remédiation automatique" de la v1 était une promesse sans définition. Voici ce que le système peut réellement produire sans saisie pédagogique supplémentaire.

#### Ce que le système calcule automatiquement (données de notes uniquement)

1. **Taux de réussite par discipline** : % d'élèves ayant >= seuil_admissibilité pour chaque discipline
2. **Distribution des notes** par discipline (min, max, médiane, écart-type, histogramme)
3. **Liste des élèves en difficulté** : élèves dont la note pour une discipline est < à un seuil paramétrable (ex: 8/20)
4. **Classement des disciplines par taux d'échec** (de la plus critique à la moins critique)
5. **Comparaison inter-établissements** sur chaque discipline
6. **Suivi longitudinal** (si examen lié) : évolution de la moyenne par élève et par discipline
7. **Filtres Tutelle** : par examen · par centre · par établissement · par classe · par série/filière · par discipline · par sexe · par commune · par type de milieu

#### Ce que le système NE peut PAS générer automatiquement (hors scope technique)

- Recommandations pédagogiques par chapitre (nécessiterait un référentiel curriculaire)
- Programme de révision personnalisé (nécessiterait une IA ou une base de contenu)

#### Formulation honnête dans l'interface

```
Tableau de bord — Maths — 3ème B — Collège de Kandi
────────────────────────────────────────────────────
Taux de réussite : 42% (21/50 élèves >= 10/20)
Note médiane : 8.5/20
Ecart-type : 3.2

Élèves sous le seuil d'alerte (< 8/20) : 18 élèves
[Voir la liste]

Comparaison départementale : -12 points vs moyenne Alibori
```

**Ce que le système NE dit PAS :** "Réviser l'algèbre" — car il ne connaît pas quelle partie du programme a échoué.

---

### 4.8 Sécurité & Conformité APDP

#### 4.8.1 Architecture du double anonymat et chiffrement

```
Données d'identité (nom, prénom, date de naissance)
  → Chiffrement AES-256 exécuté EXCLUSIVEMENT dans une Edge Function Supabase
  → JAMAIS dans le bundle React client (la clé ne doit jamais être exposée côté navigateur)
  → Clé de chiffrement stockée dans les variables d'environnement Supabase Edge (jamais en base)
  → La base de données ne stocke que des blobs chiffrés pour les champs d'identité

Flux de chiffrement (import élèves) :
  Client React → Edge Function "encrypt-student-data" → INSERT chiffré en base

Flux de déchiffrement (accès ADMIN post-délibération) :
  Client React (authentifié ADMIN) → Edge Function "decrypt-student-data" → données en clair

Anonymat des copies
  → Numéro anonyme = séquence aléatoire non devinable, générée côté serveur
  → Table de correspondance élève ↔ numéro anonyme :
      - RLS : accessible UNIQUEMENT au rôle ADMIN
      - Visible dans l'interface uniquement après délibération (statut DELIBERE)

Consultation des résultats
  → Code d'accès unique par élève : UUID v4 tronqué à 8 chars alphanumériques
  → Stocké hashé en base (bcrypt) — non récupérable même par l'ADMIN
  → Distribué via export Excel (liste des codes d'accès) → remis physiquement par l'établissement
  → TTL configurable par l'ADMIN (ex: actif 30 jours après publication)
```

#### 4.8.2 Audit Log

Toute action sensible est tracée dans une table `audit_log` (INSERT uniquement, jamais UPDATE ni DELETE) :

| Action tracée | Données enregistrées |
|---|---|
| Import d'élèves | user_id, examen_id, nb_élèves, timestamp |
| Modification d'une note | user_id, eleve_id (anonymisé), discipline, ancienne_note, nouvelle_note, timestamp |
| Écrasement de note par réimport | user_id, eleve_id, lot_numero, ancienne_note, nouvelle_note, timestamp, source="reimport" |
| Lancement de délibération | user_id, examen_id, timestamp, hash des paramètres |
| Publication des résultats | user_id, examen_id, timestamp |
| Consultation d'un résultat | numero_composition (pas l'identité), timestamp, IP hashée |
| Tentative de consultation échouée | numero_composition tenté, timestamp, IP hashée, motif |

Implémentation : triggers PostgreSQL sur les tables critiques → INSERT en audit_log.

#### 4.8.3 RLS Supabase — Règles par table

| Table | Qui peut lire | Qui peut écrire |
|---|---|---|
| `examens` | Tous les rôles authentifiés | ADMIN, GESTIONNAIRE_EXAMEN |
| `eleves` (données chiffrées) | ADMIN uniquement (déchiffrement via Edge Function) | ADMIN, GESTIONNAIRE_EXAMEN (via Edge Function) |
| `notes` | CHEF_CENTRE (son centre), CHEF_ETAB (son etab), TUTELLE (lecture globale) | CHEF_CENTRE (son centre uniquement) |
| `deliberations` | Tous les rôles authentifiés | ADMIN uniquement |
| `correspondances_anonymat` | ADMIN uniquement | ADMIN uniquement |
| `audit_log` | ADMIN, TUTELLE | Triggers uniquement (pas d'INSERT manuel) |
| `affectations_enseignant` | CHEF_ETAB (son etab), ADMIN, TUTELLE | CHEF_ETAB (son etab), ADMIN |

**Note sur les deux couches de protection des données d'identité :**
- **RLS** : contrôle l'accès aux lignes (qui peut accéder à quel enregistrement)
- **Chiffrement Edge Function** : contrôle la lisibilité des données (même l'accès à une ligne ne révèle pas les PII sans passer par l'Edge Function)
Ces deux couches sont indépendantes et complémentaires.

#### 4.8.4 Sécurité de la consultation publique des résultats

La page de consultation publique est exposée sans authentification — elle nécessite des protections spécifiques contre les attaques par énumération ou brute-force.

**Rate limiting par IP :**
- Maximum 5 tentatives par IP par fenêtre de 10 minutes
- Implémenté au niveau de l'Edge Function Supabase (avant accès à la base)

**Rate limiting global par IP (protection réseau) :**
```
Max 20 requêtes / IP / minute → ralentissement — pas de blocage
Protège contre les botnets tout en préservant les IPs partagées légitimes
```

**Lockout par (numero_composition_tente + ip_hash) — PAS par IP seule :**
```
Raisonnement : une IP partagée (réseau école, 4G NAT) ne doit pas bloquer
tous les élèves légitimes d'un même réseau. Le lockout cible la paire numero + IP.

Tentatives 1-5   : réponse normale (succès ou "code incorrect")
Tentative 6      : blocage 1 heure
Tentatives 7-9   : blocage 24 heures
Tentative 10+    : blocage 72 heures + signalement dans l'audit log
                   (pas de blocage permanent automatique — risque DoS involontaire)
```

**Procédure de déblocage ADMIN :**
```
Interface "Audit log → Consultations bloquées" :
  → Liste des (numero, IP hashée, nb tentatives, statut blocage, expiration)
  → Bouton "Débloquer" par entrée → supprime l'état de blocage pour ce (numero + IP)
  → Action de déblocage tracée en audit log
```

**Captcha adaptatif — reporté en Incrément 2 :**
```
Le captcha (hCaptcha, Cloudflare Turnstile) est incompatible avec les contraintes I1 :
  - SDK tiers de 40-80 KB → viole la contrainte < 100 KB de la page publique
  - IPs africaines partagées ont souvent une mauvaise réputation → faux positifs élevés
  - Rate limiting + lockout par (numero + IP) est suffisant pour I1
Réévaluation en I2 selon les données terrain observées après déploiement pilote.
```

**Protections supplémentaires :**
- Réponse identique en cas de numéro inconnu et de code incorrect (pas d'oracle d'énumération)
- Toutes les tentatives échouées sont tracées en audit log (numero_composition tenté, IP hashée, timestamp)
- TTL des codes d'accès : configuré par l'ADMIN lors de la publication (ex: 30 jours)
- Les codes expirés renvoient "Résultats non disponibles" sans révéler qu'ils ont existé

---

### 4.9 Numérotation Anonyme — Paramétrage, Algorithme et Fiches d'Orientation

> Cette section spécifie le système de numérotation des copies anonymes : format du numéro, moment de génération, algorithme de distribution en lots (bons), et documents d'orientation pour l'équipe d'anonymat.

#### 4.9.1 Format du Numéro Anonyme — 3 Paramètres Indépendants

Le numéro anonyme est défini par 3 paramètres configurables à la création de l'examen :

| Paramètre | Valeurs possibles | Défaut |
|---|---|---|
| `prefixe_type` | `aucun` / `numerique_centre` (10, 20…) / `alpha_centre` (C1-, C2-…) | `numerique_centre` |
| `debut_type` | `un` (commence à 1) / `specifie` (valeur fixée par admin) / `aleatoire` (serveur génère) | `un` |
| `bon` | `1` (lots séquentiels de taille_salle_ref) / `3` / `5` | `1` |

**Exemples de combinaisons :**
```
Préfixe numérique + début 1 + bon=1  →  1001, 1002, 1003…  (centre 1)
                                         2001, 2002, 2003…  (centre 2)

Préfixe numérique + bon=5            →  1001, 1006, 1011…  (lot 1, pas=5)
                                         1002, 1007, 1012…  (lot 2, pas=5)

Aucun préfixe + début aléatoire      →  0387, 0388, 0389…  (départ aléatoire)
```

**bon=1 — Lots séquentiels :** avec bon=1, les copies sont regroupées en blocs consécutifs de `taille_salle_ref` (pas d'interleaving). Lot 1 = copies 1..T, Lot 2 = copies T+1..2T, etc. Le nombre de lots = ceil(N / taille_salle_ref).

**Unification lot/saisie :** un lot anonymat = un fichier Excel de saisie = un paquet pour un correcteur. Le paramètre "taille_lot" (ancienne terminologie) est remplacé par `taille_salle_ref`.

**Clé de lot complète :** `(centre_id, examen_id, matiere_id, serie_id, option_id, lot_numero)` — cf. §4.1.7.

**Règle d'immutabilité :** les numéros sont immuables après génération (passage en statut COMPOSITION). Toute réinitialisation invalide les souches déjà imprimées et doit être confirmée explicitement.

---

#### 4.9.2 Moment de Génération

Les numéros anonymes sont générés **lors du passage en statut COMPOSITION** (finalisation du centre), immédiatement après l'affectation salle/table.

**Conditions préalables :**
- Tous les élèves du centre sont importés
- Les salles sont configurées et les numéros de table attribués
- L'anonymat est activé pour cet examen

**Ordre des opérations :**
```
1. Affectation salle/table (cf. §4.4.5)
2. Tri de tous les élèves du centre : salle → table (ordre physique de traitement)
3. Attribution des numéros anonymes selon le format configuré
4. Calcul de l'affectation aux lots (selon algorithme §4.9.3)
5. Génération des fiches d'orientation (§4.9.4)
6. Verrouillage — numéros immuables à partir de ce point
```

---

#### 4.9.3 Algorithme de Distribution en Lots — Bons

**Terminologie :**
- `bon` : entier ∈ {1, 3, 5} — représente le nombre de lots **et** le pas entre numéros d'un même lot
- `taille_salle_ref` : capacité de référence d'une salle (défaut : 30) — contrainte indicative sur la taille des lots

**Valeurs autorisées pour `bon` : 1, 3, 5 uniquement.** Le bon=4 est exclu par convention métier.

**Formule d'attribution (copie en position p dans l'ordre salle → table) :**
```
numero_anonyme = p  (+ préfixe/décalage selon format configuré)
lot            = ((p - 1) % bon) + 1
```

**Résultat pour bon=5, N=150 (5 salles × 30 élèves) :**
```
Lot 1 : positions 1, 6, 11, …, 146   (30 copies, pas = 5)
Lot 2 : positions 2, 7, 12, …, 147   (30 copies, pas = 5)
Lot 3 : positions 3, 8, 13, …, 148   (30 copies, pas = 5)
Lot 4 : positions 4, 9, 14, …, 149   (30 copies, pas = 5)
Lot 5 : positions 5, 10, 15, …, 150  (30 copies, pas = 5)
```

Chaque lot contient des copies de toutes les salles mélangées — un correcteur ne corrige pas toute une classe.

**Propriété de réassemblage :** en intercalant les lots (1er de lot 1, 1er de lot 2, …, 2ème de lot 1, …), on obtient la séquence complète 1 → N sans trou. Cette propriété est préservée même quand N n'est pas multiple de bon.

**Gestion du reste (N non multiple de bon) :**
```
N=32, bon=5  →  formule uniforme pour toutes les positions
  Position 31 → lot ((31-1)%5)+1 = 1
  Position 32 → lot ((32-1)%5)+1 = 2
  → Lots 1 et 2 : 7 copies  /  Lots 3, 4, 5 : 6 copies
  → Écart max : 1 copie entre les lots
```

**Sélection automatique du bon — contrainte taille_salle_ref :**

La taille d'un lot est `ceil(N / bon)`. Elle doit être ≤ `taille_salle_ref` pour que le correcteur reçoive un paquet de taille standard.

```
Règle de sélection (par ordre de préférence) :
  Pour bon ∈ [5, 3] :
    si ceil(N / bon) ≤ taille_salle_ref → bon retenu, arrêter
  Si aucun retenu → bon = 1 (séquentiel, un seul lot) + alerte ADMIN
```

Exemples avec `taille_salle_ref = 30` :

| N copies | bon=5 (taille lot) | bon=3 (taille lot) | Bon retenu |
|---|---|---|---|
| 90  | 18 ≤ 30 ✓ | — | 5 |
| 150 | 30 ≤ 30 ✓ | — | 5 |
| 155 | 31 > 30 ✗ | 52 > 30 ✗ | 1 (alerte) |
| 857 | 172 > 30 ✗ | 286 > 30 ✗ | 1 (alerte) |

**La contrainte taille_salle_ref est indicative, pas bloquante.** L'Admin peut forcer un bon même si la taille est dépassée :

```
⚠ 155 copies : bon=5 produirait des lots de 31 (taille salle : 30).
  bon=3 produirait des lots de 52 (trop grand).
  Traitement séquentiel (bon=1) appliqué par défaut.

  [ Continuer avec bon=1 ]  [ Forcer bon=5 — lots de 31 ]  [ Modifier taille de référence ]
```

---

#### 4.9.4 Fiches d'Orientation pour l'Équipe d'Anonymat

Pour chaque centre × matière, l'application génère deux documents imprimables.

**Processus physique de référence :**
```
1. Les copies arrivent triées par salle, puis par numéro de table au sein de chaque salle
2. L'équipe d'anonymat écrit le numéro anonyme à la main sur l'entête et sur la copie
3. Elle détache l'entête (conservée scellée) — la copie ne contient plus que le numéro anonyme
4. Elle trie les copies par numéro anonyme et les regroupe par lot
5. Chaque lot est transmis séparément à la commission de correction
```

---

**Document 1 — Fiche d'Attribution** *(une par salle, triée salle → table)*

Permet à l'équipe d'écrire le bon numéro sur chaque copie et de constituer les paquets de lots simultanément.

```
EXAMEN : [nom]            CENTRE : [nom + code]
MATIÈRE : [discipline]    SALLE : A
Plage (salle A) : 1001 → 1030    Copies attendues : 30

┌───────┬────────┬─────────────┬──────┬──────┐
│ Salle │ Table  │ N° à écrire │ Lot  │ Fait │
├───────┼────────┼─────────────┼──────┼──────┤
│ A     │ 01     │ 1001        │  1   │  ☐   │
│ A     │ 02     │ 1002        │  2   │  ☐   │
│ A     │ 03     │ 1003        │  3   │  ☐   │
│ A     │ 04     │ 1004        │  4   │  ☐   │
│ A     │ 05     │ 1005        │  5   │  ☐   │
│ A     │ 06     │ 1006        │  1   │  ☐   │
│ A     │ 07     │ 1008  (ABSENT) │ —  │  —   │
│  …    │  …     │   …         │  …   │  ☐   │
└───────┴────────┴─────────────┴──────┴──────┘

Chef d'anonymat : ___________   Signature : ___________   Date : ___________
```

La colonne **Lot** permet à l'agent d'empiler directement la copie dans le bon paquet en un geste simultané à l'écriture du numéro. Les absents sont marqués `(ABSENT)` — pas de copie à traiter.

---

**Document 2 — Grille de Rangement** *(une par lot, triée par N° anonyme)*

Permet de vérifier l'exhaustivité du lot avant transmission à la commission.

```
EXAMEN : [nom]            CENTRE : [nom + code]
MATIÈRE : [discipline]    LOT : 1 sur 5   (pas = 5)
Copies attendues : 28  (30 inscrits − 2 absents)

┌────────────────┬───────┬────────┬──────┐
│ N° Anonyme     │ Salle │ Table  │  ✓   │
├────────────────┼───────┼────────┼──────┤
│ 1001           │ A     │ 01     │  ☐   │
│ 1006           │ A     │ 06     │  ☐   │
│ 1011           │ B     │ 01     │  ☐   │
│  …             │  …    │  …     │  ☐   │
└────────────────┴───────┴────────┴──────┘

[Bon actif — pas=5] Tout numéro ne finissant pas par 1 ou 6 dans ce lot est une anomalie.
  Exemple : 1003 dans ce lot → copie étrangère → isoler et signaler.

Total compté : ___ / 28    Chef d'anonymat : ___________
```

**Absents :** déduits automatiquement du décompte si marqués absents dans le système. Les trous dans la séquence (numéros absents) sont normaux et attendus.

---

#### 4.9.5 Distribution des Codes d'Accès

Les codes d'accès (8 caractères alphanumériques, stockés hashés bcrypt) sont générés à la délibération, après levée automatique de l'anonymat par le système. Deux modèles disponibles.

**Modèle B — Distribution nominative par établissement (défaut) :**

```
Après délibération :
  1. Levée d'anonymat automatique (accès interne à correspondances_anonymat)
  2. Export par établissement : [Nom | Prénom | Matricule | Classe | Code_Accès]
  3. CHEF_ETABLISSEMENT distribue individuellement chaque code (comme un bulletin)
  4. L'élève consulte avec : numéro de composition (sur sa souche) + code_accès reçu
```

Avantages : distribution ciblée, élève ne peut pas perdre son code (demande à son établissement), workflow familier au contexte béninois.
Inconvénient : établissement voit les résultats pendant la distribution.

**Modèle A — Distribution anonyme via liste publique (option) :**

```
Après délibération :
  1. Export par centre : [N°_Anonyme | Code_Accès]
  2. Liste affichée au panneau du centre ou publiée en ligne
  3. L'élève retrouve son numéro anonyme sur sa souche → note son code
```

Avantages : anonymat préservé jusqu'au bout, établissement ne voit pas les résultats.
Inconvénient : élève doit avoir conservé sa souche.

**Pour la remise physique des copies :** toujours Modèle B — export nominatif par établissement pour retrouver physiquement chaque copie.

**Les deux modèles peuvent être activés simultanément** — l'ADMIN choisit ce qu'il publie selon les instructions de la DDEST-FP.

---

#### 4.9.6 Paramètres DB liés à l'Anonymat Numérique

```sql
-- Sur la table examens (paramétrage)
anonymat_actif       BOOLEAN  DEFAULT false
prefixe_type         TEXT     DEFAULT 'numerique_centre'  -- 'aucun' | 'numerique_centre' | 'alpha_centre'
debut_type           TEXT     DEFAULT 'un'                -- 'un' | 'specifie' | 'aleatoire'
debut_valeur         INTEGER  NULL                        -- utilisé si debut_type = 'specifie'
bon                  INTEGER  DEFAULT 1                   -- 1 | 3 | 5 uniquement
taille_salle_ref     INTEGER  DEFAULT 30                  -- référence pour validation du bon

-- Contrainte applicative : bon ∈ {1, 3, 5} (vérifiée côté application, pas en base)
-- Contrainte taille : indicative — admin peut forcer en acceptant l'avertissement
```

---

## 5. Scope de Production — Approche par Incréments

> L'objectif est une application de production complète. Les fonctionnalités sont organisées en deux incréments de livraison pour gérer la complexité du développement — pas pour en exclure définitivement. Toutes les fonctionnalités listées ici font partie du périmètre de production.

### 5.1 Incrément 1 — Opérationnel (priorité haute)

Ces fonctionnalités constituent le cœur opérationnel sans lequel l'application ne peut pas être utilisée en production.

| Module | Description |
|---|---|
| Auth & RBAC | Rôles : ADMIN, CHEF_CENTRE, CHEF_ETAB, TUTELLE — avec RLS sur toutes les tables |
| Paramétrage examen | Anonymat, séries, EPS (2 modes), seuil, mentions, rattrapage, héritage élèves, template import |
| Import élèves | Fichier Excel + validation + rapport d'erreurs + template configurable 3 niveaux |
| Anonymat physique | Génération des souches détachables, instructions de tri |
| Centres de composition | Regroupement établissements, répartition élèves, affectation salle/table |
| Génération listes hors-ligne | Export Excel lots par centre (nominatif ou anonyme + souches) |
| Génération fichiers de saisie | Excel par centre avec colonnes disciplines/coefficients par série, lots configurables, ZIP |
| Import des notes | Parseur sécurisé + rapport d'erreurs + règles de validation + UPSERT avec avertissement |
| Édition notes in-app | Corrections ciblées post-import pour Chef Centre (statut CORRECTION uniquement) |
| Moteur de délibération | Calcul moyennes pondérées (arithmétique entière) + EPS 2 phases + décisions + mentions |
| Verrouillage & garde-fous | Matrice de statuts, alertes pré-délibération, re-délibération obligatoire |
| Affectation enseignant | Association discipline/classe/enseignant pour enrichissement analytique |
| Tableau de bord analytique | Taux de réussite par discipline, liste élèves sous seuil, comparaison inter-établissements |
| Page publique résultats | Accès numéro + code d'accès — mobile-first, < 100KB, rate limiting, lockout progressif |
| Export résultats | Excel résultats bruts par établissement et global |
| Audit log | Traçabilité des actions sensibles via triggers PostgreSQL |
| Lien inter-examens | Héritage élèves (tous / admissibles / non-admissibles) depuis un examen précédent |

### 5.2 Incrément 2 — Durci et complet (priorité normale)

Ces fonctionnalités enrichissent l'application et durcissent son utilisation en production étendue.

| Module | Description |
|---|---|
| Tableau de bord Tutelle avec 9 filtres combinables | Filtres par examen, centre, établissement, classe, série, discipline, sexe, commune, type de milieu |
| Filtres Tutelle par enseignant | Comparaison inter-enseignants sur une même discipline |
| Génération bulletins PDF individuels | Job queue asynchrone (ex: Supabase pg_cron ou Edge Function avec queue) — 8 000 PDFs en arrière-plan |
| Rôle SUPER_ADMIN distinct | Gestion des comptes utilisateurs, audit log global, multi-examens |
| Rôle GESTIONNAIRE_EXAMEN distinct | Périmètre limité à un examen — évite le point de défaillance unique ADMIN |
| Interface dédiée ENSEIGNANT | Tableau de bord filtré par classes, sans accès aux autres données |
| Suivi longitudinal inter-examens | Graphiques d'évolution par élève et par discipline entre examens liés |
| Remédiation dans l'interface | Interface dédiée avec liste des élèves en difficulté par discipline et par classe |
| Envoi SMS résultats | Notification optionnelle — coût à valider avec DDEST-FP |
| Module IA remédiation | Recommandations ciblées nécessitant un référentiel curriculaire ou LLM |

### 5.3 Critères de validation par incrément

#### Prérequis bloquant avant tout développement UI (les deux incréments)

> Un PoC du parseur Excel doit être validé avant de démarrer le développement de l'interface utilisateur.
> Ce PoC consiste à parser un fichier Excel réel corrompu (colonnes manquantes, notes invalides, mauvais centre_id)
> et à produire un rapport d'erreurs conforme à la section 4.2.3. Sans ce PoC validé, le risque R2 est non maîtrisé.

#### Critères de validation Incrément 1

Le système est prêt pour un déploiement en production pilote (1-2 centres) quand :

1. Un cycle fictif complet (paramétrage → import 2 centres → délibération → publication) se déroule sans bug
2. Le parseur Excel est robuste aux erreurs usuelles de saisie : colonnes protégées, virgules normalisées, notes invalides signalées sans bloquer les autres lignes
3. Le moteur de délibération produit des résultats identiques au calcul manuel de référence fourni par la DDEST-FP (test sur un jeu de données réel)
4. Les règles RLS interdisent à un CHEF_ETAB de lire les données d'un autre établissement (testé avec comptes distincts)
5. La page de consultation des résultats charge en < 3 secondes sur une connexion 3G simulée
6. Le rate limiting et le lockout progressif sont opérationnels (tests automatisés)
7. Le chiffrement des données d'identité transite exclusivement par l'Edge Function (audit du bundle client pour confirmer l'absence de la clé)

#### Critères de validation Incrément 2

1. Les exports PDF de 8 000 bulletins se terminent sans timeout (job queue fonctionnel)
2. Les filtres Tutelle combinés (9 dimensions) répondent en < 2 secondes sur le jeu de données de référence (8 000 élèves)
3. Le rôle SUPER_ADMIN peut créer/désactiver des comptes sans intervention base de données

---

## 6. Registre des Risques

| ID | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Bug de calcul dans le moteur de délibération → erreur rendue publique | Faible si spéc respectée | Critique | Tests unitaires exhaustifs + validation sur données DDEST-FP réelles + règle arrondi normative |
| R2 | Parseur Excel fragile → perte de données de notes | Moyenne | Critique | PoC parseur obligatoire avant UI + colonnes protégées + validation stricte |
| R3 | Non-adoption par les chefs de centre (habitudes Excel) | Moyenne | Elevé | Former 2-3 chefs de centre pilotes avant déploiement général |
| R4 | Connectivité insuffisante même pour le téléchargement des fichiers | Possible | Elevé | Prévoir clé USB comme canal de distribution des fichiers Excel en fallback |
| R5 | Faille RLS — accès inter-établissements | Faible si testé | Critique | Tests RLS systématiques avec comptes de rôles distincts avant chaque déploiement |
| R6 | Perte de la clé de chiffrement → données d'identité irrécupérables | Très faible | Critique | Procédure de sauvegarde des clés documentée, accessible à 2 personnes minimum |
| R7 | Délibération lancée avec notes manquantes | Moyenne | Elevé | Alerte pré-délibération listant les élèves et centres concernés |
| R8 | Génération de 8 000 PDFs en timeout | Haute si synchrone | Modéré | Job queue asynchrone en Incrément 2 |
| R9 | Brute-force sur la page de consultation publique | Possible | Modéré | Rate limiting + lockout progressif (section 4.8.4) |
| R10 | Clé de chiffrement exposée dans le bundle React | Possible si non audité | Critique | Edge Function obligatoire pour toute opération de chiffrement + audit bundle avant prod |
| R11 | Écrasement silencieux de corrections manuelles par réimport | Possible | Elevé | Avertissement explicite + confirmation obligatoire + audit log (section 4.2.2) |

---

## 7. Success Metrics

### 7.1 Métriques avec baselines et cibles

| KPI | Baseline actuelle | Cible I1 | Méthode de mesure |
|---|---|---|---|
| Temps de paramétrage d'un examen | Plusieurs jours (Excel manuel) | < 2 heures | Mesure chronométrée sur session réelle |
| Taux d'import de notes sans erreur bloquante | Non mesurable | >= 90% au premier essai | % imports sans erreur / total imports |
| Délai publication après dernier import | Plusieurs jours (traitement manuel) | < 4 heures | Timestamp dernier import → timestamp publication |
| Taux de consultation en ligne | 0% (papier uniquement) | >= 50% des élèves inscrits | Requêtes uniques page résultats / nb élèves |
| Erreurs de délibération dues au calcul | Non traçable | 0 | Réclamations post-publication liées au calcul |
| Temps de réponse page consultation (3G) | N/A | < 3 secondes | Test Lighthouse + simulation réseau |

### 7.2 Indicateurs de succès institutionnel (long terme)

- Évolution du taux de réussite par discipline sur les classes ayant bénéficié du tableau de bord de remédiation
- Réduction mesurable du temps administratif DDEST-FP par session d'examen
- Taux d'adoption : % de centres utilisant l'import de notes vs saisie papier alternative

---

## 8. Stack Technique Confirmée

| Couche | Technologie | Note |
|---|---|---|
| Frontend | React 18 + TypeScript (strict) + Vite | |
| UI | Tailwind CSS + Shadcn/ui | CVA pour composants multi-variantes |
| État serveur | TanStack Query | CACHE_STRATEGY centralisée |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) | RLS sur toutes les tables |
| Excel | SheetJS (xlsx) | Génération + parsing côté client |
| Chiffrement | AES-256 via Edge Function Supabase **uniquement** | La clé n'est JAMAIS dans le bundle React client. Toute opération de chiffrement/déchiffrement passe par une Edge Function dédiée. |
| Hachage codes d'accès | bcrypt côté serveur (Edge Function) | |
| Déploiement | Vercel (CD depuis GitHub) | |
| Monitoring | Sentry (wrapper monitoring.ts) | En production uniquement |
| Jobs asynchrones | Supabase pg_cron ou Edge Function avec queue | Incrément 2 — bulletins PDF |

**Décision architecture page résultats :** La page de consultation publique (`/resultats`) est une route **distincte du SPA principal**, servie comme page ultra-légère, sans dépendance au bundle React principal. Cela garantit un chargement < 100 KB sur 2G/3G.

---

## 9. Prochaines Étapes (pour le PM / Architecte)

### Prérequis bloquants (avant tout développement)

1. **PoC Parseur Excel** — Valider que SheetJS + les règles de la section 4.2.2 permettent de traiter correctement un fichier réel corrompu. Ce PoC doit produire un rapport d'erreurs conforme à la section 4.2.3. Sans PoC validé, ne pas commencer le développement UI.

2. **Valider les hypothèses H1-H5** avec l'équipe DDEST-FP avant tout développement. En particulier H1 (maîtrise Excel des chefs de centre) et H2 (connectivité ADMIN).

3. **Obtenir un jeu de données réel** (même fictif) représentatif d'un examen passé pour :
   - Valider le moteur de délibération sur données réelles
   - Valider le template d'import élèves sur le format réel utilisé

4. **Obtenir les grilles officielles** disciplines/coefficients par série pour les intégrer comme données de référence dans les tests.

5. **Valider l'architecture Edge Function** avec l'équipe technique : confirmer que les opérations de chiffrement/déchiffrement peuvent être entièrement déléguées à des Edge Functions Supabase sans latence inacceptable.

### Étapes suivantes après validation

6. Passer au **PRD (Product Requirements Document)** avec le PM — en s'appuyant sur les spécifications de ce brief v2.6
7. Passer à la **phase Architecte** (BMAD) — schéma de base de données, RLS détaillé, API surface, structure du projet
8. Définir le **plan de tests** : tests unitaires moteur délibération, tests RLS, tests parseur avec fuzzing
