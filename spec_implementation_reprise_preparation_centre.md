# Spec d'Implementation - Reprise Preparation Centre

## 1. Objet

Cette spec definit le comportement exact a implementer pour le flux de reprise de preparation centre.

Objectif:

- permettre a un `admin` ou a un `chef_centre` de reprendre une preparation de composition deja faite hors application
- sans creer de candidats
- en mettant a jour des candidats deja inscrits dans l'examen


## 2. Perimetre V1

La V1 couvre uniquement:

- reprise de `numero_table`
- reprise de `numero_anonyme`
- reprise de `salle_id` via resolution sur `salle_nom`
- affectation du `centre_id` si absent

La V1 ne couvre pas:

- creation de candidats
- reassignment inter-centres
- matching flou sur nom/prenom
- traitement multi-centres dans un meme import


## 3. Roles et phase

### Roles autorises

- `admin`
- `chef_centre`

### Regles d'autorisation

- `admin` peut agir sur tout centre
- `chef_centre` peut agir uniquement sur un centre qui lui est affecte

### Phase autorisee

- `COMPOSITION` uniquement


## 4. Page UI a creer

Nom de travail:

- `PreparationCentreImportPage`

Emplacement fonctionnel:

- espace centre

Parcours utilisateur:

1. selection du centre actif
2. selection de l'examen en `COMPOSITION`
3. upload du fichier Excel
4. previsualisation et choix du mode
5. execution
6. affichage du rapport


## 5. Format de fichier V1

### Colonnes attendues

Colonnes obligatoires:

- `MATRICULE`
- `NUMERO_TABLE`

Colonnes optionnelles:

- `NUMERO_ANONYME`
- `SALLE`

### Regles de parsing

- noms de colonnes insensibles a la casse
- accents ignores
- espaces parasites ignores
- premiere feuille Excel uniquement
- lignes vides ignorees

### Contraintes fichier

- maximum 1000 lignes en V1
- doublons internes sur `MATRICULE` interdits
- doublons internes sur `NUMERO_TABLE` interdits
- doublons internes sur `NUMERO_ANONYME` interdits si la colonne est fournie


## 6. Matching candidat

### Regle V1

Le matching se fait exclusivement par `matricule`.

Critere SQL logique:

- `candidats.examen_id = p_examen_id`
- `candidats.etablissement_id` quelconque
- `candidats.matricule = valeur_fichier`

### Consequence

Si le matricule:

- est absent dans la ligne: erreur
- n'existe sur aucun candidat de l'examen: erreur
- correspond a plusieurs candidats: erreur

### Regle de rapport

Une ligne sans matching fiable est toujours en `error`, jamais en `ignored`.


## 7. Resolution de salle

### Entree

Le fichier transporte un `SALLE` sous forme de libelle metier.

### Resolution

La RPC doit resoudre ce libelle sur une salle de:

- meme examen
- meme centre

### Normalisation V1

Normaliser:

- `TRIM`
- casse

Comparaison cible:

- nom normalise du fichier = nom normalise de `salles.nom`

### Regles

- si aucune salle ne correspond: erreur
- si plusieurs salles correspondent apres normalisation: erreur
- si `SALLE` est absente: ne pas modifier `salle_id`


## 8. Modes de traitement

## `validate_only`

Effet:

- aucune ecriture en base
- validation complete
- retour ligne par ligne

Usage:

- obligatoire en pratique dans l'UI avant execution

## `fill_only`

Effet:

- met a jour uniquement les champs actuellement `NULL`

Semantique V1:

- `centre_id`: modifiable seulement si `NULL`
- `salle_id`: modifiable seulement si `NULL`
- `numero_table`: modifiable seulement si `NULL`
- `numero_anonyme`: modifiable seulement si `NULL`

Un champ non `NULL` n'est jamais remplace.

## `overwrite_confirmed`

Effet:

- autorise l'ecrasement de certaines valeurs existantes

Regles V1:

- `salle_id`: ecrasable
- `numero_table`: ecrasable
- `numero_anonyme`: ecrasable
- `centre_id`: non ecrasable en V1 dans ce flux

Restriction:

- disponible seulement apres confirmation explicite en UI


## 9. Regles metier d'ecriture

### Regle 1

Le candidat doit appartenir a `p_examen_id`.

### Regle 2

Le candidat ne peut pas etre reassigne a un autre centre via ce flux.

Concretement:

- si `centre_id` est `NULL`, il peut etre renseigne avec `p_centre_id`
- si `centre_id = p_centre_id`, on continue
- si `centre_id != p_centre_id`, la ligne est en erreur

### Regle 3

`numero_table` doit respecter l'unicite deja garantie par:

- `(examen_id, centre_id, numero_table)`

### Regle 4

`numero_anonyme` doit respecter l'unicite deja garantie par:

- `(examen_id, numero_anonyme)`

### Regle 5

Si une salle est fournie, elle doit appartenir a:

- `p_examen_id`
- `p_centre_id`


## 10. RPC a implementer

Nom:

- `reprendre_preparation_centre`

### Signature logique

```sql
reprendre_preparation_centre(
  p_examen_id uuid,
  p_centre_id uuid,
  p_mode text,
  p_rows jsonb
) returns jsonb
```

### Valeurs autorisees pour `p_mode`

- `validate_only`
- `fill_only`
- `overwrite_confirmed`


## 11. Payload JSON entrant

Format exact:

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

### Regles de validation JSON

Chaque ligne:

- `row_index`: obligatoire
- `matricule`: obligatoire
- `numero_table`: obligatoire
- `numero_anonyme`: optionnel
- `salle_nom`: optionnel


## 12. Reponse JSON attendue

Format cible:

```json
{
  "mode": "validate_only",
  "updated": 0,
  "ignored": 0,
  "errors": 2,
  "conflicts": 1,
  "lines": [
    {
      "row_index": 2,
      "matricule": "MAT-001",
      "status": "ok",
      "action": "would_update",
      "message": "numero_table et numero_anonyme valides"
    },
    {
      "row_index": 3,
      "matricule": "MAT-002",
      "status": "error",
      "action": "none",
      "message": "candidat introuvable"
    }
  ]
}
```

### Valeurs `status`

- `ok`
- `ignored`
- `error`
- `conflict`

### Valeurs `action`

- `would_update`
- `updated`
- `ignored_existing_values`
- `none`


## 13. Semantique des resultats

### `ok`

- ligne valide
- candidate trouvable
- operation autorisee

### `ignored`

Cas autorises en V1:

- `fill_only` et tous les champs de la ligne sont deja renseignes
- aucune modification necessaire

### `error`

Cas:

- candidat introuvable
- matricule absent
- salle introuvable
- candidat deja affecte a un autre centre
- format de donnees invalide

### `conflict`

Cas:

- collision `numero_table`
- collision `numero_anonyme`
- tentative d'ecrasement non autorisee dans `fill_only`


## 14. Comportement transactionnel

### `validate_only`

- aucune ecriture
- pas besoin de transaction de mise a jour

### `fill_only` et `overwrite_confirmed`

Recommendation V1:

- traitement dans une seule transaction RPC
- si une ligne est invalide, la RPC retourne le rapport complet sans appliquer de mise a jour partielle

Choix retenu:

- mode "tout ou rien" en V1

Raison:

- plus simple a comprendre
- plus facile a auditer
- evite les imports partiellement appliques et difficiles a corriger


## 15. Relation avec F04 et F05

### F04 `affecter_candidats_salles`

Le nouveau flux ne remplace pas F04.

Regle de coexistence:

- les candidats deja renseignes via reprise centre ne doivent pas etre casses par F04
- F04 doit idealement continuer a traiter seulement les candidats encore sans affectation utile

### F05 `generer_anonymats_centre`

Le nouveau flux ne remplace pas F05.

Regle de coexistence:

- les candidats deja dotes d'un `numero_anonyme` garde doivent etre preserves
- F05 continue a completer les candidats sans numero anonyme


## 16. Limitation connue

Il existe une fenetre entre:

1. un appel `validate_only`
2. puis un appel `fill_only` ou `overwrite_confirmed`

Pendant cette fenetre, d'autres modifications peuvent avoir eu lieu.

Regle de mise en oeuvre:

- l'execution revalide toujours tout
- le rapport final d'execution fait foi


## 17. Audit et tracabilite

V1 minimale:

- s'appuyer sur l'audit existant sur `candidats`

V2 recommandee:

- ajouter un journal fonctionnel de reprise centre si le besoin de reporting metier devient fort


## 18. Taches techniques

### Backend SQL

1. creer la migration de RPC `reprendre_preparation_centre`
2. ajouter les controles d'autorisation `admin` / `is_chef_centre_de`
3. parser `p_rows jsonb`
4. resoudre les candidats par `matricule`
5. resoudre les salles par `salle_nom`
6. construire le rapport ligne par ligne
7. appliquer les updates selon `p_mode`

### Frontend

1. creer la page centre de reprise
2. parser l'Excel
3. normaliser les colonnes
4. appeler la RPC en `validate_only`
5. afficher le rapport
6. permettre l'execution en `fill_only` ou `overwrite_confirmed`

### Tests

1. candidat introuvable
2. collision sur `numero_table`
3. collision sur `numero_anonyme`
4. salle introuvable
5. `fill_only` n'ecrase pas
6. `overwrite_confirmed` ecrase seulement les champs autorises
7. candidat deja dans un autre centre -> erreur


## 19. Decision finale pour implementation

La V1 sera implementee avec les choix fermes suivants:

- parsing Excel en frontend
- RPC SQL atomique
- matching strict par `matricule`
- phase `COMPOSITION`
- modes `validate_only`, `fill_only`, `overwrite_confirmed`
- pas d'ecrasement de `centre_id`
- transaction "tout ou rien"

