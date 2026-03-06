---
version: "1.3"
type: "Product Requirements Document"
basedOn: "product-brief-MockExams-v2-super-analyst.md (v2.6)"
date: "2026-03-05"
scope: "Incrément 1 — Opérationnel"
status: "FINAL"
---

# PRD v1 — MockExams
## Plateforme de Gestion des Examens Blancs — DDEST-FP Alibori

> Ce PRD couvre l'Incrément 1 uniquement (fonctionnalités opérationnelles).
> Les spécifications mathématiques et techniques détaillées sont dans le brief v2.6, sections 4.x.
> Ce document formalise les critères d'acceptation par module — il est le contrat entre le PM et le Dev.

---

## Changelog

### v1.2 → v1.3

| # | Correction | Section |
|---|---|---|
| 1 | §3.7 ajouté — codes ABS/ABD/0, règle NON ADMIS automatique, cellule vide = erreur | §3 |
| 2 | §3.8 ajouté — algorithme lot unifié (bon=1 séquentiel, clé lot complète) | §3 |
| 3 | US-04 mis à jour — mode_deliberation, seuil_phase1/2, oral, EPS, facultatif | US-04 |
| 4 | US-12/13 mis à jour — HMAC étendu (matiere_id, serie_id, option_id) | US-12, US-13 |
| 5 | US-15 réécrit — Phase 1/2, ABS/ABD, oral Modèle A/B, facultatif Option 1/2 | US-15 |
| 6 | US-07 mis à jour — choix matière bloquant à l'import, ABS/ABD acceptés | US-07 |
| 7 | Glossaire enrichi — ABS, ABD, lot unifié, oral, facultatif, Phase 1/2 | §6 |
| 8 | Critère 12 ajouté — test ABS/ABD dans le cycle de délibération | §8 |

---

### v1.1 → v1.2

| # | Correction | Section |
|---|---|---|
| 1 | §3.6 ajouté — algorithme bons (numérotation anonyme, sélection automatique, propriété réassemblage) | §3 |
| 2 | US-04 mis à jour — paramètres bon, prefixe_type, debut_type, taille_salle_ref ajoutés | US-04 |
| 3 | US-10 mis à jour — génération numéros anonymes après affectation salle/table | US-10 |
| 4 | US-11 mis à jour — fiches d'orientation anonymat (Attribution + Rangement) | US-11 |
| 5 | US-26 ajouté — numérotation anonyme + fiches d'orientation | M05 |
| 6 | US-23a mis à jour — export Modèle B (nominatif par établissement) et Modèle A (liste anonyme) | US-23a |
| 7 | Glossaire mis à jour — Bon, Fiche d'orientation, Modèle A/B distribution | §6 |
| 8 | Critère de validation 11 ajouté — algorithme bons vérifié | §8 |

---

### v1.0 → v1.1

| # | Correction | Section |
|---|---|---|
| 1 | M16 scope splitté : lien/héritage en I1, analyse comparative (affichage évolution) en I2 | §1, US-25 |
| 2 | Machine d'états formelle ajoutée — CONFIG, INSCRIPTIONS et toutes transitions explicites | §3 |
| 3 | Clé UPSERT canonique clarifiée — deux niveaux distincts (lot vs ligne) | §3, US-13 |
| 4 | US-08 reformulé — opération de chiffrement héritage clairement atomique (Edge Function) | US-08 |
| 5 | US-23 splitté en US-23a (ADMIN + TUTELLE, global) et US-23b (CHEF_ETAB, son établissement) | US-23a/b |
| 6 | Lockout scope corrigé — par (numero_composition + IP), pas IP seule. Procédure déblocage ADMIN ajoutée | §3, US-20 |
| 7 | Stockage moyennes en centièmes entiers ajouté aux règles normatives | §3 |
| 8 | Anti-replay HMAC ajouté — generation_timestamp dans la signature + fenêtre d'acceptation | §3, US-12, US-13 |
| 9 | Captcha retiré de I1 — rate limiting + lockout suffisants (captcha reporté en I2) | US-20, §6 |
| 10 | Champs libres Niveau 3 : flag dans_analyse interdit en I1 | US-06 |
| 11 | HMAC scope précisé — signe uniquement les métadonnées _meta, PAS le contenu Excel | US-12, US-13 |
| 12 | P2 formulation renforcée — données de référence structurées avec cas limites | §2 |

---

## 1. Périmètre de l'Incrément 1

### Inclus

| # | Module |
|---|---|
| M01 | Auth & RBAC — 4 rôles I1 : ADMIN, CHEF_CENTRE, CHEF_ETABLISSEMENT, TUTELLE |
| M02 | Paramétrage d'un examen |
| M03 | Import élèves — template configurable 3 niveaux |
| M04 | Centres de composition + affectation salle/table |
| M05 | Génération listes d'émargement (avec souches détachables si anonymat) |
| M06 | Génération fichiers de saisie Excel (lots + ZIP + HMAC métadonnées) |
| M07 | Import des notes (parseur + rapport d'erreurs + UPSERT) |
| M08 | Édition notes in-app (Chef Centre, statut CORRECTION uniquement) |
| M09 | Moteur de délibération (arrondi entier, EPS 2 modes) |
| M10 | Verrouillage par statut + machine d'états formelle |
| M11 | Affectation enseignant par discipline/classe |
| M12 | Page publique consultation résultats (rate limiting + lockout) |
| M13 | Tableau de bord analytique simple |
| M14 | Exports Excel (résultats par établissement + global) |
| M15 | Audit log (triggers PostgreSQL) |
| M16 | Lien inter-examens — mécanique uniquement (config + héritage élèves) |

### Explicitement hors Incrément 1

- Génération bulletins PDF individuels (job queue asynchrone — I2)
- Tableau de bord Tutelle avec 9 filtres combinables (I2)
- Rôles SUPER_ADMIN et GESTIONNAIRE_EXAMEN distincts (I2)
- Interface dédiée ENSEIGNANT (I2)
- Analyse comparative inter-examens avec affichage d'évolution (I2) — la mécanique de lien est en I1, l'affichage est en I2
- Module SMS (I2)
- Module IA remédiation (hors scope)
- Captcha adaptatif page publique (I2 — rate limiting + lockout suffisants en I1)
- Champs libres Niveau 3 disponibles en analytics (I2 — nécessite normalisation des valeurs)

---

## 2. Prérequis bloquants avant développement UI

> Ces deux validations doivent être complètes avant de démarrer l'interface utilisateur.

**P1 — PoC Parseur Excel**
Valider que SheetJS + les règles de validation (brief §4.2.2) traitent correctement un fichier corrompu.
Livrable : script Node.js standalone qui parse un fichier test et produit un rapport d'erreurs conforme à brief §4.2.3.
Cas de test obligatoires : colonne manquante, note invalide ("dix"), HMAC invalide, centre_id incorrect.

**P2 — Validation données DDEST-FP**
Obtenir un jeu de données structuré identique à un vrai examen comprenant obligatoirement :
- Les grilles disciplines/coefficients officielles par série
- Une distribution de notes réaliste (pas toutes identiques)
- Des cas limites : élèves à exactement 10.00 de moyenne, élèves inaptes EPS, admissibles provisoires non admis en Phase 2, élèves dispensés d'une discipline

Sans ces données, le moteur de délibération ne peut pas être validé.

---

## 3. Règles Normatives

> Cette section définit les comportements non ambigus que toutes les implémentations (front, back, Edge Functions) doivent respecter. En cas de conflit entre une US et cette section, la présente section prévaut.

---

### 3.1 Machine d'États Formelle

L'examen passe par 9 états. Toute transition non listée ici est interdite.

```
┌─────────────────────────────────────────────────────────────────┐
│  CONFIG                                                          │
│  Entrée : création de l'examen                                  │
│  Qui agit : ADMIN (paramétrage complet)                         │
│  Sortie → INSCRIPTIONS : paramétrage validé par ADMIN           │
└─────────────────────────────────────────────────────────────────┘
         ↓ (ADMIN valide le paramétrage)
┌─────────────────────────────────────────────────────────────────┐
│  INSCRIPTIONS                                                    │
│  Entrée : paramétrage validé                                    │
│  Qui agit : ADMIN (import élèves, configuration centres)        │
│  Retour → CONFIG impossible dès le premier import élèves        │
│  Sortie → COMPOSITION : tous les centres configurés             │
│                          + au moins un élève importé            │
└─────────────────────────────────────────────────────────────────┘
         ↓ (ADMIN finalise les centres)
┌─────────────────────────────────────────────────────────────────┐
│  COMPOSITION                                                     │
│  Entrée : centres configurés, élèves importés, listes générées  │
│  Qui agit : ADMIN (génération listes, fichiers de saisie)       │
│             CHEF_CENTRE (téléchargement fichiers)               │
│  Sortie → CORRECTION : premier fichier de notes importé         │
└─────────────────────────────────────────────────────────────────┘
         ↓ (premier import de notes par un Chef de Centre)
┌─────────────────────────────────────────────────────────────────┐
│  CORRECTION                                                      │
│  Entrée : premier fichier de notes importé                      │
│  Qui agit : CHEF_CENTRE (import lots + édition notes de son     │
│             centre), ADMIN (import + édition toutes les notes)  │
│  Sortie → DELIBERATION : ADMIN clique "Lancer la délibération"  │
│           [Alerte : lots non importés + élèves notes manquantes]│
└─────────────────────────────────────────────────────────────────┘
         ↓ (ADMIN lance la délibération)
┌─────────────────────────────────────────────────────────────────┐
│  DELIBERATION                                                    │
│  Entrée : délibération lancée                                   │
│  Qui agit : ADMIN (édition note individuelle + recalcul)        │
│             CHEF_CENTRE (LECTURE SEULE)                         │
│  Sortie → DELIBERE : ADMIN valide les résultats                 │
└─────────────────────────────────────────────────────────────────┘
         ↓ (ADMIN valide la délibération)
┌─────────────────────────────────────────────────────────────────┐
│  DELIBERE                                                        │
│  Entrée : délibération validée                                  │
│  Qui agit : ADMIN (édition note + recalcul)                     │
│             CHEF_CENTRE (LECTURE SEULE)                         │
│  Sorties → CORRECTION_POST_DELIBERATION : ADMIN modifie une note│
│          → PUBLIE : ADMIN publie les résultats                  │
└─────────────────────────────────────────────────────────────────┘
         ↓ (ADMIN modifie une note)           ↓ (ADMIN publie)
┌───────────────────────────────┐   ┌─────────────────────────────┐
│  CORRECTION_POST_DELIBERATION │   │  PUBLIE                     │
│  Entrée : modification note   │   │  Entrée : publication       │
│           en statut DELIBERE  │   │  Qui agit : TOUS en lecture │
│  Qui agit : ADMIN uniquement  │   │  seule — aucune modification│
│  Sortie → DELIBERE : ADMIN    │   │  en base                    │
│           re-valide après     │   │  Page publique : accessible │
│           correction          │   │  Sortie → CLOS (archivage)  │
└───────────────────────────────┘   └──────────────┬──────────────┘
                                                   ↓ (ADMIN archive)
                                    ┌─────────────────────────────┐
                                    │  CLOS                       │
                                    │  Entrée : archivage manuel  │
                                    │  État terminal — lecture    │
                                    │  seule uniquement           │
                                    │  Examen sélectionnable comme│
                                    │  source pour US-08 (héritage│
                                    │  élèves)                    │
                                    └─────────────────────────────┘
```

**Règles de transition supplémentaires :**
- Toutes les transitions sont irréversibles, sauf : DELIBERE → CORRECTION_POST_DELIBERATION → DELIBERE
- L'état CONFIG ne peut pas être réatteint une fois le premier import effectué
- La transition DELIBERATION → DELIBERE nécessite que le calcul soit terminé sans erreur fatale

---

### 3.2 Clé UPSERT Canonique — Deux Niveaux

L'opération de réimport opère sur deux niveaux distincts qui ne doivent pas être confondus :

```
Niveau 1 — Détection de lot (déclenche l'avertissement)
  Clé : (centre_id, examen_id, lot_numero)
  → Si ce triplet existe déjà en base, l'interface demande une confirmation avant d'écraser

Niveau 2 — Mise à jour de ligne (l'UPSERT lui-même)
  Clé : (numero_anonyme, lot_numero) au sein d'un (centre_id, examen_id)
  → Chaque ligne est écrasée individuellement par cette clé
  → Une ligne avec un numero_anonyme absent du fichier original reste intacte
```

**Conséquence :** un réimport partiel (fichier avec seulement 10 lignes sur 50) écrase uniquement les 10 lignes présentes — les 40 autres ne sont pas touchées.

---

### 3.3 Stockage des Moyennes — Entiers en Centièmes

Les moyennes sont stockées et comparées en **centièmes entiers** dans la base de données.

```
Stockage : moyenne_centièmes INTEGER  (ex: 11.77 → stocké 1177)
Affichage : moyenne_centièmes / 100   (1177 → affiché "11.77")
Comparaison aux seuils : en centièmes (seuil 10.00 → 1000, comparaison : moyenne_centièmes >= 1000)
Calcul : Math.round(SUM(note_i * coeff_i * 100) / SUM(coeff_i))  → résultat INTEGER direct
```

Cette règle élimine toute erreur d'accumulation en virgule flottante aux valeurs de seuil.

---

### 3.4 HMAC — Périmètre et Anti-Replay

**Ce que le HMAC signe (et uniquement cela) :**

```
hmac_input = centre_id + "|" + examen_id + "|" + lot_numero + "|"
           + nb_eleves_attendus + "|" + generation_timestamp
hmac_signature = HMAC-SHA256(hmac_input, SECRET_KEY)
```

**Ce que le HMAC NE signe PAS :** le contenu Excel (colonnes, lignes de notes). Un utilisateur qui remplit les cellules de notes ne modifie pas la signature. C'est le comportement attendu.

**Anti-replay :**
- `generation_timestamp` est inclus dans l'input HMAC et stocké dans `_meta`
- À l'import, l'Edge Function vérifie que `generation_timestamp` est dans la fenêtre d'acceptation configurée (défaut : 90 jours)
- Un fichier généré hors de cette fenêtre est refusé : "Ce fichier a expiré. Régénérez les fichiers de saisie."
- La fenêtre est configurable par examen par l'ADMIN

---

### 3.5 Politique Lockout — Scope et Déblocage

**Scope du lockout : par `(numero_composition_tente, ip_hash)` — PAS par IP seule.**

Raisonnement : une IP partagée (réseau école, 4G NAT) ne doit pas bloquer tous les élèves légitimes. Le lockout cible la combinaison numero + IP, pas l'IP seule.

```
Détection de lot (rate limiting global par IP — protection réseau) :
  Max 20 requêtes / IP / minute → ralentissement (pas blocage)

Lockout par (numero_composition_tente + ip_hash) :
  Tentatives 1-5   : réponse normale
  Tentative 6      : blocage 1 heure
  Tentative 7-9    : blocage 24 heures
  Tentative 10+    : blocage 72 heures + signalement dans l'audit log

Pas de blocage permanent automatique — risque trop élevé de DoS involontaire.
```

**Procédure de déblocage ADMIN :**
- Interface "Audit log → Consultations bloquées" : liste des (numero, IP, nb tentatives, statut blocage)
- Bouton "Débloquer" disponible par entrée → supprime l'état de blocage pour ce (numero + IP)
- Action de déblocage tracée en audit log

### 3.6 Algorithme de Numérotation Anonyme — Bons

**Paramètres :**
```
bon              ∈ {1, 3, 5}    -- nombre de lots ET pas entre numéros d'un même lot
taille_salle_ref INTEGER        -- contrainte de taille de lot (indicative, non bloquante)
```

**Valeurs autorisées pour `bon` : {1, 3, 5}. Le bon=4 est exclu par convention métier.**

**Sélection automatique du bon (N = nombre total de copies) :**
```
Pour bon ∈ [5, 3] :
  si ceil(N / bon) ≤ taille_salle_ref → bon retenu, arrêter
Si aucun retenu → bon = 1 + alerte ADMIN avec options :
  [ Continuer bon=1 ]  [ Forcer bon=5 ]  [ Modifier taille de référence ]
```

**Formule d'attribution (copie en position p dans l'ordre salle → table) :**
```
numero_anonyme = p  (+ préfixe/décalage selon format configuré)
lot            = ((p - 1) % bon) + 1
```

**Gestion du reste :** la formule s'applique uniformément pour tout p de 1 à N. Si N % bon ≠ 0, les premiers lots ont ⌈N/bon⌉ copies, les suivants ⌊N/bon⌋. Écart maximum : 1 copie.

**Propriété de réassemblage :** en intercalant les lots (1er de lot 1, 1er de lot 2, …, 2ème de lot 1, …), on obtient la séquence complète 1 → N sans trou. Propriété préservée même si N non multiple de bon.

**Absents :** les numéros pré-attribués aux absents créent des trous dans les lots — comportement normal. Les fiches d'orientation signalent les absents explicitement.

### 3.7 Codes de Statut par Discipline — ABS / ABD / 0

**Trois valeurs acceptées dans les cellules de notes du fichier Excel de saisie :**

| Valeur | Signification | Traitement délibération |
|---|---|---|
| `[0..20]` | Note numérique | Incluse dans le calcul |
| `ABS` | Absent à cette épreuve | NON ADMIS automatique, aucun calcul |
| `ABD` | Abandon de cette épreuve | NON ADMIS automatique, aucun calcul |
| Vide | — | **Erreur à l'import** — jamais équivalent à ABS |

**Règle absolue : 1 discipline ABS ou ABD → NON ADMIS pour ce candidat, sans exception.**

Statuts globaux dérivés (affichage bulletin) :
- Absent global (tout ABS) → "Absent — Non délibéré"
- Abandon global (≥1 ABD) → "Abandon — Non délibéré"
- Partiel → "Non délibéré — discipline(s) manquante(s) : [liste]"

---

### 3.8 Lot Unifié — Clé Canonique et Algorithme

**Un lot = un fichier Excel de saisie = un paquet de copies pour un correcteur.**

**Clé complète d'un lot :**
```
(centre_id, examen_id, matiere_id, serie_id, option_id, lot_numero)
```
`serie_id = "ALL"` si discipline applicable à toutes les séries.
`option_id = NULL` si discipline obligatoire (pas de choix).

**Algorithme bon=1 (lots séquentiels) :**
```
Lot k = copies [(k-1) × taille_salle_ref + 1  ..  k × taille_salle_ref]
Nombre de lots = ceil(N / taille_salle_ref)
```

**Algorithme bon ∈ {3,5} (lots interleaved) :** cf. §3.6.

**Matières au choix :** un candidat sans choix renseigné sur une discipline `au_choix` → **import bloqué**, message explicite obligatoire.

---

## 4. User Stories et Critères d'Acceptation

---

### M01 — Auth & RBAC

**US-01 : Connexion sécurisée**
En tant qu'utilisateur, je peux me connecter avec email + mot de passe afin d'accéder aux fonctionnalités de mon rôle.

Critères d'acceptation :
- [ ] Authentification via Supabase Auth (email/password)
- [ ] Redirection post-login vers le tableau de bord adapté au rôle
- [ ] Session persistante (token rafraîchi automatiquement)
- [ ] Déconnexion explicite disponible

**US-02 : Isolation des données par rôle (RLS)**
En tant que système, je dois garantir qu'aucun rôle ne peut lire ni écrire les données d'un périmètre qui ne lui appartient pas.

Critères d'acceptation :
- [ ] CHEF_ETABLISSEMENT : lecture uniquement des élèves de son établissement (testé avec 2 comptes distincts)
- [ ] CHEF_CENTRE : lecture/écriture uniquement des notes de son centre
- [ ] TUTELLE : lecture de tous les examens, aucune écriture possible
- [ ] ADMIN : accès complet
- [ ] Test RLS automatisé avec comptes de rôles distincts — 0 fuite inter-établissements

**US-03 : Gestion des comptes (ADMIN)**
En tant qu'ADMIN, je peux créer, activer et désactiver des comptes utilisateurs afin de contrôler qui accède à la plateforme.

Critères d'acceptation :
- [ ] Création de compte avec : email, rôle, établissement/centre associé
- [ ] Désactivation d'un compte sans suppression (préservation de l'audit log)
- [ ] Un compte désactivé ne peut plus se connecter

---

### M02 — Paramétrage d'un Examen

**US-04 : Création d'un examen**
En tant qu'ADMIN, je peux créer un examen en définissant tous ses paramètres afin de préparer la session.

Critères d'acceptation :
- [ ] Champs obligatoires : nom, année scolaire, type (Blanc 1, BEPC Blanc…)
- [ ] Paramètres configurables : anonymat (oui/non), catégorisation par série (oui/non), mode EPS (normal/post-admissibilité), seuil admissibilité, seuil rattrapage (optionnel), mentions avec seuils configurables
- [ ] Si anonymat activé — paramètres de numérotation : prefixe_type, debut_type, bon (1/3/5), taille_salle_ref (défaut 30)
- [ ] Paramètres moteur de délibération : mode_deliberation (unique/deux_phases), seuil_phase1 (défaut 9.00), seuil_phase2 (défaut 10.00), rattrapage_actif (défaut false), oral_actif, modele_oral_defaut (A/B), eps_actif, facultatif_actif, modele_facultatif (bonus/normal), seuil_facultatif (défaut 10.00), mentions (JSONB)
- [ ] Grille disciplines : chaque discipline configurée avec type (ecrit_obligatoire/oral/eps/facultatif), series_applicables, type_obligation (obligatoire/au_choix), options_choix
- [ ] Paramètre : lien avec examen précédent (aucun / mêmes élèves / admissibles / non-admissibles)
- [ ] Grille disciplines/coefficients : une par série si catégorisation, une unique sinon
- [ ] Statut initial : CONFIG (cf. machine d'états §3.1)

**US-05 : Verrouillage de la configuration**
En tant que système, je dois empêcher la modification des paramètres fondamentaux d'un examen une fois le premier import effectué.

Critères d'acceptation :
- [ ] Paramètres verrouillés après premier import : anonymat, catégorisation, mode EPS, grille disciplines/coefficients
- [ ] Paramètres modifiables jusqu'à la délibération : seuils, mentions, taille des lots
- [ ] Message d'avertissement explicite si tentative de modification d'un paramètre verrouillé

---

### M03 — Import Élèves

**US-06 : Configuration du template d'import**
En tant qu'ADMIN, je peux configurer le format du fichier d'import élèves lors de la création de l'examen afin d'adapter l'application au format fourni par les établissements.

Critères d'acceptation :
- [ ] Niveau 1 — champs standards avec variantes (nom/prénom séparés ou colonne unique, date/lieu naissance séparés ou combinés ou absents, matricule, classe, sexe, commune, type de milieu)
- [ ] Niveau 2 — champs conditionnels auto-ajoutés (série si catégorisation, aptitude_EPS si mode post-admissibilité)
- [ ] Niveau 3 — champs libres ajoutables par l'ADMIN (intitulé + requis/optionnel)
- [ ] Propriétés par champ : dans_import, requis_import, dans_emargement, ordre_emargement
- [ ] **Champs Niveau 3 : flag `dans_analyse` non disponible en I1** — les champs libres ne peuvent être utilisés qu'à l'import et dans les listes d'émargement. L'analytics sur champs libres requiert une normalisation des valeurs (I2).
- [ ] L'Admin peut réordonner les colonnes d'émargement via interface (flèches ▲▼)
- [ ] Template verrouillé après le premier import élèves

**US-07 : Import du fichier élèves**
En tant qu'ADMIN, je peux importer un fichier Excel d'élèves afin de constituer la liste des participants à l'examen.

Critères d'acceptation :
- [ ] Validation des colonnes attendues selon le template configuré
- [ ] Rapport d'erreurs ligne par ligne (colonnes manquantes, valeurs invalides)
- [ ] Les lignes valides sont importées même si d'autres lignes sont en erreur
- [ ] Doublon détecté (même matricule ou même nom+prénom+établissement) → avertissement non bloquant
- [ ] Données d'identité (nom, prénom, date/lieu naissance) chiffrées via Edge Function avant stockage
- [ ] Si discipline(s) au_choix configurées : champ `Choix_[Discipline]` obligatoire à l'import — import bloqué si absent ou valeur invalide, message explicite par discipline concernée
- [ ] Confirmation du nombre d'élèves importés avec succès

**US-08 : Héritage d'élèves depuis un examen précédent**
En tant qu'ADMIN, je peux importer automatiquement les élèves d'un examen précédent (tous / admissibles / non-admissibles) afin d'éviter une ressaisie.

Critères d'acceptation :
- [ ] Sélection de l'examen source (doit être en statut CLOS ou PUBLIE)
- [ ] Trois modes : tous les élèves / admissibles uniquement / non-admissibles uniquement
- [ ] **Règle RATTRAPAGE** : si l'examen source avait le rattrapage activé, les candidats classés RATTRAPAGE sont comptés dans le mode "non-admissibles uniquement" (ils n'ont pas été admis définitivement)
- [ ] Les données d'identité sont déchiffrées puis rechiffrées de façon atomique dans la même Edge Function lors du transfert. Aucune donnée en clair ne transite par le client.
- [ ] Possibilité d'ajouter des élèves supplémentaires après héritage

---

### M04 — Centres de Composition

**US-09 : Création et configuration d'un centre**
En tant qu'ADMIN, je peux créer des centres de composition et y affecter des établissements afin d'organiser la répartition des élèves.

Critères d'acceptation :
- [ ] Création d'un centre avec : nom, localisation, capacité totale
- [ ] Affectation de plusieurs établissements (et/ou filières) à un centre
- [ ] Un établissement ne peut être affecté qu'à un seul centre par examen

**US-10 : Affectation automatique salle/table**
En tant qu'ADMIN, je peux configurer les salles d'un centre et déclencher l'affectation automatique des élèves afin de générer les listes d'émargement complètes.

Critères d'acceptation :
- [ ] Configuration : nombre de salles, capacité par salle
- [ ] Règle d'affectation au choix : alphabétique par nom / par numéro anonyme / par établissement
- [ ] Affectation "par établissement" : l'Admin assigne manuellement chaque établissement à une salle
- [ ] **Numéros de table = numéros de composition, séquentiels globaux au centre** (pas par salle) : Salle A → tables 1..n₁, Salle B → tables n₁+1..n₁+n₂, etc. Un numéro de table identifie un candidat de façon unique dans tout le centre.
- [ ] Réaffectation individuelle manuelle possible (drag & drop ou formulaire)
- [ ] Déclenchement uniquement quand tous les élèves du centre sont importés
- [ ] Si anonymat activé : génération des numéros anonymes et affectation aux lots (§3.6) déclenchée automatiquement après l'affectation salle/table — voir US-26

---

### M05 — Génération des Listes

**US-11 : Export des listes d'émargement**
En tant qu'ADMIN ou CHEF_CENTRE, je peux télécharger les listes d'émargement de mon centre afin de les utiliser le jour de la composition.

Critères d'acceptation :
- [ ] Format Excel, colonnes dans l'ordre configuré par l'Admin (ordre_emargement)
- [ ] Si anonymat activé : numéros anonymes présents, noms absents de la liste imprimable
- [ ] Si anonymat activé : souche détachable générée (partie centre + partie élève)
- [ ] Téléchargement ZIP de tous les lots d'un centre en un clic

**US-26 : Génération des numéros anonymes et fiches d'orientation**
En tant qu'ADMIN, lors du passage en statut COMPOSITION, les numéros anonymes sont générés et les fiches d'orientation sont disponibles afin de permettre à l'équipe d'anonymat d'effectuer son travail avec fiabilité.

Critères d'acceptation :
- [ ] Numéros générés lors du passage INSCRIPTIONS → COMPOSITION, après affectation salle/table (cf. US-10)
- [ ] Format respecte les 3 paramètres configurés (prefixe_type, debut_type, bon)
- [ ] Bon sélectionné selon règle §3.6 — alerte ADMIN avec 3 options si bon=1 imposé par contrainte taille
- [ ] Valeurs autorisées pour bon : {1, 3, 5} uniquement — bon=4 rejeté
- [ ] **Fiche d'Attribution** générée par salle : colonnes Salle / Table / N°_à_écrire / Lot / Fait — absents marqués `(ABSENT)`, colonne Lot absente si bon=1
- [ ] **Grille de Rangement** générée par lot : colonnes N°_Anonyme / Salle / Table / ✓ — décompte "Copies attendues" déduit les absents confirmés
- [ ] Si bon > 1 : mention sur la Grille de Rangement "Tout numéro hors séquence (pas=[bon]) est une anomalie — isoler et signaler"
- [ ] Les deux fiches téléchargeables (PDF ou Excel) par salle (Attribution) et par lot (Rangement)
- [ ] Numéros immuables après génération — modification bloquée avec message explicite
- [ ] Réinitialisation possible avec confirmation obligatoire : "Cette action réattribue tous les numéros anonymes. Les souches déjà imprimées seront invalides."
- [ ] Propriété de réassemblage vérifiable : séquence 1 → N obtenue par interleave des lots (test automatisé, cf. §3.6)

---

### M06 — Génération Fichiers de Saisie Excel

**US-12 : Génération des fichiers de saisie de notes**
En tant qu'ADMIN, je peux générer les fichiers Excel de saisie de notes par centre et par lot afin de permettre la saisie hors-ligne.

Critères d'acceptation :
- [ ] Un fichier Excel par lot (taille de lot configurable par examen)
- [ ] Nommage : `notes_[centre]_[examen]_lot[n].xlsx`
- [ ] Colonnes : N°_Anonyme + une colonne par discipline de la série, avec coefficient en ligne 2
- [ ] Colonnes d'en-tête et ligne coefficient verrouillées (protection Excel)
- [ ] Seules les cellules de notes sont éditables
- [ ] Onglet caché `_meta` avec : centre_id, examen_id, matiere_id, serie_id, option_id, lot_numero, nb_eleves_attendus, generation_timestamp, version_template, hmac_signature
- [ ] **HMAC signé via Edge Function sur les métadonnées uniquement** : `HMAC-SHA256(centre_id + examen_id + matiere_id + serie_id + option_id + lot_numero + nb_eleves + generation_timestamp, SECRET_KEY)`. Le contenu Excel (les notes) n'est PAS inclus dans la signature.
- [ ] Colonnes : valeurs acceptées `[0..20]`, `"ABS"`, `"ABD"` — cellule vide rejetée à l'import
- [ ] Bouton "Télécharger tous les lots (ZIP)" disponible par centre
- [ ] Suivi d'avancement par lot dans l'interface (importé / erreurs / en attente)

---

### M07 — Import des Notes

**US-13 : Import d'un fichier de notes**
En tant que CHEF_CENTRE, je peux importer un fichier de notes complété afin de soumettre les notes de mon centre.

Critères d'acceptation :
- [ ] **Validation HMAC via Edge Function** — recalcule `HMAC-SHA256(centre_id + examen_id + matiere_id + serie_id + option_id + lot_numero + nb_eleves + generation_timestamp, SECRET_KEY)` et compare. Fichier avec HMAC invalide → import refusé.
- [ ] Codes `ABS`/`ABD` dans les cellules de notes → acceptés et stockés comme statuts distincts en base (cf. §3.7)
- [ ] **Anti-replay** : generation_timestamp vérifié dans la fenêtre d'acceptation (défaut 90 jours). Fichier hors fenêtre → import refusé avec message "Fichier expiré — régénérer les fichiers de saisie."
- [ ] Vérification correspondance centre_id + examen_id — mauvais fichier → import refusé
- [ ] **UPSERT à deux niveaux** (cf. §3.2) :
  - Détection lot : si `(centre_id, examen_id, lot_numero)` existe → avertissement + confirmation avant de continuer
  - Mise à jour ligne : UPSERT par `(numero_anonyme, lot_numero)` — seules les lignes présentes dans le fichier sont mises à jour
  - Si corrections manuelles in-app existent sur des lignes concernées → avertissement explicite avant écrasement
  - Chaque écrasement tracé en audit log
- [ ] Notes avec virgule ("10,5") → normalisées automatiquement en 10.5
- [ ] Notes hors [0, 20] → ligne en erreur, autres lignes importées
- [ ] Notes textuelles non convertibles → ligne en erreur
- [ ] Note vide pour discipline obligatoire → ligne en erreur
- [ ] Colonne manquante ou renommée → import refusé avec message précis
- [ ] Nombre de lignes ne correspond pas au nb_eleves_attendus → avertissement non bloquant
- [ ] Rapport d'import : nb lignes succès / nb erreurs / détail par ligne en erreur
- [ ] Options post-rapport : corriger dans l'app (si statut CORRECTION) ou re-télécharger pour réimporter

---

### M08 — Édition Notes In-App

**US-14 : Correction individuelle d'une note**
En tant que CHEF_CENTRE (statut CORRECTION), je peux corriger une note individuelle directement dans l'interface afin d'éviter un cycle réimport pour 1-2 erreurs.

Critères d'acceptation :
- [ ] Édition uniquement des cellules de notes — identité et numéro anonyme non modifiables
- [ ] Uniquement les notes de son propre centre (RLS)
- [ ] Uniquement en statut CORRECTION (verrouillé en DELIBERATION, DELIBERE, PUBLIE)
- [ ] Indicateur visuel sur chaque note modifiée manuellement (tooltip : "modifiée le JJ/MM à HH:MM")
- [ ] Chaque modification tracée en audit log : user_id, eleve_id, discipline, ancienne_note, nouvelle_note, timestamp

---

### M09 — Moteur de Délibération

**US-15 : Calcul des moyennes et délibération**
En tant qu'ADMIN, je peux lancer la délibération afin d'obtenir les décisions finales pour tous les élèves.

Critères d'acceptation :
- [ ] Alerte pré-délibération si lots non importés (liste des centres concernés)
- [ ] Alerte pré-délibération si élèves avec notes null en base (liste des élèves concernés)
- [ ] **Règle ABS/ABD** (cf. §3.7) : tout élève avec ≥1 discipline ABS ou ABD → NON ADMIS automatique, aucune moyenne calculée
- [ ] **Formule normative** (cf. §3.3) : `Math.round(SUM(note_i * coeff_i * 100) / SUM(coeff_i))` → résultat stocké en centièmes INTEGER
- [ ] **Mode délibération unique** : calcul sur toutes disciplines actives (écrit + oral + EPS + facultatif si activés). Décisions : ADMIS / RATTRAPAGE (si activé) / NON ADMIS
- [ ] **Mode 2 phases** :
  - Phase 1 : écrit_obligatoire uniquement, seuil configurable (défaut 900 centièmes = 9/20). ABS/ABD Phase 1 → NON ADMIS définitif.
  - Phase 2 : admissibles Phase 1 uniquement. Intègre oral + EPS + facultatif si activés. Seuil configurable (défaut 1000 centièmes = 10/20).
  - RATTRAPAGE non applicable en mode 2 phases (décision binaire ADMIS/NON ADMIS)
- [ ] **Oral Modèle A** : discipline séparée avec son propre coefficient, saisie indépendante
- [ ] **Oral Modèle B** : note combinée = (note_ecrit × poids_ecrit + note_oral × poids_oral), entrée dans le calcul avec coefficient global
- [ ] **Facultatif Option 1 (bonus)** : si note > seuil_facultatif → points_bonus = (note − seuil_facultatif × 100) × coeff ajoutés aux points totaux, dénominateur inchangé
- [ ] **Facultatif Option 2 (normal)** : intégrée au calcul comme discipline standard
- [ ] **EPS INAPTE** : élève INAPTE en Phase 2 → EPS exclue, Moyenne_phase2 = Moyenne_phase1 → ADMIS automatique
- [ ] Discipline non applicable à la série du candidat → exclue du numérateur ET du dénominateur
- [ ] Mentions calculées sur la moyenne finale selon les seuils configurés
- [ ] Résultats du moteur identiques au calcul manuel sur le jeu de données de référence DDEST-FP

**US-16 : Révision post-délibération**
En tant qu'ADMIN, je peux corriger une note après délibération afin de rectifier une erreur avant publication.

Critères d'acceptation :
- [ ] Correction en statut DELIBERE → alerte si changement de décision (NON ADMIS ↔ ADMIS)
- [ ] Toute correction en DELIBERE → statut passe à CORRECTION_POST_DELIBERATION (cf. §3.1)
- [ ] Re-délibération obligatoire avant de pouvoir publier
- [ ] Action tracée en audit log avec motif saisi par l'Admin

---

### M10 — Verrouillage par Statut

**US-17 : Cycle de vie de l'examen**
En tant que système, je dois faire respecter la machine d'états formelle afin d'éviter toute modification non autorisée.

Critères d'acceptation (machine d'états complète — cf. §3.1) :
- [ ] Statut initial : CONFIG à la création
- [ ] CONFIG → INSCRIPTIONS : déclenché manuellement par l'ADMIN
- [ ] INSCRIPTIONS → COMPOSITION : quand tous les centres sont configurés (déclenché par ADMIN)
- [ ] COMPOSITION → CORRECTION : déclenché automatiquement par le premier import de notes
- [ ] CORRECTION → DELIBERATION : déclenché manuellement par l'ADMIN (avec alertes)
- [ ] DELIBERATION → DELIBERE : déclenché par la validation de la délibération par l'ADMIN
- [ ] DELIBERE → CORRECTION_POST_DELIBERATION : déclenché automatiquement par toute modification de note en statut DELIBERE
- [ ] CORRECTION_POST_DELIBERATION → DELIBERE : déclenché par re-validation de l'ADMIN
- [ ] DELIBERE → PUBLIE : déclenché manuellement par l'ADMIN
- [ ] PUBLIE → CLOS : déclenché manuellement par l'ADMIN (archivage)
- [ ] PUBLIE → aucune modification possible en base (toutes les données read-only)
- [ ] CHEF_CENTRE : lecture seule dès DELIBERATION
- [ ] Toute tentative de transition non autorisée retourne une erreur 403

---

### M11 — Affectation Enseignant

**US-18 : Saisie de l'affectation enseignant**
En tant qu'ADMIN ou CHEF_ETABLISSEMENT, je peux associer un enseignant à un couple (discipline, classe) afin d'enrichir les analyses pédagogiques.

Critères d'acceptation :
- [ ] Formulaire : sélection discipline (liste de la grille de l'examen) + saisie libre de la classe et du nom de l'enseignant
- [ ] CHEF_ETABLISSEMENT : saisie pour ses propres classes uniquement
- [ ] Plusieurs affectations par enseignant (multi-classes, multi-disciplines)
- [ ] Affectation optionnelle — absence d'affectation n'affecte ni la délibération ni les exports
- [ ] Modification possible avant et après délibération

---

### M12 — Page Publique Consultation Résultats

**US-19 : Consultation d'un résultat**
En tant qu'élève ou parent, je peux consulter mon résultat depuis un smartphone sur réseau lent en saisissant mon numéro de composition et mon code d'accès afin d'éviter un déplacement.

Critères d'acceptation :
- [ ] Page distincte du SPA principal — bundle < 100 KB (pas de SDK tiers chargé sur cette page)
- [ ] Champs de saisie : numéro de composition + code d'accès (8 caractères)
- [ ] Données affichées : notes par discipline, moyenne, mention, décision
- [ ] Données masquées : nom, prénom, établissement
- [ ] Disponible uniquement après publication par l'Admin (statut PUBLIE)
- [ ] Charge initiale < 3 secondes sur connexion 3G simulée (test Lighthouse)
- [ ] Codes expirés → message "Résultats non disponibles" (pas d'indication d'expiration)

**US-20 : Protection anti-abus de la page publique**
En tant que système, je dois protéger la page de consultation contre les attaques par énumération et brute-force.

Critères d'acceptation :
- [ ] **Rate limiting global par IP** : max 20 requêtes/IP/minute → ralentissement (pas blocage) — protège le réseau
- [ ] **Lockout par (numero_composition_tente + ip_hash)** — PAS par IP seule (cf. §3.5) :
  - Tentatives 1-5 : réponse normale
  - Tentative 6 : blocage 1 heure
  - Tentatives 7-9 : blocage 24 heures
  - Tentative 10+ : blocage 72 heures + signalement audit log
- [ ] **Procédure déblocage ADMIN** : interface "Audit log → Consultations bloquées" avec bouton "Débloquer" par entrée (cf. §3.5)
- [ ] Réponse identique pour numéro inconnu et code incorrect (pas d'oracle d'énumération)
- [ ] Toutes les tentatives échouées tracées en audit log (numéro tenté, IP hashée, timestamp)
- [ ] TTL des codes d'accès configurable (défaut : 30 jours après publication)

> Note : Le captcha adaptatif est reporté en I2. Le rate limiting + lockout par (numero + IP) est suffisant pour I1 et compatible avec les contraintes réseau (2G/3G, IPs partagées africaines).

---

### M13 — Tableau de Bord Analytique

**US-21 : Tableau de bord par établissement**
En tant que CHEF_ETABLISSEMENT, je peux consulter les statistiques de mon établissement afin d'identifier les disciplines et les élèves en difficulté.

Critères d'acceptation :
- [ ] Taux de réussite global et par discipline
- [ ] Distribution des notes par discipline (min, max, médiane)
- [ ] Liste des élèves sous seuil d'alerte (seuil configurable, défaut : 8/20) par discipline
- [ ] Comparaison avec la moyenne département (si données disponibles)
- [ ] Si affectation enseignant saisie : nom de l'enseignant affiché par discipline/classe

**US-22 : Tableau de bord global (TUTELLE)**
En tant que TUTELLE, je peux consulter les statistiques globales de l'examen afin de produire des rapports institutionnels.

Critères d'acceptation :
- [ ] Taux de réussite global et par centre / par établissement
- [ ] Classement des disciplines par taux d'échec
- [ ] Filtres disponibles en I1 : par centre, par établissement, par série/filière
- [ ] Lecture seule — aucun bouton d'action

---

### M14 — Exports Excel

**US-23a : Export global des résultats (ADMIN + TUTELLE)**
En tant qu'ADMIN ou TUTELLE, je peux exporter les résultats globaux en Excel afin de les partager ou de les archiver.

Critères d'acceptation :
- [ ] Export global : tous les établissements dans un seul fichier, une feuille par établissement
- [ ] Colonnes : numéro anonyme, notes par discipline, moyenne (affichée en décimales), mention, décision
- [ ] **Modèle B — Distribution nominative (défaut)** : export par établissement [Nom | Prénom | Matricule | Classe | Code_Accès] — ADMIN uniquement, après levée d'anonymat
- [ ] **Modèle A — Distribution anonyme (option)** : export par centre [N°_Anonyme | Code_Accès] — pour affichage au panneau ou en ligne
- [ ] Les deux exports peuvent être activés simultanément par l'ADMIN
- [ ] Modèle B toujours disponible pour la remise physique des copies (identification nominative obligatoire)

**US-23b : Export de son établissement (CHEF_ETABLISSEMENT)**
En tant que CHEF_ETABLISSEMENT, je peux exporter les résultats de mon établissement en Excel afin de les distribuer ou les archiver localement.

Critères d'acceptation :
- [ ] Export limité à son propre établissement (RLS)
- [ ] Colonnes : numéro anonyme, notes par discipline, moyenne, mention, décision
- [ ] Pas d'accès aux codes d'accès des élèves (distribués par l'ADMIN)

---

### M15 — Audit Log

**US-24 : Traçabilité des actions sensibles**
En tant que système, je dois tracer toutes les actions sensibles afin de permettre une investigation en cas d'incident.

Critères d'acceptation :
- [ ] Table `audit_log` en INSERT uniquement (trigger PostgreSQL — pas d'UPDATE/DELETE)
- [ ] Actions tracées : import élèves, modification note, écrasement par réimport, lancement délibération, publication, consultation résultat réussie, tentative consultation échouée, déblocage lockout par ADMIN
- [ ] Données tracées par action : voir brief §4.8.2
- [ ] ADMIN peut consulter l'audit log en lecture seule
- [ ] TUTELLE peut consulter l'audit log en lecture seule
- [ ] Vue filtrée "Consultations bloquées" accessible à l'ADMIN pour la procédure de déblocage

---

### M16 — Lien Inter-Examens (mécanique uniquement)

**US-25 : Configuration du lien et héritage d'élèves**
En tant qu'ADMIN, je peux lier un examen à un examen précédent afin de réutiliser la liste des élèves.

Critères d'acceptation :
- [ ] Lien configurable à la création de l'examen : aucun / mêmes élèves / admissibles / non-admissibles
- [ ] Import automatique des élèves depuis l'examen source selon le mode sélectionné
- [ ] L'examen source doit être en statut PUBLIE ou DELIBERE pour être sélectionnable
- [ ] L'affichage de l'évolution de la moyenne par élève entre deux examens liés est **hors scope I1** (I2)

---

## 5. Exigences Non-Fonctionnelles

### Performance
- Page de consultation publique : < 3s sur 3G simulée, bundle < 100 KB sans SDK tiers
- Tableau de bord analytique (8 000 élèves) : < 3s de chargement
- Import d'un fichier de 50 notes : < 5s incluant la validation HMAC via Edge Function

### Sécurité
- Chiffrement AES-256 des données d'identité : exclusivement via Edge Function (jamais bundle client)
- HMAC-SHA256 sur les métadonnées `_meta` : exclusivement via Edge Function — le contenu Excel n'est pas signé
- Moyennes stockées en centièmes entiers, comparées en centièmes (cf. §3.3)
- Lockout par (numero + IP), pas IP seule (cf. §3.5)
- RLS activée sur toutes les tables sans exception
- Audit log INSERT-only via trigger PostgreSQL

### Accessibilité offline
- Tous les fichiers nécessaires au terrain (listes + fichiers de saisie) téléchargeables avant la composition
- Fichiers utilisables sans connexion internet (saisie dans Excel)
- Un seul upload par lot à la reconnexion

### Compatibilité
- Navigateurs cibles : Chrome 90+, Firefox 88+, Safari 14+ (desktop)
- Page publique résultats : Chrome et navigateurs Android courants (2G/3G)
- Fichiers Excel compatibles Microsoft Excel 2010+ et LibreOffice 6+

---

## 6. Définitions et Glossaire

| Terme | Définition |
|---|---|
| Lot | Groupe d'élèves d'un centre, taille configurable (défaut : 50). Un fichier Excel par lot. |
| Numéro anonyme | Identifiant attribué à chaque élève si anonymat activé. Généré lors du passage en statut COMPOSITION. Format configurable (préfixe, début, bon). Remplace le nom sur les copies et dans les fichiers de saisie. |
| ABS | Code saisi dans la cellule de note d'une discipline — candidat absent à cette épreuve. Entraîne NON ADMIS automatique. |
| ABD | Code saisi dans la cellule de note d'une discipline — candidat a abandonné cette épreuve. Entraîne NON ADMIS automatique. |
| Lot unifié | Un lot = un fichier Excel de saisie = un paquet de copies pour un correcteur. Clé : (centre_id, examen_id, matiere_id, serie_id, option_id, lot_numero). |
| Phase 1 | Admissibilité provisoire sur épreuves écrites uniquement. Seuil configurable, défaut 9/20. Les non-admis Phase 1 sont éliminés définitivement. |
| Phase 2 | Délibération finale pour les admissibles Phase 1. Intègre oral + EPS + facultatif selon configuration. Seuil configurable, défaut 10/20. |
| Oral Modèle A | Discipline orale = entrée séparée avec son propre coefficient dans la grille. |
| Oral Modèle B | Discipline orale = composante d'une discipline écrite (combinaison poids écrit/oral). |
| Facultatif Option 1 | Épreuve facultative bonus : seules les notes > seuil_facultatif contribuent (points bonus, dénominateur inchangé). |
| Facultatif Option 2 | Épreuve facultative comptée normalement dans la moyenne. |
| Code d'accès | Code 8 caractères unique par élève, généré à la délibération, stocké hashé (bcrypt), distribué via Modèle B (nominatif) ou Modèle A (liste anonyme). |
| Bon | Paramètre ∈ {1, 3, 5} définissant le nombre de lots de correction ET le pas entre numéros d'un même lot. Bon=1 = séquentiel sans lots. Bon=5 avec 150 copies → 5 lots de 30. |
| Fiche d'Attribution | Document imprimable par salle listant Salle/Table/N°_à_écrire/Lot — guide l'équipe d'anonymat lors de l'écriture des numéros et de la constitution des paquets. |
| Grille de Rangement | Document imprimable par lot listant les numéros anonymes dans l'ordre croissant — permet de vérifier l'exhaustivité d'un lot avant transmission à la commission. |
| Modèle A distribution | Export codes d'accès anonyme [N°_Anonyme \| Code_Accès] par centre — pour affichage public. |
| Modèle B distribution | Export codes d'accès nominatif [Nom \| Prénom \| Matricule \| Code_Accès] par établissement — défaut. |
| Admissible provisoire | Élève dont la moyenne Phase 1 (sans EPS) est >= seuil d'admissibilité. Soumis à la Phase 2. |
| Délibération | Calcul officiel des moyennes et attribution des décisions. Irréversible après publication. |
| UPSERT lot | Détection par `(centre_id, examen_id, lot_numero)` — déclenche avertissement si lot existant. |
| UPSERT ligne | Mise à jour par `(numero_anonyme, lot_numero)` — la clé de remplacement effective. |
| Centièmes | Unité de stockage des moyennes en base (11.77 → 1177 INTEGER). Division par 100 uniquement à l'affichage. |
| HMAC | Signature des métadonnées `_meta` du fichier Excel. Ne couvre pas le contenu des notes. Inforgeable sans la clé serveur. |
| Fenêtre HMAC | Durée pendant laquelle un fichier généré peut être importé (défaut : 90 jours). Configurable par examen. |

---

## 7. Dépendances Techniques

| Dépendance | Usage | Criticité |
|---|---|---|
| Supabase Auth | Authentification, sessions, JWT | Bloquant |
| Supabase RLS | Isolation des données par rôle | Bloquant |
| Supabase Edge Functions | Chiffrement AES-256, HMAC, rate limiting, lockout | Bloquant |
| SheetJS (xlsx) | Génération et parsing des fichiers Excel | Bloquant |
| Web Crypto API (Edge Function) | HMAC-SHA256 + AES-256 | Bloquant |
| KV store (Upstash Redis ou Supabase KV) | État rate limiting + lockout par (numero + IP) | Bloquant |

> Note : hCaptcha / Cloudflare Turnstile retiré de I1. Le captcha sera réévalué en I2 selon les données terrain de tentatives observées.

---

## 8. Critères de Validation Incrément 1

Le système est prêt pour un déploiement pilote (1-2 centres réels) quand :

1. **PoC parseur validé** : fichier corrompu → rapport d'erreurs conforme, aucune exception non gérée. Cas de test : colonne manquante, note "dix", HMAC invalide, centre_id incorrect.
2. **Cycle complet sans bug** : CONFIG → INSCRIPTIONS → COMPOSITION → CORRECTION → DELIBERATION → DELIBERE → PUBLIE → consultation publique
3. **Moteur délibération validé** : résultats identiques au calcul DDEST-FP de référence sur le jeu de données P2 (cas limites inclus)
4. **RLS irréfutable** : test automatisé avec 4 comptes de rôles distincts — 0 fuite inter-établissements
5. **Page publique < 3s** sur 3G simulée (Lighthouse Network Throttling) — bundle vérifié < 100 KB
6. **HMAC comportement correct** : test avec fichier dont les notes ont été modifiées manuellement → import ACCEPTE (HMAC valide car notes exclues de la signature). Test avec `_meta` modifiée → import REFUSÉ.
7. **Anti-replay vérifié** : fichier avec `generation_timestamp` hors fenêtre → import refusé
8. **Lockout opérationnel** : test automatisé — 10 tentatives sur même (numero + IP) → blocage 72h. IP différente avec même numero → non bloquée.
9. **Clé absente du bundle** : audit du bundle client — aucune clé de chiffrement ou clé HMAC présente
10. **Audit log complet** : toutes les actions US-24 tracées, vérifiées sur le cycle de test complet, y compris déblocage lockout
11. **Algorithme bons vérifié** : test automatisé sur N=150, bon=5 → 5 lots de 30, propriété de réassemblage (interleave → séquence 1→150 sans trou). Test N=32, bon=5 → lots de 7/7/6/6/6, propriété préservée. Test N=857, bon=5 → alerte déclenchée, bon=1 appliqué par défaut.
12. **ABS/ABD vérifiés** : test automatisé — élève avec ABS sur 1 discipline → NON ADMIS, aucune moyenne calculée. Élève avec note=0 sur toutes disciplines → moyenne calculée normalement (0.00/20). Cellule vide → import refusé avec message précis.
