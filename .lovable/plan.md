
# Audit "Mes annonces" (vue propriétaire) — lecture seule

## Localisation
- **Route** : `/sits` (partagée owner/sitter, bascule via `activeRole`).
- **Fichier** : `src/pages/Sits.tsx` (1441 lignes, monofichier : page + `SitCard` + `QuickActions` + `ActionsMenu` + `GuideSection`/`GuideField`).
- Titre "Mes annonces" activé quand `activeRole === "owner"` (l. 536).
- Onglets owner : `active` / `drafts` / `archived` (l. 78-82).

## 1. Fonctionnel

Actions présentes côté owner :
- Créer (`/sits/create`, bouton header + `MobileStickyCTA`).
- Voir l'annonce (`/sits/:id`).
- Modifier (`/sits/:id/edit`) — seulement `draft`/`published`.
- Voir les candidatures (redirige vers la fiche `/sits/:id`, pas de vue dédiée depuis la liste).
- Republier depuis `expired`/`unpublished` (bouton direct) et depuis onglet `archived` (via `RepublishAlmaDialog`).
- Archiver (`published`/`draft` avec `applicationCount > 0`).
- Supprimer (`published`/`draft`/`expired`/`cancelled` avec `applicationCount === 0`).
- Ouvrir le guide maison (menu `confirmed`/`in_progress`).
- Contacter le gardien (`confirmed`/`in_progress`).

Manquant / incomplet :
- **Pas de duplication** ("Republier avec de nouvelles dates" à partir d'une garde `completed` — parcours métier récurrent, absent).
- **Pas de dépublication depuis la liste** : la case `unpublished` existe mais `OwnerSitManagement.tsx` propose "Dépublier" seulement sur la fiche. Depuis la liste, une annonce `published` ne peut pas être remise en brouillon.
- **Pas de partage** : "Partager l'annonce" existe sur la fiche (`OwnerSitManagement`), absent du menu contextuel liste.
- **Pas d'aperçu candidatures** : nombre affiché, mais aucun accès direct à la liste des candidats sans cliquer sur la fiche. Le CTA "Voir X candidatures" ouvre `/sits/:id`, pas une section dédiée.
- **Cycle de vie flou** : 9 statuts affichés (`draft`, `published`, `published_with_apps`, `confirmed`, `in_progress`, `completed`, `cancelled`, `expired`, `unpublished`), mais aucun texte n'explique les transitions. L'utilisateur ne sait pas ce qui distingue `expired` (auto) de `cancelled` (avec `cancellation_reason: "expired"`), ni ce que devient une annonce `completed`.
- **Auto-expiration client-side dangereuse** (l. 205-215) : boucle `for` séquentielle avec `await`, exécute des `UPDATE` côté client à chaque `loadSits`. Devrait être un job serveur / trigger cron. Race condition possible entre onglets.

## 2. Statuts et données affichées

Par carte (owner) :
- Photo (cover_photo_url → owner_gallery → property.photos).
- Titre (saisi ou fallback `pets + dates`).
- Ville, dates, durée, badge "Dates flexibles", badge "Urgent" (< 48 h).
- Compteur `applicationCount` (uniquement si `published` et > 0).
- Badge statut.
- Avatar + prénom du gardien accepté.

Manquants utiles :
- **Nombre de vues** (`views_30d`, `views_total` : champ typé dans `owner/types.ts` mais **jamais chargé ni affiché** → code mort).
- **Nb messages non lus côté owner** (seul le sitter voit `lastMessage`/`unreadCount`, l. 274-337 : le bloc est dans la branche `else` sitter, l'owner ne récupère rien).
- **Nb candidatures en attente vs. totales** : `pendingApplicationCount` calculé (l. 237) mais **non affiché** sur la carte, seulement dans le sous-titre header.
- **Date de publication / dernière mise à jour** : aucune indication de fraîcheur ("publiée il y a 12 jours").
- **Raison d'annulation / dépublication** : `cancellation_reason` et `last_unpublished_reason` remontés côté sitter uniquement (owner_found / owner_withdrew), mais côté owner l'annonce archivée n'explique pas pourquoi elle est là.
- **Compteur de favoris** (combien de gardiens l'ont favorisée) : signal de désirabilité, absent.

## 3. États limites

- **Empty state** : différencié `active`/`drafts`/`archived`, correct.
- **Loading** : skeleton 3 cartes, correct.
- **Erreur** : **aucune gestion**. `await supabase.from("sits")` sans `.error`, si la requête échoue → `data = null` → liste vide silencieuse (indiscernable d'un vrai empty state).
- **Date passée sans candidature** : passe en `expired` via `getEffectiveStatus` mais l'auto-update la bascule en `cancelled+expired`. Double logique confuse.
- **Annonce sans candidature** : badge "Aucune candidature" en `published` (l. 1238), correct mais froid, sans conseil (retitrer, republier, promouvoir).
- **Onglet Archivées mélange 4 cas** : `completed`, `cancelled+archived`, `cancelled+expired`, `draft+unpublished`. Pas de sous-filtres, pas de tag visuel distinguant "terminée avec succès" vs "expirée sans gardien" vs "annulée".
- **Realtime absent** : contrairement à la fiche (`useSitRealtime`), la liste ne se met pas à jour quand une candidature arrive dans un autre onglet.

## 4. UX

- **Hiérarchie** : header + sous-titre contextuel + tabs + search + cards. Cohérent.
- **Recherche** : bien pensée (suggestions catégorisées), mais **`sits.length > 0` cache la recherche quand la liste est vide** — pas un vrai souci.
- **Actions redondantes / dispersion** : sur `published`, l'utilisateur voit le badge "candidatures" (top-right), le compteur inline (au milieu), le bouton "Voir X candidatures" (bas), le menu 3-points "Voir l'annonce" → 3 chemins pour la même action. Simplifier.
- **`published_with_apps`** : label "Candidature(s) reçue(s)" mais aucun statut n'est réellement stocké ainsi en DB — pure dérivation UI, OK, mais nom trompeur pour le dev.
- **Menu contextuel** : `canArchive` = `applicationCount > 0`, `canDelete` = `applicationCount === 0`. **Règle inversée peu intuitive** (pourquoi ne pas pouvoir archiver une annonce sans candidature ?). Résultat : une annonce `published` sans candidature n'a NI archive NI delete… si, delete OK. Mais impossible d'archiver un brouillon sans candidatures.
- **A11y** : boutons de tabs sans `role="tab"`/`aria-selected` (juste des `<button>`), pas de `aria-current`. Badges statuts = simples `<span>`, pas de `role="status"`.
- **Contraste** : classes hardcodées `bg-blue-50 text-blue-700`, `bg-emerald-50`, `bg-amber-50`, `bg-red-50` (l. 47-53, 60-63, 1046) — **violation memory design-system-tokens** (pas de tokens sémantiques success/info/warning).
- **Dark mode** : ces mêmes couleurs hardcodées cassent le rendu sombre.

## 5. Mobile (≤ 400 px)

- **Thumbnail masquée** `hidden sm:block` (l. 1009) → OK, gain d'espace.
- **Card padding** `p-4`, header en `flex-wrap`, badges qui débordent : sur 360 px, la ligne `city + dates + duration + flexible + urgent + applications` empile 5-6 puces + le badge statut. `flex-wrap` évite le overflow-x mais crée 3-4 lignes de puces, la carte devient très haute.
- **Menu 3-points + badge statut** sur la même ligne (l. 1058) : sur mobile étroit, le badge "Candidature(s) reçue(s)" (long label) peut compresser le titre. Pas testé Playwright.
- **Bouton "Voir X candidature(s)"** : atteignable au pouce, OK.
- **`MobileStickyCTA`** : masque potentiellement le dernier bouton de card (padding-bottom `9rem` prévu l. 530, OK).
- **Search input** : `pl-9 pr-9` correct.
- **Tabs scroll horizontal** avec mask-fade : OK.

## 6. Intégration Alma

- `useAlmaCulturalFact({ surface: "sits_list" })` et `useAlmaUsageNudge({ surface: "sits_list", role, state: "any" })` déclenchés (l. 123-128).
- **`RepublishAlmaDialog`** intégré pour republier depuis l'archive (bon).
- **Manquants** :
  - Aucun nudge ciblé "annonce publiée depuis 7 j sans candidature" (surface pertinente).
  - Aucun nudge "candidature en attente depuis > 48 h, répondez".
  - Aucun premier contact Alma spécifique à la surface, mais c'est cohérent (premier contact reste sur dashboard).
- Alma ne connait pas l'onglet actif (`active`/`drafts`/`archived`) — le nudge serait plus juste avec `state` variable (ex : `state: "no_apps"`, `state: "has_drafts"`).

## 7. Bugs, code mort, requêtes

- **N+1 massif** (l. 217-245) : pour chaque sit, 4 requêtes en parallèle (`applications`, `applications` accepted, `pets`, `reviews`). Avec 20 annonces → **80 requêtes**. Devrait être une RPC ou un `select` avec joins agrégés.
- **`views_30d`/`views_total`** : typés dans `owner/types.ts`, jamais peuplés — code mort.
- **Auto-expiration client-side** (l. 205-215) : `for … await` séquentiel + bascule `status: "cancelled"` avec `cancellation_reason: "expired"` alors que `getEffectiveStatus` distingue déjà `expired` sans écriture DB. **Double source de vérité incohérente**.
- **Enrichissement `toExpire.find(...)`** appelé 3 fois par sit dans le `map` (l. 230, 231, 234) — inefficace, `Set` suffirait.
- **`loadSits` dans `useEffect`** dépend de `[user, activeRole]` — recharge complète à chaque bascule de rôle, pas de cache React Query.
- **`openGuideId` triggerre un `.then`** (l. 172) sans `.catch` → erreur silencieuse.
- **`handleArchive`/`handleDelete`/`handleRepublish`** : aucun `.error` check, aucun try/catch, toast succès affiché même en cas d'échec RLS.
- **Fichier de 1441 lignes** : `SitCard`, `QuickActions`, `ActionsMenu`, `GuideSection`, `GuideField` devraient être extraits.
- **`Helmet noindex`** : correct.
- **`useSearchParams`** : bien, mais `setActiveTab` reset toujours en `replace: true`, on perd l'historique.
- **`isArchived` inclut `completed`** → une garde réussie va dans "Archivées". Discutable : pas d'onglet "Terminées" côté owner (contrairement au sitter).

## Tableau récapitulatif

| Zone / Élément | Problème observé | Sévérité | Correctif proposé |
|---|---|---|---|
| Chargement des sits | N+1 (4 req × N sits) | Bloquant | RPC `get_owner_sits_enriched` retournant tout d'un coup |
| Auto-expiration | Écriture client-side séquentielle + double source `expired`/`cancelled+expired` | Bloquant | Job cron serveur, supprimer les UPDATE côté client |
| Gestion d'erreurs | Aucun `.error`/try-catch sur les 3 mutations et les requêtes | Bloquant | Toasts d'erreur + retour `false` bloque `loadSits` |
| Realtime | Liste jamais rafraîchie sur nouvelle candidature | Moyen | Channel `applications` filtré `user_id`, invalidation React Query |
| Owner : messages | `lastMessage`/`unreadCount` uniquement côté sitter | Moyen | Même bloc pour owner (candidatures acceptées) |
| Onglet "Archivées" | Mélange 4 cas hétérogènes, pas de tag distinctif | Moyen | Sous-onglets ou pastilles "Terminée" / "Expirée" / "Annulée" / "Dépubliée" |
| Republication annonces `completed` | Absente | Moyen | CTA "Republier avec de nouvelles dates" → duplique en brouillon |
| Dépublication depuis liste | Absente (seulement sur fiche) | Moyen | Item menu contextuel `published` |
| `canArchive` = `applicationCount > 0` | Règle inversée : impossible d'archiver un brouillon | Moyen | `canArchive` sur `published`/`draft` sans condition sur applications |
| Vues (`views_30d/total`) | Typées, jamais peuplées ni affichées | Moyen | Colonne DB + affichage `Eye N` sur card |
| Nombre de candidatures en attente | Calculé, jamais affiché sur card | Moyen | Pastille `pendingApplicationCount` sur badge |
| Couleurs hardcodées `bg-blue-50` etc. | Viole design-system tokens, casse dark mode | Moyen | Utiliser tokens `success`/`info`/`warning`/`destructive` |
| A11y tabs | Pas de `role="tab"`, `aria-selected`, `aria-controls` | Moyen | Wrapper Tabs shadcn ou attributs ARIA corrects |
| Alma nudges contextuels | Aucun ciblage "no_apps" / "drafts_pending" / "app_pending_48h" | Moyen | Passer `state` calculé (no_apps, pending_apps) à `useAlmaUsageNudge` |
| Redondance CTA candidatures | 3 chemins pour la même action sur `published` avec candidatures | Cosmétique | Ne garder que le CTA principal + badge |
| Actions redondantes fiche vs liste | Partager/Guide/Modifier sur fiche mais pas menu liste | Cosmétique | Aligner `ActionsMenu` avec `OwnerSitManagement` |
| Mobile ≤ 360 px | 5-6 puces + badge long → card haute et bruitée | Cosmétique | Prioriser puces (ville + dates), replier flexible/urgent |
| Fraîcheur (`created_at`) | Non affichée | Cosmétique | "Publiée il y a 3 j" sous le titre |
| Nb favoris | Non affiché | Cosmétique | Compteur `favorites` en card |
| Fichier 1441 lignes | Monolithe difficile à tester | Cosmétique | Extraire `SitCard`, `QuickActions`, `ActionsMenu`, `Guide*` |
| React Query absent | Refetch complet à chaque mount + bascule rôle | Cosmétique | `useQuery(["ownerSits", userId])` + invalidation ciblée |
| `Helmet noindex` sitter aussi | OK | – | – |

## Top 3 correctifs prioritaires

1. **Fiabilité serveur** : RPC unique `get_owner_sits_enriched` (kill le N+1) + supprimer l'auto-expiration client, la déléguer à un job cron. Sans ça, la liste devient lente et corrompt les statuts entre onglets.
2. **Gestion d'erreurs et realtime** : `.error` check + toast sur toutes les mutations (`handleArchive`, `handleDelete`, `handleRepublish`), et abonnement realtime `applications`+`sits` filtré `user_id` pour que la liste se mette à jour dès qu'une candidature arrive ou qu'un statut change.
3. **Design tokens + onglet Archivées lisible** : remplacer toutes les couleurs Tailwind brutes (`bg-blue-50`, `bg-emerald-50`, `bg-amber-50`, `bg-red-50`) par des tokens sémantiques (respect memory `design-system-tokens`, dark mode réparé) ET ajouter des tags visuels distincts dans "Archivées" (Terminée / Expirée / Annulée / Dépubliée) pour que l'utilisateur comprenne l'état réel de chaque annonce archivée.

Aucune modification de code effectuée.
