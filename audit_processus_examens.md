# 🔍 Audit Complet — Processus de Gestion des Examens

**Périmètre :** De la création de l'examen à la consultation publique des résultats.
**Fichiers analysés :** 40+ fichiers (services, pages, hooks, edge functions, migrations SQL, types).

---

## Table des matières

1. [Bugs Critiques (bloquants en production)](#1-bugs-critiques)
2. [Bugs Fonctionnels (comportement incorrect)](#2-bugs-fonctionnels)
3. [Incohérences Logiques](#3-incohérences-logiques)
4. [Problèmes de Sécurité](#4-problèmes-de-sécurité)
5. [Problèmes UX / Frontend](#5-problèmes-ux--frontend)
6. [Problèmes d'Architecture / Maintenance](#6-problèmes-darchitecture--maintenance)
7. [Résumé par phase du processus](#7-résumé-par-phase)

---

## 1. Bugs Critiques

> [!CAUTION]
> Ces bugs peuvent causer des pertes de données ou un comportement incorrect en production.

### BUG-01 : Absence de préconditions métier avant les transitions critiques

| Fichier | [ExamenDetailPage.tsx](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/admin/ExamenDetailPage.tsx#L104-L112) + [20260313000000_transition_preconditions.sql](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/supabase/migrations/20260313000000_transition_preconditions.sql) |
|---|---|
| **Sévérité** | 🟡 Moyen — **✅ Fermé** |

> [!NOTE]
> **Correction post contre-analyse :** Un trigger DB `check_exam_status_transition` bloque toutes les transitions illégales côté PostgreSQL. Un appel API direct ne peut pas sauter des phases.

**Migration `20260313000000_transition_preconditions.sql`** — le trigger a été étendu avec 3 préconditions métier :

| Transition | Précondition |
|---|---|
| CORRECTION → DELIBERATION | Zéro note manquante dans `saisies` (respecté pour les disciplines au choix) |
| DELIBERE → PUBLIE | Tous les candidats ont un enregistrement dans `resultats` |
| CORRECTION_POST_DELIBERATION → DELIBERE | Idem — F03 doit avoir été exécuté avant de confirmer |

**Impact éliminé :** publier des résultats vides est désormais impossible côté DB, même pour un admin via appel API direct.

> [!CAUTION]
> Nécessite `supabase db push` pour prendre effet en production.

---

### BUG-02 : Import des notes — feature incomplète (pas un simple bug de format)

| Fichier | [SaisieNotesPage.tsx](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/centre/SaisieNotesPage.tsx#L72-L82) vs [verify-import/index.ts](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/supabase/functions/verify-import/index.ts#L95) |
|---|---|
| **Sévérité** | 🔴 Critique — **effort estimé : 2-3 jours** |

Trois niveaux de rupture superposés, pas un seul bug de format :

1. **Format :** `SaisieNotesPage` envoie un `FormData` (fichier Excel brut + `lot_id`), l'edge function fait `await req.json()` → crash immédiat.
2. **Structure :** la page envoie `lot_id` brut, l'edge function attend `meta` (7 champs : `examen_id`, `centre_id`, `matiere_id`, `lot_numero`, `serie_id`, `generation_timestamp`, `hmac_signature`) — contrat fondamentalement différent.
3. **Feature manquante :** l'edge function attend des `rows` déjà parsées `[{ numero_anonyme, valeur }]`, mais la page envoie le fichier Excel binaire. **SheetJS n'est nulle part importé dans `SaisieNotesPage`** — le parsing Excel côté client n'est pas implémenté.

```typescript
// Ce que la page envoie
formData.append('file', file);            // binaire Excel
formData.append('lot_id', selectedLot.id);

// Ce que l'edge function attend
{ meta: { examen_id, centre_id, matiere_id, lot_numero, serie_id,
          generation_timestamp, hmac_signature },
  rows: [{ numero_anonyme: string, valeur: string | number }] }
```

**Traiter comme un chantier séparé :** parsing Excel client (SheetJS), construction du payload `meta` HMAC depuis le lot sélectionné, refactoring complet du contrat API.

---

### BUG-03 : Délibération lancée sans passage par la RPC `deliberer_examen` — **✅ Fermé**

| Fichier | [ExamenDetailPage.tsx](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/admin/ExamenDetailPage.tsx#L108-L118) |
|---|---|
| **Sévérité** | 🔴 Critique |

Le hook `useDeliberation` (qui appelle correctement `examenService.delibererExamen` → RPC F03) existe dans `useExamens.ts` mais **n'était importé ni utilisé nulle part** dans `ExamenDetailPage`. Le bouton « Valider Délibération » déclenchait uniquement `useTransitionPhase('DELIBERE')` — transition de statut pure, aucun calcul.

Le séquencement correct requis :
1. Appeler `deliberer_examen` (F03) → calcule moyennes + décisions ADMIS/NON_ADMIS + remplit `resultats`
2. Lire le `jsonb erreurs[]` retourné par F03 et l'afficher (F03 peut réussir partiellement)
3. Si validé → faire la transition DELIBERATION → DELIBERE

**Correction appliquée :** `handleDeliberer` appelle `delibererMutation.mutateAsync`, stocke les erreurs partielles dans `deliberationErrors`, les affiche dans la modal de confirmation, puis déclenche la transition. Bouton avec `isLoading={delibererMutation.isPending}` — protection anti-double-clic.

> [!CAUTION]
> **Risque double-soumission :** F03 utilise `ON CONFLICT DO UPDATE` sur `resultats` — un double-clic ou retry réseau réécrit silencieusement tous les résultats. Le bouton doit être désactivé pendant l'appel (`isLoading`) et protégé contre les soumissions concurrentes.

---

### BUG-04 : Injection PostgREST via `.or()` non sanitisé — **✅ Fermé**

| Fichier | [consultation-publique/index.ts](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/supabase/functions/consultation-publique/index.ts#L173-L176) |
|---|---|
| **Sévérité** | 🟠 Moyen |

La vue `v_candidats_affichage` expose `serie_id` et `etablissement_id` via `SELECT c.*` sur `candidats` — PostgREST peut traverser ces FKs. Les jointures `!inner` fonctionnent.

L'interpolation directe dans `.or()` était le vrai problème. **Correction appliquée :** validation regex stricte avant interpolation (L173-176) :

```typescript
if (!/^[A-Z0-9\-]+$/.test(numero_anonyme)) {
  return errJson(GENERIC_ERROR, 401);
}
```

Tout input contenant des opérateurs PostgREST (`)`, `(`, `,`, `.`) est rejeté avant d'atteindre la requête.

---

## 2. Bugs Fonctionnels

### BUG-05 : `seuil_phase2` toujours envoyé, même en mode « Phase unique »

| Fichier | [ExamenFormPage.tsx](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/admin/ExamenFormPage.tsx#L335-L341) |
|---|---|
| **Sévérité** | 🟡 Moyen |

Le formulaire de création d'examen envoie **toujours** `seuil_phase2` dans le payload, même quand `mode_deliberation === 'unique'`. En mode phase unique, le seuil  phase 2 sert de seuil d'admission (ce qui est correct côté SQL), mais **l'UI ne montre pas le champ phase 2** dans ce cas. La valeur par défaut `12` est donc envoyée aveuglément.

La validation Zod ne vérifie pas que `seuil_phase1` ≤ `seuil_phase2` en mode deux phases.

---

### BUG-06 : `countMissingTableNumbers` — logique inversée

| Fichier | [centres.ts](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/services/centres.ts#L136-L147) |
|---|---|
| **Sévérité** | 🟡 Moyen |

La fonction vérifie les candidats avec `numero_anonyme IS NULL AND numero_table IS NULL`. Mais elle est censée être un « pré-check » pour la génération d'anonymats. Un candidat **avec** un numéro de table mais **sans** numéro anonyme est le cas normal à traiter, pas un cas d'erreur. Le nom et la requête sont confus.

---

### BUG-07 : Consultation publique — lockout non lu depuis le body d'erreur

| Fichier | [ConsultationPage.tsx](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/public/ConsultationPage.tsx#L60-L75) |
|---|---|
| **Sévérité** | 🟡 Moyen |

L'edge function retourne `retry_after_seconds` dans le body JSON, mais le frontend n'utilise pas cette valeur — il applique un fallback hardcodé (1h pour 403, 1min pour 429) indépendamment de ce que le serveur indique.

De plus, le code lit `.status` sur l'erreur Supabase, mais selon la version de `supabase-js`, ce champ peut être dans `context?.status`. **À vérifier selon la version du SDK utilisée** (`package.json`).

---

### BUG-08 : Consultation — le formulaire disparaît après la première recherche

| Fichier | [ConsultationPage.tsx](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/public/ConsultationPage.tsx#L128) |
|---|---|
| **Sévérité** | 🟡 Moyen |

La condition `{result === null && ( <form>... )}` fait que dès qu'un résultat `'not_found'` est obtenu, le formulaire disparaît **définitivement**. L'utilisateur doit cliquer « Réessayer » pour revenir au formulaire. Mais même une erreur HTTP 401 (identifiants incorrects), qui ne modifie pas `result` (reste `null`), ne masque pas le form — l'expérience est incohérente entre les types d'erreurs.

---

### BUG-09 : `ExamenDetailPage` — pas de bouton pour clore l'examen (PUBLIE → CLOS)

| Fichier | [ExamenDetailPage.tsx](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/admin/ExamenDetailPage.tsx#L116-L166) |
|---|---|
| **Sévérité** | 🟡 Moyen |

Le workflow de phases inclut `CLOS` dans `PHASE_LABELS`, mais il n'y a **aucun bouton** pour passer de `PUBLIE` à `CLOS`. L'admin ne peut donc pas clore l'examen via l'interface. De même, le statut `CORRECTION_POST_DELIBERATION` n'a aucun bouton de transition.

---

### BUG-10 : La page des lots ne montre pas tous les examens

| Fichier | [LotsPage.tsx](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/pages/centre/LotsPage.tsx#L151-L156) |
|---|---|
| **Sévérité** | 🟡 Moyen |

La page `LotsPage` affiche **tous** les examens dans le sélecteur (pas de filtre par statut), alors que `SaisieNotesPage` filtre `e.status === 'CORRECTION'`. Un chef de centre pourrait voir les lots d'un examen en CONFIG, ce qui est incohérent.

---

## 3. Incohérences Logiques

### INC-01 : Seuil_rattrapage — gestion asymétrique entre form et DB

Le formulaire Zod valide `seuil_rattrapage < seuil_phase2` (refine L58), mais la DB (migration `000007`) considère que `seuil_rattrapage IS NULL` + `rattrapage_actif = true` → le rattrapage n'est jamais déclenché (guard explicite). Or le `ExamenRow` dans `domain.ts` documente « NULL = fallback automatique (seuil_phase2 - 2 pts) » — mais **aucun code** n'implémente ce fallback. Le commentaire est donc trompeur.

### INC-02 : Conversion centièmes — risque sur cache stale

Dans le flux normal, `examenService` applique la conversion centièmes ↔ valeurs de manière cohérente. Le risque existe si React Query sert une entrée de cache chargée sans passer par le service (ex: `queryClient.setQueryData` manuel, ou données partagées entre queries). **Risque faible dans l'état actuel** mais à noter si de nouveaux points de chargement sont ajoutés.

### INC-03 : `fetchExamenStats` – compteur d'examens actifs

```typescript
.not('status', 'in', '("PUBLIE","CLOS")')
```

Ce filtre exclut PUBLIE et CLOS et compte comme « actifs » les examens en CONFIG, INSCRIPTIONS, COMPOSITION, etc. C'est sémantiquement correct mais mélange des examens non commencés avec des examens en cours — le label « actifs » peut être trompeur.

### INC-04 : Affectation salles — tri alphabétique sur données chiffrées

La fonction SQL F04 `affecter_candidats_salles` trie par `nom_enc` (colonne chiffrée AES) quand la règle est `'alphabetique'`. Le commentaire l'admet : « l'ordre n'est pas l'ordre alphabétique réel ». C'est un tri **pseudo-aléatoire** présenté comme alphabétique.

~~### INC-05 : Pas de contrôle d'unicité du code examen~~
> **Supprimé — faux positif.** La colonne `examens.code` est contrainte `UNIQUE` dans le schéma initial (ligne 191 de `20260306000000_initial_schema.sql`). Toute tentative de doublon provoque une erreur PostgreSQL.

### INC-05 (ex-INC-06) : `verify-import` vs `SaisieNotesPage` — contrats d'API incompatibles

Le frontend renvoie `{ nb_succes, nb_erreurs, warnings }` via `SaisieResult`, mais l'edge function retourne `{ success, nb_success, nb_errors, lines, warnings }`. Noms de champs différents (`nb_succes` vs `nb_success`, `nb_erreurs` vs `nb_errors`).

---

## 4. Problèmes de Sécurité

### SEC-01 : Absence de préconditions métier avant transitions critiques (cf. BUG-01)

Le trigger DB garantit la légalité formelle des enchaînements d'états. Ce qui manque : des gardes métier (notes complètes, résultats calculés) avant les transitions CORRECTION → DELIBERATION et DELIBERE → PUBLIE.

### SEC-02 : Incohérence de hachage — bug fonctionnel bloquant + risque sécurité

```typescript
// consultation-publique/index.ts
const codeHash = await sha256Hex(code_acces); // SHA-256 simple
```

Mais le schéma DB (ligne 745-746 de `20260306000000_initial_schema.sql`) est explicite :

```sql
-- code_hash = encode(hmac(code_brut, PEPPER_SECRET, 'sha256'), 'hex')
-- Jamais SHA-256 direct (vulnérable à brute-force offline si fuite DB).
```

**Double problème :**
1. **Bug fonctionnel bloquant :** `SHA256(code)` ≠ `HMAC(code, PEPPER)` — la recherche `.eq('code_hash', codeHash)` retourne toujours null. **Aucun code d'accès ne pourra jamais être validé** par la consultation publique.
2. **Risque sécurité :** même si corrigé, SHA-256 sans sel/pepper est vulnérable aux rainbow tables.

### SEC-03 : `consultation_tentatives` — reset des tentatives trop agressif

Après un succès, les tentatives sont remises à 0 (`tentatives: 0, lockout_until: null`). Un attaquant qui connaît **un seul** couple valide (code examen + numéro anonyme + code accès) peut l'utiliser pour reset le compteur de lockout après chaque série de 5 tentatives ratées sur d'autres identifiants.

### SEC-04 : `is_admin()` seul bloquait toute la phase Composition pour les chefs de centre — **✅ Fermé**

Les RPCs F04 (`affecter_candidats_salles`), F05 (`generer_anonymats_centre`) et F06 (`creer_lots_centre`) exigeaient `is_admin()`. En production, **un chef de centre ne pouvait exécuter aucune de ces RPCs** — toute la phase Composition était bloquée sans intervention admin.

**Correction appliquée — migration `20260313000001_sec04_chef_centre_rpcs.sql` :**
- Helper `is_chef_centre_de(p_centre_id uuid)` : vérifie `role = 'chef_centre'`, `is_active = true`, et l'appartenance à `user_centres`. `SECURITY DEFINER` + `SET search_path` + `REVOKE FROM PUBLIC`.
- Guards F04/F05/F06 élargis : `IF NOT (is_admin() OR is_chef_centre_de(p_centre_id))`.
- Un chef de centre A ne peut opérer que sur ses propres centres.

> [!CAUTION]
> Nécessite `supabase db push` pour prendre effet en production.

---

## 5. Problèmes UX / Frontend

### UX-01 : Absence de gestion locale d'erreur sur signature / reset lot

Les mutations `handleSigner` et `handleReset` dans `LotsPage.tsx` n'ont pas de `try/catch`. En cas d'erreur, `mutateAsync` lève une exception et `setSignerTarget(null)` n'est pas atteint — **la modal ne se ferme donc pas**, mais aucun message d'erreur contextuel n'est affiché à l'utilisateur. L'erreur est absorbée par le MutationCache global seulement si un handler `onError` global est configuré.

### UX-02 : Pas de filtre de statut sur le sélecteur d'examens dans `LotsPage`

Un chef de centre voit **tous** les examens (y compris ceux en CONFIG). Il devrait voir uniquement les examens en COMPOSITION ou CORRECTION.

### UX-03 : `ImportPage` — l'étape 2 ne parse pas réellement le fichier

L'étape 2 « Validation » montre le fichier et un bouton « Analyser ». L'analyse est faite par `useImportPreview()`, qui fait un appel réseau. Mais l'objet `File` est passé au hook — comment le hook envoie-t-il un fichier binaire au serveur ? Il est probable que le hook doive aussi utiliser `FormData`, posant le même problème que BUG-02.

### UX-04 : Pas de validation de format sur le champ « Code d'accès » en consultation

L'edge function attend un code de 8 caractères alphanumériques, mais le champ input n'a aucune contrainte `maxLength`, `pattern`, ou feedback visuel sur le format attendu.

### UX-05 : Défilement brisé sur le récap de confirmation (étape 4 du formulaire examen)

Le composant `ConfirmationStep` utilise `<dl className="space-y-0 divide-y divide-slate-50">` — l'espace `slate-50` est quasi invisible sur fond blanc, rendant le récapitulatif visuellement plat.

---

## 6. Problèmes d'Architecture / Maintenance

### ARCH-01 : Cast `as any` et `as unknown as` très fréquents

| Fichier | Occurrences |
|---|---|
| `candidats.ts` L23 | `(supabase.from('v_candidats_affichage' as any) as any)` |
| `examens.ts` L164 | `data as unknown as ExamenDisciplineDetail[]` |
| `resultats.ts` L58 | `(r as any).candidats?.numero_anonyme` |
| `consultation-publique` L161 | `.from('v_candidats_affichage' as any)` |

Cela masque les erreurs de typage et rend le code fragile face aux changements de schéma.

### ARCH-02 : Absence de préconditions métier formalisées pour les transitions de phase

Le trigger DB garantit la légalité formelle des transitions d'états (pas de sauts illégaux). Ce qui manque : des **préconditions métier** vérifiées côté serveur avant certaines transitions (ex: s'assurer que toutes les notes sont saisies avant DELIBERATION, que `resultats` est non vide avant PUBLIE). Ces vérifications n'existent ni dans le trigger, ni dans le service frontend.

### ARCH-03 : Duplication de la logique de seuils

La conversion centièmes ↔ valeurs est dans `examens.ts` (service), mais le `ExamenDetailPage` et le `ExamenFormPage` manipulent les valeurs sans se soucier de la conversion. Si un nouveau composant charge un examen via un chemin différent, il pourrait oublier la conversion.

### ARCH-04 : Hook `useDeliberation` importé mais jamais utilisé

Le hook existe dans [useExamens.ts](file:///c:/Users/HP%20ELITEBOOK/DEV/MockExams/portal/src/hooks/queries/useExamens.ts#L107-L118) mais n'est **importé dans aucune page**. La délibération n'est donc jamais déclenchée depuis l'UI. C'est du code mort qui aurait dû être connecté à un bouton « Lancer la délibération ».

---

## 7. Résumé par phase

| Phase | Étape | Observations |
|---|---|---|
| **Création** | Formulaire 4 étapes | BUG-05, INC-01 |
| **Configuration** | Ajout disciplines/centres | ✅ Correct |
| **Inscriptions** | Import candidats (établissement) | UX-03, INC-05 |
| **Composition** | Affectation salles / anonymats / lots | INC-04 |
| **Correction** | Saisie des notes | BUG-02 🔴, INC-05 |
| **Délibération** | Calcul résultats | BUG-03 🔴, ARCH-04 |
| **Transitions** | Workflow de phases | BUG-01 �, BUG-09 |
| **Publication** | Résultats publiés | BUG-01 🟡, BUG-09 |
| **Consultation publique** | Page publique | SEC-02 🔴, BUG-04, BUG-07, BUG-08, SEC-03, UX-04 |

---

## État final de l'audit — certifié 13 mars 2026

> [!NOTE]
> Tous les bugs P0 et P1 ont été corrigés au cours de cette session. Les deux migrations SQL nécessitent un `supabase db push` pour prendre effet en production.

### ✅ P0 — Fermés

| Bug | Correction | Fichier(s) |
|---|---|---|
| **SEC-02** | `hmacSha256Hex` + `CODE_ACCES_PEPPER` | `consultation-publique/index.ts` L82-92 |
| **BUG-03** | `handleDeliberer` + erreurs F03 + `isLoading` | `ExamenDetailPage.tsx` L108-118 |
| **BUG-02** | SheetJS + `parseLotExcel` + `importNotes` JSON | `excelLot.ts`, `lots.ts`, `SaisieNotesPage.tsx` |

### ✅ P1 — Fermés

| Bug | Correction | Fichier(s) |
|---|---|---|
| **SEC-04** | `is_chef_centre_de()` + guards F04/F05/F06 élargis | `20260313000001_sec04_chef_centre_rpcs.sql` ⚠️ |
| **BUG-04** | Validation regex avant interpolation `.or()` | `consultation-publique/index.ts` L173-176 |
| **BUG-01** | 3 préconditions métier dans le trigger DB | `20260313000000_transition_preconditions.sql` ⚠️ |
| **BUG-07** | Lecture `context?.status` + `retry_after_seconds` | `ConsultationPage.tsx` L61-76 |
| **BUG-09** | Tous les états UI couverts + bouton CLOS | `ExamenDetailPage.tsx` L180-208 |

> ⚠️ **`supabase db push` requis avant mise en production.**

### 📋 P2 — Ouverts (dette technique planifiable)

| # | Bug | Description |
|---|---|---|
| 1 | **BUG-09** | *(fermé ci-dessus)* |
| 2 | **INC-01** | Documentation fallback `seuil_rattrapage` trompeuse dans `domain.ts` |
| 3 | **ARCH-01** | Casts `as any` / `as unknown as` à résorber progressivement |
| 4 | **INC-04** | Tri pseudo-alphabétique sur données chiffrées — documenter ou déchiffrer avant tri |
| 5 | **SEC-03** | Reset lockout sur succès — exploitable avec un couple valide connu |
| 6 | **BUG-05** | `seuil_phase2` envoyé en mode phase unique + validation Zod manquante |

---

> **Notes finales :**
> - **INC-05** (contrat API verify-import) fermé dans le chantier BUG-02.
> - **INC-05 unicité code examen** supprimé — faux positif, contrainte `UNIQUE` confirmée dans le schéma DB.
> - **SEC-04 / SECURITY DEFINER** : le guard `is_chef_centre_de` est la seule ligne de défense — à documenter en revue de code.

