# 📋 Concept Raffiné — Plateforme d'Examens Blancs DDEST-FP Alibori

## Problèmes réels résolus

| Problème actuel | Solution apportée |
|---|---|
| Listes manuelles Excel, sans cohérence | Import centralisé, génération automatique des listes |
| Saisie notes Excel, traitement manuel | Fichiers de saisie générés par l'appli, réimportés après terrain |
| Résultats affichés uniquement en centre | Consultation en ligne semi-publique (numéro + code d'accès) |
| Aucune analyse globale | Statistiques, classements, remédiation par classe et par élève |
| Processus non reproductible | Instances d'examens paramétrables, reliables entre elles |

---

## Entité Centrale : Instance d'Examen

Chaque examen est une instance **indépendante mais potentiellement liée** à un précédent.

```
Instance d'Examen
├── Identité : Nom, Année scolaire, Type (Blanc 1, BEPC blanc...)
│
├── Paramètre : Anonymat → OUI | NON
│     └── OUI → numéros anonymes + directives de tri des copies
│
├── Paramètre : Catégorisation → OUI | NON
│     ├── NON → une grille disciplines/coefficients unique
│     └── OUI → une grille par série/filière (A, B, C, D, TI...)
│
├── Paramètre : EPS
│     ├── MODE_NORMAL → évaluée avec toutes les disciplines
│     └── MODE_POST_ADMISSIBILITÉ → évaluée uniquement pour les admissibles
│           après une 1ère délibération (→ délibération en 2 phases)
│
├── Paramètre : Seuil d'admissibilité (ex: 10/20)
├── Paramètre : Mentions
│     └── Passable | Assez Bien | Bien | Très Bien | Excellent
├── Paramètre : Rattrapage → OUI | NON (avec seuil, ex: 8 ≤ moy < 10)
│
├── Paramètre : Lien avec examen précédent
│     ├── AUCUN → liste d'élèves indépendante (défaut)
│     ├── MÊME_ÉLÈVES → hérite de tous les élèves de l'examen précédent
│     ├── ADMISSIBLES → hérite uniquement des admissibles du précédent
│     └── NON_ADMISSIBLES → hérite uniquement des non-admissibles du précédent
│           └── → permet une analyse comparative inter-examens
│
└── Statut : CONFIG → INSCRIPTIONS → COMPOSITION → CORRECTION → DÉLIBÉRATION → CLOS
```

---

## Cycle de Vie Complet

```
1. CRÉATION & PARAMÉTRAGE
   └── Instance + anonymat + séries + EPS + seuils + lien examen précédent

2. IMPORTATION DES ÉLÈVES
   └── Saisie directe OU import Excel
   └── Champ EPS : Apte | Inapte (impacte la délibération si EPS post-admissibilité)
   └── Si lien avec examen précédent → import automatique depuis l'examen source

3. CENTRES DE COMPOSITION
   └── Regrouper établissements et/ou filières dans un centre
   └── Répartition automatique des élèves par centre

4. GÉNÉRATION DES LISTES
   └── Liste d'inscription par centre (nominative OU avec numéro anonyme)
   └── Export Excel : feuilles par lots pour faciliter la gestion terrain + hors-ligne

5. COMPOSITION (hors application — papier)
   └── Si anonymat → encart d'instructions généré :
       "Classer les copies dans l'ordre croissant des numéros anonymes"

6. CORRECTION (hors application)

7. EXPORT FICHIERS DE SAISIE DE NOTES
   └── Excel par centre : colonnes = disciplines + coefficients par série
   └── Feuilles par lots (taille configurable pour faciliter la saisie)
   └── Utilisable hors-ligne

8. SAISIE DES NOTES (hors-ligne, dans Excel)

9. IMPORT DES NOTES
   └── Re-import du fichier complété → validation + rapport d'erreurs

10. CALCUL & DÉLIBÉRATION
    ├── Si EPS = MODE_NORMAL → délibération unique
    └── Si EPS = MODE_POST_ADMISSIBILITÉ → délibération en 2 phases :
          Phase 1 : Calcul sans EPS → liste des admissibles provisoires
          Phase 2 : Ajout EPS (pour les aptes parmi les admissibles) → délibération finale

11. RÉSULTATS & EXPORTS
    └── Consultation semi-publique : numéro de composition + code d'accès personnel
    └── Export PDF bulletins individuels
    └── Export Excel (résultats bruts, synthèses par établissement, global)

12. ANALYSE & REMÉDIATION
    └── Par classe : matières faibles, taux de réussite
    └── Par élève : profil de performance, recommandations ciblées
    └── Comparaison inter-examens (si examen lié au précédent)
    └── Comparaisons inter-établissements / inter-centres
```

---

## Logique EPS — Délibération en 2 Phases

```
Tous les élèves
│
├── Phase 1 : Moyenne sans EPS
│     ├── Admissibles provisoires (moy ≥ seuil)
│     │     └── Aptes EPS → Phase 2 : Moyenne finale avec EPS
│     │     └── Inaptes EPS → Admissibles sans EPS (note EPS exclue)
│     └── Non-admissibles → Résultat final sans EPS
│
└── Phase 2 : Délibération finale avec mentions + rattrapage
```

---

## Logique de Lien Inter-Examens

```
Exam Blanc 1 [CLOS]
│
├── → Exam Blanc 2 (MÊME_ÉLÈVES) → analyse progression de tous
├── → Exam de rattrapage (NON_ADMISSIBLES) → analyse régression/progression des faibles
└── → Exam de sélection (ADMISSIBLES) → approfondissement des meilleurs
```

---

## Spécificités de la Consultation des Résultats

- **Accès** : numéro de composition + code d'accès personnel (généré et fourni à l'élève)
- **Visible** : notes par discipline, moyenne, mention, décision (Admis / Rattrapage / Non admis)
- **Masqué** : nom, prénom, établissement (anonymat APDP)
- **Disponible** : seulement après délibération et publication par l'ADMIN

---

## Rôles

| Rôle | Responsabilités |
|---|---|
| `ADMIN` | Création/paramétrage examens, délibération, exports globaux |
| `CHEF_ETABLISSEMENT` | Ses élèves, résultats et analyses de son établissement |
| `CHEF_CENTRE` | Import notes de son centre, résultats de son centre |
| `CONSULTANT` | Lecture seule — statistiques et résultats globaux |

---

## Décisions Architecturales Clés

| Décision | Raison |
|---|---|
| Instance d'examen comme entité racine | Permet multi-examens, paramétrage indépendant, analyse comparative |
| Hors-ligne = génération Excel intelligente | Adapté à la connectivité terrain du Bénin |
| EPS configurable en 2 modes | Reflète la réalité pédagogique (épreuve conditionnelle) |
| Lien inter-examens | Suivi longitudinal des élèves, analyse de progression |
| Seuils et mentions configurables | Chaque examen peut avoir ses propres règles de délibération |
| Accès résultats semi-public | Protection APDP + accessibilité aux élèves/parents |

---

## Décisions Finales

| Question | Décision |
|---|---|
| **Remédiation** | Générée automatiquement par l'appli + liste élèves en difficulté par discipline |
| **Code d'accès résultats** | Unique par délibéré, généré par l'ADMIN, distribué via export |
| **Taille des lots Excel** | Configurable par examen |
| **Inapte EPS (mode post-admissibilité)** | Automatiquement admis — EPS exclue du calcul final |
