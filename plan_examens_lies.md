# Plan d'Evolution Vers des Examens Lies

## 1. Objet

Ce document propose un plan technique detaille pour faire evoluer le systeme actuel de gestion d'examen vers un systeme d'examens lies de premier rang.

Le but n'est plus seulement de permettre la copie ponctuelle de candidats depuis un examen source, mais de faire des examens lies une capacite structurelle du produit:

- creation de sessions derivees ou complementaires
- reprise partielle ou totale de cohortes
- suivi longitudinal natif
- comparaison inter-examens
- exploitation pedagogique et administrative de la progression

Le plan s'appuie sur l'architecture existante:

- `examens` comme entite racine
- `examen_liens` et `source_candidat_id` comme premiere brique de filiation
- `resultats` comme verite officielle de la deliberation
- `get_suivi_longitudinal()` comme reconstruction analytique de la chaine


## 2. Constat de l'etat actuel

### 2.1 Ce qui existe deja

Le socle actuel couvre deja plusieurs besoins critiques:

- un examen source peut etre lie a un examen cible via `examen_liens`
- le lien peut etre restreint a certains etablissements
- l'heritage peut cibler tous les candidats ou seulement les non admis
- la RPC `copier_candidats_depuis_lien()` recopie les candidats eligibles
- le champ `candidats.source_candidat_id` conserve la filiation individuelle
- la fonction `get_suivi_longitudinal()` reconstruit une chaine A -> B -> C

### 2.2 Ce qui manque pour une vraie architecture d'examens lies

Le systeme reste encore centre sur l'examen unitaire. Les examens lies sont actuellement une extension, pas un mode natif d'orchestration.

Les limites principales sont:

- le lien porte surtout sur la copie de candidats, pas sur une relation metier riche entre sessions
- il n'existe pas de notion de "campagne" ou "famille d'examens"
- l'heritage ne couvre pas encore toute la configuration de l'examen
- les vues UI restent majoritairement mono-examen
- la publication publique ne sait afficher qu'un resultat ponctuel, pas une trajectoire
- l'analyse pedagogique inter-examens reste separee du workflow central


## 3. Vision cible

La cible recommande est la suivante:

1. Un examen reste une instance autonome et deliberable.
2. Plusieurs examens peuvent appartenir a une meme chaine ou famille pedagogique.
3. Un examen derive peut heriter de donnees, de configuration et de cohortes depuis un ou plusieurs examens amonts selon des regles explicites.
4. Le systeme doit pouvoir expliquer pour chaque candidat:
   - d'ou il vient
   - pourquoi il est present dans l'examen courant
   - quel etait son statut precedent
   - quelle progression ou regression il a connue
5. L'exploitation admin, etablissement, tutelle et enseignant doit pouvoir basculer entre lecture mono-examen et lecture longitudinale.


## 4. Principes d'architecture

### 4.1 Garder l'examen comme unite operationnelle

Il ne faut pas casser le modele actuel. Chaque examen doit continuer a porter:

- son cycle de vie
- ses centres
- ses disciplines
- ses candidats
- ses lots
- ses saisies
- sa deliberation
- sa publication

Cette decision preserve les garanties actuelles:

- simplicite du moteur de phase
- isolation des operations terrain
- auditabilite
- publication independante

### 4.2 Introduire une couche superieure de relation

L'evolution doit se faire par ajout d'une couche de coordination au-dessus des examens existants, et non par refonte du coeur transactionnel.

Deux niveaux sont recommandes:

- niveau 1: relation directe entre examens
- niveau 2: regroupement optionnel des examens dans une meme "famille" ou "campagne"

### 4.3 Distinguer filiation de cohorte et filiation pedagogique

Aujourd'hui, `source_candidat_id` permet de suivre la filiation individuelle.
Il faut aller plus loin en distinguant:

- la raison d'heritage d'un candidat
- le type de lien entre les examens
- le segment de candidats concerne

Exemples:

- reprise de tous les eleves
- session de rattrapage
- session reservee aux non admis
- session reservee a certains etablissements
- session de remediaton ciblee
- examen blanc 2 apres examen blanc 1


## 5. Cible de donnees

### 5.1 Renforcer `examen_liens`

Le schema actuel peut etre etendu au lieu d'etre remplace.

Ajouts recommandes a `examen_liens`:

- `type_lien`
  - `continuite_session`
  - `rattrapage`
  - `remediation`
  - `session_speciale`
  - `examen_blanc_suivant`
- `motif_lien`
  - texte libre admin
- `heritage_config_scope`
  - `aucun`
  - `partiel`
  - `complet`
- `heritage_candidats_scope`
  - `tous`
  - `admis_uniquement`
  - `non_admis_uniquement`
  - `rattrapage_uniquement`
  - `selection_mixte`
- `created_by`
- `validated_at`
- `validated_by`

Effet attendu:

- rendre le lien explicite metierement
- preparer les analyses comparatives
- eviter qu'un lien reste une simple association technique

### 5.2 Introduire une entite de regroupement

Ajouter une table nouvelle, par exemple `exam_families` ou `campagnes_examens`.

Proposition:

- `id`
- `code`
- `libelle`
- `description`
- `annee_reference`
- `type_cycle`
- `created_by`
- `created_at`

Puis ajouter `famille_id` dans `examens`.

Cette couche permet:

- de grouper plusieurs examens dans un meme ensemble logique
- de porter des tableaux de bord de comparaison
- de ne pas deduire toute la logique uniquement a partir de liens directs

### 5.3 Ajouter une table de provenance metier des candidats

Le champ `source_candidat_id` est utile mais trop minimaliste pour les cas futurs.

Ajouter une table `candidat_origines`:

- `id`
- `candidat_id`
- `source_candidat_id`
- `examen_source_id`
- `examen_cible_id`
- `lien_id`
- `motif_heritage`
- `source_resultat_status`
- `source_moyenne_centimes`
- `copied_at`
- `copied_by`

Avantages:

- historiser les conditions d'import
- tracer l'etat source au moment de la copie
- figer le contexte de provenance meme si les donnees source evoluent

### 5.4 Ajouter une table de snapshots comparatifs

Pour les gros volumes, il ne faut pas faire reposer toutes les comparaisons sur de la reconstruction recursive en temps reel.

Ajouter une table `suivi_snapshots` ou `candidat_progressions`:

- `id`
- `famille_id`
- `candidat_racine_id`
- `candidat_source_id`
- `candidat_cible_id`
- `examen_source_id`
- `examen_cible_id`
- `delta_moyenne_centimes`
- `source_status`
- `cible_status`
- `progression_type`
- `computed_at`

Usage:

- KPIs inter-examens rapides
- export analytique
- tableaux de bord tutelle


## 6. Cible fonctionnelle par domaine

### 6.1 Creation d'un examen lie

Le flux cible admin doit proposer, des la creation:

- examen autonome
- examen derive d'un examen precedent
- examen derive d'une famille d'examens

Le wizard de creation doit permettre:

- choisir la source
- choisir le type de lien
- choisir la population a heriter
- choisir les etablissements concernes
- choisir ce qu'on herite:
  - etablissements
  - centres
  - series
  - disciplines
  - seuils
  - assets
  - enseignants

### 6.2 Heritage de configuration

L'heritage ne doit pas etre "tout ou rien".

Il faut des modules d'heritage distincts:

- heritage organisationnel
  - centres
  - etablissements
  - series
- heritage pedagogique
  - disciplines
  - coefficients
  - types d'epreuve
  - seuils
- heritage visuel et documentaire
  - logo
  - signature
- heritage RH
  - affectations enseignants

### 6.3 Heritage des candidats

La copie des candidats doit devenir un workflow guide.

Le moteur cible doit permettre:

- preview des candidats eligibles
- segmentation avant import
- import idempotent
- rejet explicable des doublons
- trace de provenance

Filtres metier recommandes:

- par statut precedent
- par etablissement
- par serie
- par classe
- par centre
- par seuil de moyenne

### 6.4 Deliberation comparee

Une fois les examens lies en place, la deliberation n'est plus seulement un calcul ponctuel.

Il faut ajouter une couche de comparaison post-deliberation:

- nombre de candidats en progression
- nombre de candidats stabilises
- nombre de candidats en regression
- passage non admis -> admis
- passage rattrapage -> admis
- maintien admis -> admis

Cette couche ne remplace pas `resultats`; elle l'exploite.

### 6.5 Consultation publique enrichie

La page publique doit rester simple, mais l'architecture doit autoriser deux niveaux:

- niveau 1: consultation actuelle mono-examen
- niveau 2 futur: option d'affichage de trajectoire si autorisee par le metier

Recommendation:

- ne pas exposer automatiquement l'historique inter-examens au public
- garder cette capacite reservee d'abord aux admins, etablissements, tutelle, enseignants


## 7. Evolution backend recommandee

### 7.1 Nouvelles RPCs

Ajouter des RPCs atomiques plutot que multiplier la logique frontend.

RPCs recommandees:

- `create_exam_from_linked_source(...)`
  - cree l'examen cible
  - cree le lien
  - copie la configuration choisie
- `preview_candidats_depuis_lien(...)`
  - retourne population eligible avant import
- `copier_configuration_depuis_examen(...)`
  - copie disciplines, series, centres, etablissements selon options
- `compute_progression_between_examens(...)`
  - calcule les deltas entre deux sessions
- `refresh_suivi_snapshots(...)`
  - materialise les comparatifs

### 7.2 Refactoring de la copie de candidats

La RPC actuelle `copier_candidats_depuis_lien()` est une bonne base mais doit evoluer vers:

- mode preview
- mode execute
- journal detaille des copies
- journal detaille des ignores
- justification des exclusions

Retour cible:

- `copies`
- `ignores`
- `rejets`
- `warnings`
- `stats_par_etablissement`
- `stats_par_statut_source`

### 7.3 Materialisation analytique

Le suivi actuel par CTE recursive est bon pour demarrer, mais il faut anticiper:

- croissance du nombre de sessions
- volume de candidats
- dashboards multi-filtres

Recommendation:

- garder `get_suivi_longitudinal()` comme source canonique de reconstruction
- ajouter des snapshots ou vues materialisees pour les usages analytiques frequents


## 8. Evolution frontend recommandee

### 8.1 Creation admin

Faire evoluer [ExamenFormPage.tsx](/c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/admin/ExamenFormPage.tsx) avec une etape supplementaire "Origine et lien".

Cette etape doit proposer:

- type de creation
- examen source
- type de lien
- perimetre des etablissements
- options d'heritage

### 8.2 Detail admin d'examen

Faire evoluer [ExamenDetailPage.tsx](/c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/admin/ExamenDetailPage.tsx) pour afficher:

- sa famille ou campagne
- son examen parent
- ses examens enfants
- la cohorte heritee
- les KPIs de progression

Ajouter un bloc "Relations" dans le resume:

- source
- cible(s)
- type de lien
- population heritee

### 8.3 Onglet Lien

Faire evoluer [ExamenTabLien.tsx](/c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/admin/ExamenTabLien.tsx) d'un simple ecran de configuration vers un ecran de pilotage:

- configurer le lien
- previsualiser la population
- lancer l'import
- voir le journal d'import
- voir les ecarts et doublons

### 8.4 Suivi longitudinal

Renforcer [SuiviLongitudinalPage.tsx](/c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/shared/SuiviLongitudinalPage.tsx):

- filtres par famille d'examens
- filtres par etablissement, serie, classe
- vue chaine complete
- vue comparaison de deux sessions
- vue KPI agregee
- export PDF/Excel

### 8.5 Tableaux de bord metier

Ajouter des sections inter-examens dans:

- dashboard admin
- dashboard tutelle
- dashboard etablissement
- dashboard enseignant

Exemples:

- progression par etablissement entre blanc 1 et blanc 2
- impact de remediations
- classes qui remontent
- disciplines qui restent critiques


## 9. Securite et gouvernance

### 9.1 Regles de creation et d'edition

Les examens lies doivent rester admin-only pour:

- creation du lien
- modification de la population heritee
- copie de configuration

Les chefs d'etablissement et chefs de centre doivent ensuite operer sur l'examen cible selon les regles normales de role.

### 9.2 Tracabilite obligatoire

Chaque operation de lien doit etre auditee:

- creation du lien
- modification de son mode
- import de candidats
- copie de configuration
- recalcul de progression

Le niveau d'audit doit etre au moins equivalent aux objets critiques deja traces.

### 9.3 Non ambiguite des lectures

Les vues inter-examens ne doivent jamais melanger:

- verite officielle de l'examen courant
- heritage d'information
- comparaison analytique

Regle:

- `resultats` reste la verite officielle par examen
- les comparaisons vivent dans des fonctions ou tables derivees
- l'UI doit toujours afficher l'examen de reference de chaque chiffre


## 10. Strategie de migration

### 10.1 Phase 1 - Durcissement du modele actuel

Objectif:

- consolider l'existant sans rupture

Travaux:

- enrichir `examen_liens`
- ajouter `candidat_origines`
- enrichir `copier_candidats_depuis_lien()`
- ajouter preview d'import
- afficher mieux le lien dans l'UI admin

Risque:

- faible

Valeur:

- immediate

### 10.2 Phase 2 - Heritage de configuration

Objectif:

- accelerer la creation d'examens derives

Travaux:

- RPC de copie de configuration
- options d'heritage dans le formulaire
- journaux d'operation

Risque:

- moyen

Valeur:

- forte pour l'administration

### 10.3 Phase 3 - Lecture longitudinale riche

Objectif:

- rendre le suivi inter-examens central dans l'exploitation

Travaux:

- KPIs de progression
- vues comparees
- exports
- dashboards par role

Risque:

- moyen

Valeur:

- tres forte pour pilotage pedagogique

### 10.4 Phase 4 - Familles d'examens

Objectif:

- passer d'une logique de lien ponctuel a une logique de campagne

Travaux:

- table `exam_families`
- rattachement de `examens`
- tableaux de bord par famille
- comparaisons n sessions

Risque:

- moyen a eleve

Valeur:

- structurante a long terme


## 11. Plan d'implementation concret

### Sprint A - Stabilisation du lien

- etendre `examen_liens`
- ajouter `candidat_origines`
- refactorer `copier_candidats_depuis_lien()`
- ajouter `preview_candidats_depuis_lien()`
- afficher les metadonnees du lien dans l'admin

Livrables:

- migrations SQL
- hooks React Query
- evolution `ExamenTabLien`

### Sprint B - Heritage guide

- ajouter les options d'heritage dans le formulaire examen
- creer une RPC de duplication partielle de configuration
- ajouter journal et recap de creation

Livrables:

- evolution `ExamenFormPage`
- nouveau service `examenInheritanceService`
- tests d'idempotence

### Sprint C - Progression et comparaison

- creer `compute_progression_between_examens()`
- creer snapshot analytique
- exposer KPIs et exports

Livrables:

- page suivi enrichie
- widgets dashboard
- exports Excel/PDF inter-examens

### Sprint D - Familles et campagnes

- ajouter `exam_families`
- rattacher les examens
- permettre des comparaisons multi-sessions

Livrables:

- migrations schema
- ecrans de famille
- filtre global par campagne


## 12. Priorites recommandees

Ordre recommande:

1. fiabiliser le lien et la provenance
2. industrialiser l'heritage
3. industrialiser l'analyse de progression
4. seulement ensuite introduire les familles d'examens

Pourquoi:

- le produit possede deja un noyau transactionnel solide
- la meilleure rentabilite immediate vient du lien mieux outille
- la famille d'examens est puissante mais doit reposer sur une provenance irreprochable


## 13. Risques principaux

### 13.1 Risque de confusion metier

Si l'on melange trop vite examen courant, source et comparaison, les utilisateurs peuvent ne plus savoir quel resultat fait foi.

Mitigation:

- etiquetage systematique des sources de donnees
- separation nette entre resultat officiel et comparaison

### 13.2 Risque de duplication incoherente

Copier des candidats sans figer leur contexte source rend les analyses peu fiables.

Mitigation:

- table `candidat_origines`
- snapshots de contexte source

### 13.3 Risque de dette analytique

Faire tous les calculs en lecture recursive peut devenir trop lent.

Mitigation:

- snapshots ou vues materialisees pour les usages lourds


## 14. Decision cible

La meilleure trajectoire n'est pas de remplacer le modele actuel, mais de le prolonger.

Decision recommandee:

- conserver `examens` comme unite operationnelle
- enrichir `examen_liens` comme relation metier explicite
- ajouter provenance et snapshots analytiques
- faire du suivi longitudinal une capacite transversale du produit
- introduire les familles d'examens seulement apres stabilisation des liens et de l'heritage


## 15. Prochaine etape proposee

La suite la plus utile serait de transformer ce plan en backlog technique priorise, avec:

- liste de migrations SQL
- nouvelles RPCs
- impacts par page frontend
- ordre de developpement
- criteres d'acceptation par sprint

