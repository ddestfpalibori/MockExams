---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - "PRESENTATION.md"
date: "2026-03-04"
author: "Zimkada"
---

# Product Brief: MockExams — Plateforme de Gestion des Examens Blancs

<!-- Contenu construit séquentiellement par le workflow BMAD Analyst (Mary 📊) -->

---

## Executive Summary

Le DDEST-FP Alibori (Bénin) organise chaque année plusieurs sessions d'examens blancs pour environ 8 000 élèves répartis dans 60 établissements et 20 centres de composition. Aujourd'hui, l'ensemble du processus repose sur des fichiers Excel créés manuellement, sans cohérence entre les examens, sans consultation des résultats en ligne, et sans aucune analyse pédagogique exploitable.

**MockExams** est une plateforme web centralisée qui orchestre le cycle complet d'un examen blanc — du paramétrage à l'analyse de remédiation — tout en s'adaptant aux contraintes de connectivité du terrain béninois grâce à une stratégie hors-ligne robuste basée sur des fichiers Excel intelligents générés par l'application.

---

## Core Vision

### Problem Statement

La gestion des examens blancs au DDEST-FP Alibori souffre de **5 défaillances majeures** :

1. **Fragmentation** : Chaque examen repart de zéro. Listes, numérotation, notes — tout est recréé manuellement dans Excel à chaque session, avec des risques importants d'erreurs et d'incohérences.
2. **Opacité des résultats** : Les résultats sont affichés uniquement sur papier dans les centres, sans aucune possibilité de consultation à distance pour les élèves, les parents ou la hiérarchie.
3. **Absence d'analyse pédagogique** : Une fois les moyennes calculées, les données ne servent à rien. Aucun outil ne permet d'identifier les matières faibles par classe, les élèves en difficulté, ni de formuler des recommandations de remédiation.
4. **Exposition aux erreurs humaines** : La numérotation des copies, l'anonymisation, le calcul des moyennes pondérées par série — tout est fait à la main, sans validation automatique.
5. **Non-reproductibilité** : Il est impossible de comparer les performances d'une session à l'autre, ni de suivre l'évolution d'une cohorte d'élèves dans le temps.

### Problem Impact

| Partie prenante | Impact du problème actuel |
|---|---|
| **DDEST-FP (admin)** | Temps excessif sur la logistique, risques d'erreurs en délibération |
| **Chefs de centre** | Saisie redondante des notes, aucun retour automatique sur les résultats |
| **Chefs d'établissement** | Visibilité nulle sur les performances de leurs élèves |
| **Enseignants** | Aucune donnée exploitable pour adapter leur pédagogie |
| **Élèves & parents** | Résultats inaccessibles à distance, délais d'attente importants |

### Why Existing Solutions Fall Short

- **Excel** : Outil de calcul, pas un système de gestion. Aucune traçabilité, aucune validation automatique, aucune collaboration multi-utilisateurs sécurisée.
- **Logiciels génériques** (SGS, etc.) : Non adaptés au contexte béninois, pas de gestion de l'anonymat, pas de stratégie hors-ligne pour les centres à faible connectivité, pas de configuration de l'EPS post-admissibilité.
- **Solutions papier** : Délibération lente, résultats non consultables à distance, aucune analyse possible.

### Proposed Solution

**MockExams** est une plateforme web conçue spécifiquement pour les examens blancs de l'enseignement secondaire béninois. Elle repose sur trois piliers :

1. **Paramétrage complet** : Chaque examen est une instance configurable (anonymat, séries/filières, grilles disciplines-coefficients, EPS en 2 phases, seuils, mentions, rattrapage, lien avec un examen précédent).
2. **Stratégie hors-ligne intelligente** : L'application génère des fichiers Excel structurés (listes de salle, feuilles de saisie de notes en lots) utilisables sans connexion internet. L'import des notes se fait en une seule opération au retour de la connectivité.
3. **Intelligence pédagogique** : Après délibération, l'application calcule automatiquement les statistiques, identifie les élèves en difficulté par discipline, et génère des recommandations de remédiation exploitables par les enseignants.

### Key Differentiators

| Différenciateur | Description |
|---|---|
| **Contexte-spécifique** | Conçu pour les réalités béninoises (connexion instable, EPS conditionnelle, APDP) |
| **Hors-ligne en natif** | Le terrain n'a jamais besoin d'internet — les fichiers Excel font le pont |
| **Suivi longitudinal** | Un examen peut hériter des élèves d'un examen précédent pour une analyse comparative |
| **Double anonymat** | Numéro de composition + numéro anonyme + code d'accès résultats = 3 niveaux de protection |
| **Remédiation automatique** | L'analyse pédagogique est produite sans effort supplémentaire de la part des enseignants |

---

## Target Users

### Utilisateurs Primaires (acteurs directs du système)

---

#### 🔴 Persona 1 — Abdoulaye, l'Administrateur Système
**Rôle :** ADMIN (Directeur / Responsable informatique DDEST-FP)
**Profil :** Cadre de direction, maîtrise intermédiaire du numérique, fort niveau de responsabilité institutionnelle. C'est lui qui orchestre l'ensemble du processus d'examen du début à la fin.

| | |
|---|---|
| **Objectif principal** | Que chaque examen se déroule sans friction, du paramétrage à la publication des résultats |
| **Frustration actuelle** | Passe des jours à créer des fichiers Excel, à corriger des erreurs de saisie, à gérer des appels de chefs de centre qui ne savent pas comment numéroter les copies |
| **Attente clé** | Un tableau de bord de contrôle total : paramétrer, superviser, valider, publier — sans jamais toucher à Excel |
| **Moment « aha ! »** | Quand il clique sur « Publier les résultats » et que tout est accessible en ligne instantanément |
| **Risque à éviter** | Erreur de délibération rendue publique — impact institutionnel fort |

**Parcours clé :** Créer l'examen → configurer anonymat/séries/EPS → superviser l'import des élèves → valider la répartition → télécharger les listes → importer les notes → lancer la délibération → publier les résultats → exporter le rapport final.

---

#### 🟠 Persona 2 — Brice, le Chef d'Établissement
**Rôle :** CHEF_ETABLISSEMENT
**Profil :** Directeur de collège, 60 élèves inscrits à l'examen blanc, à l'aise avec les smartphones mais peu avec les outils numériques complexes. Responsable devant les parents et la hiérarchie.

| | |
|---|---|
| **Objectif principal** | Connaître rapidement les résultats de SES élèves et identifier ceux qui ont besoin de soutien |
| **Frustration actuelle** | Reçoit les résultats en retard, sur papier, sans aucune analyse. Il ne sait pas quelles matières font défaut dans son établissement |
| **Attente clé** | Un tableau de bord par établissement : taux de réussite, matières faibles, liste des élèves en difficulté |
| **Moment « aha ! »** | Quand il reçoit un rapport automatique lui disant « 40% de ses élèves ont < 8/20 en Maths — voici les recommandations » |
| **Risque à éviter** | Voir les résultats d'un autre établissement — problème de confidentialité |

**Parcours clé :** Se connecter → voir liste de ses élèves inscrits → consulter résultats après délibération → analyser matières faibles → lire les propositions de remédiation → exporter rapport pour réunion enseignants.

---

#### 🟡 Persona 3 — Clarisse, la Chef de Centre
**Rôle :** CHEF_CENTRE
**Profil :** Enseignante désignée responsable d'un centre de composition regroupant 4 collèges. Gère 300 élèves le jour J. Connexion internet instable dans son centre.

| | |
|---|---|
| **Objectif principal** | Gérer son centre le jour de la composition et saisir les notes après correction sans erreur |
| **Frustration actuelle** | Reçoit des listes Excel incohérentes, des numéros de copie en double, et doit ressaisir les notes depuis des feuilles papier dans un fichier non structuré |
| **Attente clé** | Un fichier Excel de saisie prêt à l'emploi (colonnes = disciplines, lignes = élèves numérotés, par lots) qu'elle peut remplir hors connexion |
| **Moment « aha ! »** | Quand elle importe le fichier complété et voit « 298 notes importées, 2 erreurs à corriger » en quelques secondes |
| **Risque à éviter** | Perdre des données de saisie à cause d'une coupure de connexion |

**Parcours clé :** Télécharger les listes et fichiers de saisie AVANT le jour J → composer l'examen avec les listes papier → saisir les notes hors-ligne dans Excel → importer quand connexion disponible → corriger les erreurs signalées.

---

#### 🟢 Persona 4 — Didier, l'Enseignant
**Rôle :** ENSEIGNANT (accès consultation pédagogique)
**Profil :** Prof de Mathématiques dans un collège. Corrige les copies, veut comprendre pourquoi ses élèves échouent et adapter son cours.

| | |
|---|---|
| **Objectif principal** | Identifier ses élèves en difficulté en Maths et ajuster sa pédagogie |
| **Frustration actuelle** | Reçoit parfois une liste de notes sur papier, sans aucune analyse. Doit faire ses propres calculs pour identifier les tendances |
| **Attente clé** | Une page listant ses élèves par niveau, avec les points de rupture par chapitre/discipline |
| **Moment « aha ! »** | Quand il voit automatiquement « 12 élèves de 3ème B ont < 5/20 en Maths — remédiation suggérée : révision algèbre » |
| **Risque à éviter** | Accéder à des résultats hors de sa classe/discipline |

**Parcours clé :** Se connecter → voir résultats de ses classes → consulter liste élèves en difficulté par discipline → lire recommandations de remédiation → planifier séances de soutien.

---

### Utilisateurs Secondaires (bénéficiaires indirects)

---

#### 🔵 Persona 5 — Fatou, la Tutelle / Agent de la Direction
**Rôle :** TUTELLE (agents DDEST-FP, hors Admin)
**Profil :** Inspecteur ou cadre administratif, besoin d'une vision à la fois globale et granulaire sur les performances de l'ensemble du département pour orienter les décisions pédagogiques et produire des rapports à la hiérarchie ministérielle.

| | |
|---|---|
| **Objectif principal** | Explorer les résultats à plusieurs niveaux pour identifier des disparités et formuler des recommandations institutionnelles |
| **Frustration actuelle** | Ne dispose que de moyennes globales sur papier. Impossible de comparer deux centres, d'isoler une filière ou d'analyser une matière en particulier |
| **Attente clé** | Un espace d'analyse avec **filtres combinables** : par examen, par centre, par établissement, par classe, par série/filière, par discipline, par sexe |
| **Moment « aha ! »** | Quand il filtre sur « Centre B + Série D + Maths » et voit instantanément que le taux de réussite est 22 points en dessous de la moyenne départementale |
| **Accès** | Lecture seule — toutes les données, tous les filtres, tous les exports |

**Capacités d'analyse requises :**

| Dimension de filtre | Exemples de questions métier |
|---|---|
| **Par centre** | Quel centre a le meilleur taux de réussite global ? Y a-t-il des écarts suspects ? |
| **Par établissement** | Quels collèges sous-performent systématiquement d'un examen à l'autre ? |
| **Par classe** | La 3ème A du Collège X progresse-t-elle entre le Blanc 1 et le Blanc 2 ? |
| **Par série / filière** | La série D fait-elle mieux en SVT que la série C dans tous les centres ? |
| **Par discipline** | Quelles matières concentrent le plus d'échecs dans le département ? |
| **Par sexe** | Y a-t-il des disparités garçons/filles dans les résultats en Maths ou Français ? |
| **Inter-examens** | Quelle est l'évolution du taux d'admissibilité entre Blanc 1, Blanc 2 et BEPC Blanc ? |

**Parcours clé :** Se connecter → choisir un examen → appliquer des filtres combinables → lire les tableaux et graphiques → exporter le rapport filtré (Excel ou PDF) → préparer la note de synthèse pour la hiérarchie.

---

#### 🟣 Persona 6 — Kévin, l'Élève
**Rôle :** ÉLÈVE (consultation des résultats)
**Profil :** Collégien de 16 ans, utilise un smartphone. Attend ses résultats avec anxiété après l'examen.

| | |
|---|---|
| **Objectif principal** | Connaître ses notes et sa mention depuis son téléphone, sans se déplacer |
| **Frustration actuelle** | Doit attendre l'affichage papier en centre, parfois plusieurs jours après la délibération |
| **Attente clé** | Entrer son numéro de composition + code d'accès → voir ses notes, sa moyenne, sa mention, sa décision |
| **Moment « aha ! »** | Quand il voit « Admis — Mention Bien » sur son écran le soir de la délibération |
| **Accès** | Page publique semi-sécurisée (numéro + code), sans authentification |

---

#### ⚪ Persona 7 — Aïssatou, la Mère d'Élève
**Rôle :** PARENT D'ÉLÈVE
**Profil :** Parent peu à l'aise avec le numérique, mais possède un smartphone basique. Très impliquée dans la scolarité de son enfant.

| | |
|---|---|
| **Objectif principal** | Savoir si son enfant a réussi, sans faire le déplacement au centre |
| **Attente clé** | Interface ultra-simple : entrer deux codes → voir le résultat en clair (Admis / Non admis) |
| **Contrainte clé** | L'interface de consultation doit fonctionner sur un réseau 2G/3G lente et être lisible sur petit écran |

---

### Synthèse des Besoins par Rôle

| Rôle | Accès système | Besoin principal |
|---|---|---|
| **Super Admin** | Complet sur tout | Contrôle total du système et de tous les examens |
| **Gestionnaire Examen** | Son examen uniquement | Paramétrage, délibération et publication de l'examen dont il a la charge |
| **Tutelle** | Lecture + filtres multi-dim. | Analyse filtrée (centre, classe, série, discipline, sexe) + exports |
| **Chef d'établissement** | Son établissement | Résultats + analyse de ses élèves |
| **Chef de centre** | Son centre | Saisie hors-ligne + import notes |
| **Enseignant** | Ses classes | Élèves en difficulté + remédiation |
| **Élève** | Page publique (code) | Consulter ses résultats depuis son téléphone |
| **Parent** | Page publique (code) | Savoir si son enfant est admis, simplement |

---

## Success Metrics

### User Success Metrics

Comment saurons-nous que le produit fonctionne pour nos utilisateurs ?

- **Pour le Gestionnaire / Admin** : Réduction du temps de préparation d'un examen (passer de plusieurs jours à < 2 heures pour le paramétrage et la génération des listes).
- **Pour le Chef de Centre** : 100% des notes saisies hors-ligne importées sans erreur bloquante au premier essai.
- **Pour la Tutelle** : Capacité à générer le rapport analytique départemental le jour même de la délibération (contre plusieurs semaines actuellement).
- **Pour les Élèves/Parents** : Accès aux résultats en moins de 5 minutes après la publication officielle (zéro déplacement requis).

### Business Objectives

Que voulons-nous accomplir d'un point de vue institutionnel pour la DDEST-FP ?

1. **Fiabilité absolue** : Zéro erreur de délibération due à une erreur de calcul humain ou un problème d'anonymat.
2. **Accessibilité** : Atteindre 100% de dématérialisation pour la consultation des résultats (supprimer la production papier d'affichage).
3. **Pédagogie orientée données** : Passer d'un examen purement "sanction" à un examen diagnostique où chaque session produit des recommandations de remédiation utilisables.

### Key Performance Indicators (KPIs)

Pour mesurer ce succès, nous suivrons ces indicateurs :

| KPI | Méthode de mesure |
|---|---|
| **Taux d'adoption hors-ligne** | % de fichiers de saisie Excel importés avec succès par les chefs de centre |
| **Délai de traitement** | Temps écoulé entre le dernier import de notes et la publication des résultats |
| **Taux de consultation** | Nombre de requêtes uniques avec code d'accès / Nombre d'élèves inscrits |
| **Impact pédagogique (Long terme)** | Évolution du taux de réussite sur les matières bénéficiant de remédiation (mesurable si examens liés) |

---

## MVP Scope

### Core Features (Le minimum vital pour la V1)

Pour que la plateforme justifie son utilisation dès la prochaine session d'examen blanc, elle __doit__ inclure :

1. **Le moteur de paramétrage d'examen** (Anonymat, Séries, EPS en 2 phases, Seuil/Mentions, Héritage d'élèves).
2. **Le système de rôles et RLS** (Super Admin, Gestionnaire d'Examen, Chef d'Établissement, Chef de Centre, Tutelle, Enseignant).
3. **L'import d'élèves par fichier Excel**.
4. **Le générateur de fichiers hors-ligne "intelligents"** (création des lots Excel pour la saisie des notes par centre).
5. **Le parseur d'import sécurisé** (validation et intégration des notes saisies hors-ligne).
6. **Le moteur de délibération** (Calcul des moyennes pondérées par série et de l'EPS post-admissibilité).
7. **La page publique de résultats** (Accès par Numéro de composition + Code d'accès).
8. **Le tableau de bord Tutelle / Chef d'établissement** avec les 7 filtres combinables.
9. **Le générateur de remédiation automatique** (Identification des matières/élèves faibles sans saisie par l'enseignant).

### Out of Scope for MVP (Exclu de la V1)

Ce que nous ne ferons **pas** dans cette première version 1-2 mois pour éviter le "*scope creep*" :

1. **Saisie directe des notes via l'interface web pour les chefs de centre** : On force le flux Excel hors-ligne pour la V1, car gérer des saisies partielles en ligne avec une connexion qui saute est trop de travail pour une V1.
2. **Envoi de SMS aux parents** : Les résultats seront uniquement consultables via le lien web. L'intégration d'une API SMS ajoute des coûts et une complexité inutile pour le MVP.
3. **Génération de bulletins PDF complexes avec graphiques** : On se limite à un export Excel des résultats ou un relevé de notes web imprimable / exportable en PDF simple.
4. **Authentification des enseignants/parents** : L'enseignant accède via un compte institutionnel partagé ou via la direction de l'établissement, et les parents n'ont pas de comptes (accès direct par code).

### MVP Success Criteria

Nous serons prêts à déployer le MVP en production quand :
- Un cycle d'examen complet fictif (1 paramétrage > 1 import simulé de 2 centres > 1 délibération) se déroule de bout en bout sans accroc.
- Le fichier Excel de saisie généré est confirmé **impossible à casser** par erreur humaine "normale" (colonnes protégées).
- Les règles RLS interdisent de manière irréfutable à un chef d'établissement de lire les données d'un autre collège.

### Future Vision (V2 et au-delà)

- **Module IA de Remédiation** : Connecter l'historique des notes à un LLM pour générer des programmes de révision personnalisés par élève.
- **Application Mobile Native** : Pour remplacer l'interface web sur les réseaux africains lents, avec fonctionnement hors-ligne complet (Service Workers / PWA).
- **Intégration base de données EDU-MASTER** : Se connecter à la base nationale si elle existe, pour éviter le premier import Excel des élèves en début d'année.
