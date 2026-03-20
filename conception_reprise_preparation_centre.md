# Conception du Flux de Reprise de Preparation Centre

## 1. Objet

Ce document decrit un plan de conception avant implementation pour un nouveau flux de "reprise de preparation centre".

Le besoin vise les cas ou une partie du travail de composition a deja ete faite en dehors de l'application, au niveau du centre:

- attribution des numeros de table
- attribution eventuelle des salles
- attribution eventuelle des numeros anonymes

L'application doit alors reprendre ces informations, les valider, les injecter sur des candidats deja inscrits, puis continuer le processus normal:

- lots
- correction
- deliberation
- publication


## 2. Probleme a resoudre

Le flux actuel est structure ainsi:

1. import des candidats par etablissement
2. affectation centre / salle / numero de table via l'application
3. generation des numeros anonymes via l'application
4. creation des lots

Ce flux fonctionne bien quand l'application pilote toute la composition.

En revanche, dans certains contextes terrain, le centre a deja effectue en amont une partie de la preparation. Si l'application ne sait pas reprendre cet etat preexistant, les utilisateurs sont obliges:

- soit de refaire le travail dans l'application
- soit de contourner le workflow
- soit de risquer des incoherences entre la preparation terrain et les donnees systeme


## 3. Objectif fonctionnel

Permettre a un centre de charger un fichier de reprise qui ne cree pas de candidats, mais met a jour les candidats deja presents dans l'examen avec des informations de composition deja preparees.

Le flux doit:

- rester compatible avec le workflow actuel
- ne pas remettre en cause l'import officiel par etablissement
- etre securise
- etre explicable pour les utilisateurs
- etre atomique au niveau metier
- produire un rapport de traitement lisible


## 4. Positionnement du nouveau flux

### 4.1 Ce que ce flux est

Un flux de mise a jour logistique de candidats deja existants dans l'examen.

### 4.2 Ce que ce flux n'est pas

Ce n'est pas:

- un import primaire de candidats
- un remplacement du flux d'inscription par etablissement
- un mecanisme de creation brute par centre

### 4.3 Principe directeur

La source officielle des candidats reste l'etablissement.
La preparation logistique locale peut etre reprise ensuite par le centre.


## 5. Cas d'usage couverts

Le flux doit couvrir les situations suivantes.

### Cas A - Reprise des numeros de table seulement

Le centre a deja attribue les numeros de table.
L'application doit:

- retrouver les candidats existants
- renseigner `centre_id`
- renseigner `numero_table`
- renseigner `salle_id` si disponible
- laisser `numero_anonyme` vide si non fourni

### Cas B - Reprise des numeros de table et des numeros anonymes

Le centre a deja attribue:

- numeros de table
- numeros anonymes

L'application doit:

- reprendre les deux
- valider leurs unicites
- permettre au workflow de continuer sans regeneration forcee

### Cas C - Reprise partielle

Le fichier contient des donnees incompletes:

- certains candidats ont un numero de table
- d'autres ont aussi un numero anonyme
- certains ont une salle
- d'autres non

L'application doit accepter cette reprise si les lignes restent valides.

### Cas D - Mise a jour sans ecrasement

Certaines donnees existent deja dans l'application.
Le centre veut seulement completer les champs vides.

### Cas E - Mise a jour avec ecrasement explicite

Le centre ou l'admin veut remplacer des valeurs deja presentes.
Ce mode doit etre explicite, trace et confirme.


## 6. Roles et phase de vie

### 6.1 Roles autorises

Roles recommandes:

- `admin`
- `chef_centre`

### 6.2 Restrictions de perimetre

Un `chef_centre` ne doit pouvoir agir que sur:

- les centres qui lui sont affectes
- les candidats du centre concerne
- un examen autorise

### 6.3 Phase recommandee

Le flux doit etre autorise principalement en phase `COMPOSITION`.

Ouverture possible a discuter:

- `INSCRIPTIONS` si l'on veut permettre une pre-preparation logistique tres en amont

Recommendation:

- commencer strictement par `COMPOSITION`
- elargir plus tard seulement si un vrai besoin apparait


## 7. Strategie recommandee

## 7.1 Architecture cible

L'approche recommandee est:

- parsing Excel cote frontend
- envoi d'un JSON propre
- traitement par une RPC SQL atomique

### Pourquoi cette approche

Elle permet:

- de rester coherente avec l'architecture actuelle tres orientee RPC
- de centraliser la logique critique en base
- de conserver une transaction metier propre
- d'eviter une Edge Function si elle n'apporte pas de valeur immediate

### Pourquoi ne pas utiliser un acces direct frontend

Cela disperserait:

- les validations
- les controles de droits
- les conflits d'unicite
- les garanties d'atomicite

### Pourquoi ne pas commencer par une Edge Function

Une Edge Function n'est pas necessaire au premier niveau si:

- le format du fichier est maitrise
- le parsing peut etre fait en frontend
- aucune logique de secret n'est requise

Elle pourra etre ajoutee plus tard si:

- les formats deviennent plus heterogenes
- le matching devient tres complexe
- le rapport de traitement doit etre plus riche


## 8. Regles de gestion

### 8.1 Regle fondamentale

Le flux ne cree jamais de candidat.
Il ne met a jour que des candidats deja presents dans l'examen.

### 8.2 Cle de correspondance candidat

Il faut definir une strategie de matching stable.

Ordre recommande:

1. `matricule` si disponible et fiable
2. identifiant metier explicite si un jour il existe
3. combinaison stricte de champs de reference, en dernier recours

Recommendation forte:

- ne pas baser le matching principal sur nom/prenom seuls

### 8.3 Champs mis a jour

Le flux peut mettre a jour:

- `centre_id`
- `salle_id`
- `numero_table`
- `numero_anonyme`

Optionnel selon la conception retenue:

- aucun autre champ candidat

### 8.4 Contraintes a respecter

Les verifications suivantes sont obligatoires:

- le candidat appartient bien a l'examen cible
- le centre est autorise pour l'utilisateur appelant
- le `numero_table` est unique dans `(examen_id, centre_id, numero_table)`
- le `numero_anonyme` est unique dans `(examen_id, numero_anonyme)`
- la salle, si fournie, appartient bien au couple `(examen_id, centre_id)`

### 8.5 Modes de traitement

Je recommande trois modes.

#### `validate_only`

Le systeme ne modifie rien.
Il retourne seulement:

- les lignes valides
- les conflits
- les erreurs
- les mises a jour potentielles

#### `fill_only`

Le systeme:

- remplit uniquement les champs vides
- n'ecrase jamais une valeur deja presente

#### `overwrite_confirmed`

Le systeme:

- ecrase les valeurs existantes
- journalise les modifications
- n'est disponible qu'apres confirmation explicite


## 9. Contrat fonctionnel du fichier

### 9.1 Fichier minimal

Colonnes minimales recommandees:

- `MATRICULE` ou autre cle retenue
- `NUMERO_TABLE`

Colonnes optionnelles:

- `NUMERO_ANONYME`
- `SALLE`

### 9.2 Version simple recommandee

Pour un premier lot, je recommande un format strict et petit:

- `MATRICULE`
- `NUMERO_TABLE`
- `NUMERO_ANONYME`
- `SALLE`

### 9.3 Politique de format

Le systeme doit:

- ignorer les espaces parasites
- normaliser les textes
- tolerer l'absence des colonnes optionnelles
- rejeter les doublons internes au fichier


## 10. Contrat technique propose

### 10.1 Page frontend

Ajouter une nouvelle page centre, distincte des pages existantes:

- "Reprise preparation centre"

Elle doit permettre:

- selection de l'examen
- upload du fichier
- previsualisation
- choix du mode de traitement
- execution
- affichage du rapport

### 10.2 Parsing frontend

Le frontend:

- lit l'Excel
- detecte les colonnes
- construit un payload JSON propre
- appelle la RPC

### 10.3 RPC SQL cible

Nom suggere:

- `reprendre_preparation_centre`

Entree suggeree:

```json
{
  "p_examen_id": "uuid",
  "p_centre_id": "uuid",
  "p_mode": "validate_only",
  "p_rows": [
    {
      "row_index": 2,
      "matricule": "MAT-001",
      "numero_table": 125,
      "numero_anonyme": "AN0125",
      "salle_nom": "Salle A"
    }
  ]
}
```

### 10.4 Retour RPC suggere

```json
{
  "updated": 120,
  "ignored": 15,
  "conflicts": 4,
  "errors": 6,
  "lines": [
    {
      "row_index": 2,
      "status": "updated",
      "message": "numero_table et numero_anonyme appliques"
    }
  ]
}
```


## 11. Impacts sur l'existant

### 11.1 Tables impactees

Principalement:

- `candidats`
- `salles`

Indirectement:

- lots, si la reprise est faite avant creation des lots

### 11.2 Cohabitation avec F04

`affecter_candidats_salles` reste utile pour:

- les centres qui n'ont rien prepare
- les cas ou seule une partie des candidats est prete

Comportement recommande:

- si les numeros de table existent deja, F04 ne doit pas les casser
- F04 doit rester utilise sur les candidats encore non affectes

### 11.3 Cohabitation avec F05

`generer_anonymats_centre` doit rester possible.

Comportement recommande:

- si `numero_anonyme` existe deja, F05 ne le remplace pas
- F05 ne genere que pour les candidats encore sans numero

### 11.4 Cohabitation avec F06

`creer_lots_centre` doit rester identique, a condition que:

- les numeros de table soient coherents
- les donnees de composition soient deja en place


## 12. Decisions de conception a valider avant implementation

Voici les points a arbitrer avant de coder.

### Decision 1 - Cle principale de matching

Option recommandee:

- `matricule`

Question:

- est-il suffisamment present et fiable dans les donnees reelles

### Decision 2 - Salle par nom ou par identifiant

Option recommandee:

- salle par nom metier dans le fichier
- resolution vers `salle_id` en base

### Decision 3 - Politique d'ecrasement

Option recommandee:

- `validate_only`
- `fill_only`
- `overwrite_confirmed`

### Decision 4 - Phase autorisee

Option recommandee:

- `COMPOSITION` uniquement au lancement

### Decision 5 - Portee du rapport

Option recommandee:

- rapport ligne par ligne
- compter:
  - mises a jour
  - lignes ignorees
  - conflits
  - erreurs


## 13. Plan de travail recommande avant implementation

### Etape 1 - Spec metier

Produire une mini spec validee sur:

- acteurs
- phase
- fichier
- matching
- modes de traitement

### Etape 2 - Spec technique

Definir:

- payload JSON
- retour RPC
- validations
- gestion des conflits

### Etape 3 - Verification schema

Verifier les points suivants dans le schema existant:

- contraintes d'unicite suffisantes
- salle resolvable proprement
- matricule disponible et fiable
- scope RLS compatible

### Etape 4 - Design UI

Definir:

- emplacement de la page
- parcours utilisateur
- etats de previsualisation
- affichage des conflits

### Etape 5 - Implementation

Ordre recommande:

1. migration SQL et RPC
2. service frontend
3. page UI
4. tests fonctionnels
5. ajustements de cohabitation avec F04 et F05


## 14. Risques et mitigations

### Risque 1 - Mauvais matching candidat

Impact:

- mise a jour du mauvais candidat

Mitigation:

- matching fort
- mode `validate_only`
- rapport explicite

### Risque 2 - Collision de numerotation

Impact:

- doublons `numero_table`
- doublons `numero_anonyme`

Mitigation:

- validation base
- rapport ligne par ligne
- blocage sur conflits

### Risque 3 - Confusion avec le workflow standard

Impact:

- utilisateurs perdus

Mitigation:

- page distincte
- libelle clair "Reprise preparation centre"
- documentation simple


## 15. Recommendation finale

Je recommande de mettre en place un flux distinct de "reprise preparation centre" avec les principes suivants:

- l'import primaire de candidats reste par etablissement
- la reprise centre ne cree pas de candidats
- le parsing du fichier se fait en frontend
- l'application appelle une RPC SQL atomique
- trois modes sont supportes:
  - `validate_only`
  - `fill_only`
  - `overwrite_confirmed`
- la phase cible initiale est `COMPOSITION`

Cette approche offre le meilleur equilibre entre:

- robustesse
- simplicite
- compatibilite avec l'existant
- cout d'implementation


## 16. Suite proposee

Si ce cadrage te convient, l'etape suivante sera de produire un document de specification d'implementation avec:

- signature exacte de la RPC
- schema JSON complet
- format Excel exact
- ecrans a creer
- backlog technique par taches


## 17. Contre-analyse et arbitrages techniques

Cette section consolide une revue technique contradictoire du document et tranche les points les plus importants avant passage a la specification d'implementation.

### 17.1 Point critique re-evalue - matching sur matricule

Une revue externe a souleve un risque bloquant en affirmant que le matching sur le matricule serait impossible car la colonne serait chiffree sous la forme `matricule_enc`.

Verification du depot actuel:

- la migration [20260316000004_candidat_matricule.sql](/c:/Users/HP%20ELITEBOOK/DEV/MockExams/supabase/migrations/20260316000004_candidat_matricule.sql) ajoute une colonne `matricule TEXT NULL`
- l'Edge Function [import-candidats/index.ts](/c:/Users/HP%20ELITEBOOK/DEV/MockExams/supabase/functions/import-candidats/index.ts) insere `matricule: r.matricule`
- il n'existe pas aujourd'hui de colonne `matricule_enc`

Conclusion:

- le matching sur `matricule` n'est pas bloque dans l'etat actuel du code
- il peut etre utilise en V1 du flux de reprise centre

Decision retenue:

- V1: matching principal par `matricule` si present
- V2 securite future: si le matricule est chiffre plus tard, ajouter une colonne `matricule_hash` pour conserver un matching deterministe et indexable

### 17.2 Point de schema re-evalue - unicite de `numero_table`

Une revue externe a indique qu'il manquerait une contrainte d'unicite sur `(examen_id, centre_id, numero_table)` et qu'il faudrait l'ajouter.

Verification du schema:

- la table `candidats` porte deja la contrainte `UNIQUE (examen_id, centre_id, numero_table)` dans [20260306000000_initial_schema.sql](/c:/Users/HP%20ELITEBOOK/DEV/MockExams/supabase/migrations/20260306000000_initial_schema.sql)

Conclusion:

- l'unicite de `numero_table` est deja garantie par la base
- la RPC de reprise doit s'appuyer sur cette contrainte existante
- aucune migration supplementaire n'est requise sur ce point

Decision retenue:

- ne pas ajouter de nouvelle contrainte
- laisser la validation fonctionnelle preparer les erreurs utilisateur
- laisser la contrainte DB jouer le role de dernier garde-fou

### 17.3 Point confirme - resolution de `salle_nom`

La revue a justement souleve que la normalisation des noms de salle est sous-specifiee.

Ce point est confirme.

Decision retenue pour la future spec technique:

- la resolution se fera dans la RPC
- la comparaison sera insensible a la casse et aux espaces parasites
- en cas de plusieurs correspondances apres normalisation, la ligne sera en erreur
- aucune heuristique floue avancee ne sera introduite en V1

Regle cible:

- normaliser `TRIM`
- normaliser la casse
- comparer sur un nom normalise

### 17.4 Point confirme - ecart entre `validate_only` et execution reelle

La revue a correctement identifie qu'entre:

- un appel `validate_only`
- et un appel ulterieur `fill_only` ou `overwrite_confirmed`

les donnees peuvent avoir change.

Conclusion:

- ce n'est pas un bug de conception
- c'est une propriete normale d'un workflow en deux temps

Decision retenue:

- `validate_only` est informatif, pas engageant
- l'appel d'execution doit toujours revalider integralement les donnees
- cette limite doit etre documentee explicitement dans la spec et dans l'UI

### 17.5 Arbitrage sur les vraies questions ouvertes

Apres verification du code et du schema, les vraies questions a trancher avant implementation sont les suivantes.

#### Question 1 - Strategie de matching en V1

Decision retenue:

- utiliser `matricule` comme cle principale si present
- prevoir des lignes en erreur si aucun matching fiable n'est possible
- ne pas introduire tout de suite une logique de matching faible sur nom/prenom seul

#### Question 2 - Comportement si candidat introuvable

Decision retenue:

- une ligne sans candidat trouve doit etre `error`
- elle ne doit pas etre `ignored`

Raison:

- `ignored` masque un vrai probleme de correspondance
- l'utilisateur doit corriger son fichier

#### Question 3 - Ecrasement de `centre_id`

Decision retenue:

- interdit pour `chef_centre`
- a exclure du flux standard de reprise
- eventuellement reserve a un flux admin exceptionnel distinct, si un jour necessaire

Raison:

- reaffecter un candidat d'un centre a un autre dans ce flux est trop dangereux
- cela depasse le cadre d'une simple reprise de preparation deja faite

#### Question 4 - Semantique exacte de `fill_only`

Decision retenue:

- "champ vide" signifie `NULL` uniquement
- `0` n'est pas considere comme vide
- pour `numero_table`, toute valeur non `NULL` est consideree comme deja renseignee

### 17.6 Conclusion d'arbitrage

La contre-analyse conduit a une position plus precise:

- le document de conception reste valide dans sa direction generale
- les deux objections les plus "bloquantes" soulevees en revue ne sont pas confirmees par le depot actuel
- les points a vraiment specifier avant implementation sont:
  - matching exact en V1
  - resolution `salle_nom -> salle_id`
  - semantique de `fill_only`
  - interdiction d'ecrasement de `centre_id` dans le flux standard

Ces arbitrages sont consideres comme la base de la prochaine specification d'implementation.
