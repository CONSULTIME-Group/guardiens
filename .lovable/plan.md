# Audit lecture seule — annonces expirées sans gardien

Fichier unique concerné : `src/pages/Sits.tsx` (l. 52–470). Aucun autre fichier ne participe à la logique d'expiration : `supabase/functions/auto-transition-sits/index.ts` ne gère PAS l'expiration (uniquement `confirmed → in_progress → completed`). Il n'existe donc **aucune expiration côté serveur** ; toute la logique est client, exécutée à chaque `loadSits()`.

## 1. Cycle réel d'une annonce dont la date de fin est passée sans gardien accepté

Deux cas très différents selon le `status` initial en base.

### Cas A — annonce publiée qui a expiré (`status='published'`)

Mutation client dans `loadSits` (l. 205–215) :

```
toExpire = sits où status='published' ET end_date < now()
UPDATE sits SET status='cancelled', cancellation_reason='expired'  (l. 210–213)
```

Puis l'enrichissement (l. 228–235) force localement `status='cancelled'`, `cancellation_reason='expired'`, et calcule `effectiveStatus` via `getEffectiveStatus`.

`getEffectiveStatus` (l. 95–112) :
- ligne 96 : `if (sit.status === 'cancelled') return 'cancelled'` → **retourne `'cancelled'`, jamais `'expired'`** pour ce cas.
- La branche `return 'expired'` (l. 99–101) n'est atteinte QUE si `status ∈ ['published','draft']`. Après la mutation ligne 210, cette branche est morte pour ce sit.

Résultat : la valeur `'expired'` définie dans `SIT_STATUS_CONFIG` (l. 52) n'est jamais réellement écrite en base et n'est renvoyée par `getEffectiveStatus` que pour des sits transitoires (avant mutation ou drafts jamais publiés). L'unique source de vérité de l'expiration est le duo `status='cancelled' + cancellation_reason='expired'`.

### Cas B — brouillon jamais publié dont l'end_date est passée (`status='draft'`)

- Aucune mutation : l'auto‑expire (l. 206) filtre uniquement `status='published'`. Le brouillon reste `status='draft'` en base.
- `getEffectiveStatus` (l. 99) : `status='draft'` + `end_date<now` → **retourne `'expired'`**.
- Divergence : `sit.status='draft'` mais `sit.effectiveStatus='expired'`.

## 2. Bucketing d'onglets (owner)

Prédicats (l. 396–406) :

```
wasUnpublished(s) = s.status==='draft' && !!s.unpublished_at
isArchived(s)     = es==='completed'
                  || (s.status==='cancelled' && cancellation_reason ∈ {'archived','expired'})
                  || wasUnpublished(s)
```

Filtres onglets (l. 441–455) :

```
drafts   : es==='draft' && !isArchived
archived : isArchived
active   : !isArchived && es !== 'draft'
```

### Où atterrissent les annonces expirées ?

- **Cas A (publiée→expirée)** : `status='cancelled'` + `cancellation_reason='expired'` → `isArchived=true` → onglet **Archivées** ✓. Le rendu (l. 753–761) force `effectiveStatus='expired'` uniquement dans cet onglet, donc le badge affiché est bien « Expirée ». **Hors onglet archived**, `effectiveStatus='cancelled'` → badge « Annulée » (label incorrect si affiché ailleurs, ex. recherche globale, cartes croisées).
- **Cas B (draft jamais publié + end_date passée)** : `es='expired'`, `isArchived=false` (pas de `unpublished_at`, pas de `cancellation_reason`).
  - `drafts` : `es==='draft'` faux → **exclu des Brouillons**.
  - `archived` : faux → **exclu des Archivées**.
  - `active` : `!isArchived && es!=='draft'` → vrai → **atterrit dans Actives** avec badge « Expirée ». Comptage `ownerTabCounts` (l. 429–439) : le sit tombe dans `else` (ni archived ni `es==='draft'`) → incrémente `counts.active`. Incohérent avec l'intention.

## 3. Confusion `unpublished` / `draft` / `expired` / `cancelled+expired`

- `SIT_STATUS_CONFIG` (l. 52–53) déclare les libellés `expired` et `unpublished`, mais **aucune de ces valeurs n'existe dans `sits.status` en base**. Ce sont des pseudo‑statuts calculés :
  - `expired` = calculé par `getEffectiveStatus` OU forcé dans le rendu archived (l. 758–759).
  - `unpublished` = calculé via `wasUnpublished` (`status='draft'` + `unpublished_at`), forcé dans le rendu archived (l. 756–757).
- La conséquence directe : la même valeur `status='draft'` couvre deux réalités opposées — vrai brouillon (jamais publié) et annonce dépubliée (archivée). Le distingueur est `unpublished_at`. Toute vue qui lit `status='draft'` sans regarder `unpublished_at` classera à tort une dépubliée comme brouillon.
- Pour l'expiration Cas A, la même ambiguïté existe : `status='cancelled'` couvre annulation manuelle, archivage manuel, et expiration automatique — le distingueur est `cancellation_reason`.

### Pourquoi l'utilisateur peut voir une expirée « comme un brouillon »

Le bucketing owner actuel **n'envoie pas** une expirée en onglet Brouillons stricto sensu. Mais deux failles produisent la perception :

1. **Cas B (draft abandonné, end_date passée)** : le sit disparaît de l'onglet Brouillons alors même que `status='draft'` en base, et réapparaît dans Actives avec badge « Expirée ». L'owner qui cherche son ancien projet ne le trouve pas dans Brouillons → perçoit une incohérence de traitement. Symétriquement, si l'utilisateur regarde la donnée brute (ou une autre surface qui filtre sur `status='draft'` sans `getEffectiveStatus`), elle est classée « brouillon ».
2. **Cas A hors onglet Archivées** : `effectiveStatus='cancelled'` renvoie badge « Annulée ». Nulle part on ne voit « Expirée » sauf dans l'onglet Archivées, ce qui masque l'état réel du cycle de vie.

De plus, `handleRepublish` (l. 377–388) republie en `status='published'` sans reculer `end_date` ni `start_date` : republier une expirée dont les dates sont passées la remet immédiatement en cycle → re‑expiration au prochain `loadSits`. Effet secondaire visible : l'annonce « oscille » entre Archivées et Actives.

## 4. État‑cible et correctif minimal (aucune modification appliquée)

**Objectif** : une annonce dont l'end_date est passée sans gardien retenu doit être clairement « annonce passée / expirée », consultable et republicable, distincte des brouillons et des annulations manuelles.

### Correctif minimal proposé (option la moins invasive)

Garder le pattern existant `status='cancelled' + cancellation_reason='expired'` comme marqueur DB, mais rendre `'expired'` first‑class au niveau `effectiveStatus` et étendre l'auto‑expire aux drafts.

1. **`getEffectiveStatus` (l. 95–112)** — Inverser l'ordre des tests : détecter `cancellation_reason==='expired'` AVANT le retour `'cancelled'`. Résultat : toute annonce expirée renvoie `'expired'` partout, plus seulement dans l'onglet Archivées.

   ```
   if (sit.cancellation_reason === 'expired') return 'expired';
   if (sit.status === 'cancelled') return 'cancelled';
   ```

2. **Auto‑expire (l. 205–215)** — Étendre le filtre aux drafts jamais publiés dont l'end_date est passée : `status ∈ ['published','draft']`. La mutation devient uniforme (`status='cancelled', cancellation_reason='expired'`). Cas B disparaît : le draft‑expiré passe en Cas A et donc en Archivées.

3. **Bucketing (l. 396–455)** — Aucun changement structurel requis grâce au (1) : `isArchived` détecte déjà `cancellation_reason='expired'`. La règle des Brouillons `es==='draft' && !isArchived` reste correcte. Le forçage manuel du label dans le rendu archived (l. 753–761) peut être supprimé (devient redondant avec (1)).

4. **`handleRepublish` (l. 377–388)** — Bloquer ou avertir si `end_date < today` : proposer d'ouvrir l'éditeur pour redéfinir les dates avant de repasser en `published`. Évite la re‑expiration immédiate.

### Alternative plus propre (hors scope minimal)

Ajouter `'expired'` à l'enum `sits.status` en base et le poser directement par un cron serveur (extension de `auto-transition-sits`). Supprime la double sémantique de `status='cancelled'` et les pseudo‑statuts calculés. Requiert migration DB + refactor du bucketing et des politiques RLS existantes — à cadrer séparément.

## Récap diagnostic

| Symptôme observé | Cause racine | Localisation |
| --- | --- | --- |
| Expirée labellisée « Annulée » hors Archivées | `getEffectiveStatus` retourne `'cancelled'` avant de voir `cancellation_reason='expired'` | l. 96 vs l. 99 |
| Draft expiré disparaît de Brouillons et apparaît en Actives | Auto‑expire ne cible pas `status='draft'` ; `getEffectiveStatus` remonte `'expired'` mais bucketing Brouillons compare à `'draft'` | l. 206 + l. 448 |
| `expired`/`unpublished` sont des pseudo‑statuts | Aucune valeur DB, uniquement calculée dans le composant | l. 52–53, 756–759 |
| Republier une expirée la re‑expire aussitôt | `handleRepublish` ne reset ni `start_date` ni `end_date` | l. 377–388 |
| Auto‑expire côté client uniquement | Aucun cron/edge function ne gère l'expiration | `auto-transition-sits/index.ts` (absent) |

Aucun fichier n'a été modifié.
