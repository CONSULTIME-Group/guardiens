## Objectif

Une fois l'annonce publiée, le propriétaire peut **inviter** des gardiens à candidater :
1. Depuis ses **favoris** (en un clic)
2. Depuis une **recherche de gardiens** (filtres : ville, rayon, expérience, animaux compatibles, dispo si possible)

L'invitation = un message + un lien vers l'annonce, qui apparaît côté gardien comme une **invitation à candidater** (notif + entrée messagerie + badge dans dashboard).

---

## UX

### Côté propriétaire — sur `/sits/:id` (vue owner, statut `published`)

Nouveau bloc **« Inviter des gardiens »** placé juste après les Candidatures reçues :

- **Onglet 1 — Mes favoris** : liste des sitters favoris (via `useFavorites('sitter')`), bouton « Inviter » par carte. État : non invité / invité (date) / a candidaté.
- **Onglet 2 — Trouver des gardiens** : mini-recherche (réutilise la logique de `SearchPage`) filtrée sur ville de l'annonce + rayon (15/30/50 km / partout), filtres expérience & types d'animaux. Bouton « Inviter » par carte.
- **Modal d'invitation** : message pré-rempli vouvoiement (« Bonjour, je publie une garde du X au Y à <ville>, votre profil m'a tapé dans l'œil. Seriez-vous intéressé(e) ? »), éditable, max 500 car. Bouton « Envoyer l'invitation ».
- **Garde-fous** : pas d'auto-invitation, pas de doublon (1 invit/sitter/sit), rate-limit (max 20 invits/jour/owner pour éviter le spam).

### Côté gardien

- **Notification** in-app + email transactionnel : « <Prénom> vous invite à candidater à sa garde à <ville> du X au Y ».
- **Conversation** créée dans la messagerie avec le contexte de l'annonce (réutilise `ContextHeaderCard` + lien vers `/sits/:id`).
- **Dashboard sitter** : nouveau compteur « Invitations reçues » (lien vers messagerie filtrée).
- Le gardien candidate normalement via la fiche annonce (flow existant inchangé).

---

## Technique

### DB (migration)

```sql
create table public.sit_invitations (
  id uuid primary key default gen_random_uuid(),
  sit_id uuid not null references public.sits(id) on delete cascade,
  owner_id uuid not null,
  sitter_id uuid not null,
  message text,
  status text not null default 'sent', -- sent | viewed | applied | declined
  created_at timestamptz not null default now(),
  viewed_at timestamptz,
  responded_at timestamptz,
  unique (sit_id, sitter_id)
);
create index on public.sit_invitations(sitter_id, status);
create index on public.sit_invitations(owner_id, created_at desc);

alter table public.sit_invitations enable row level security;

-- Owner : voit/crée ses invits sur SES sits publiés
create policy "owners manage own invitations"
on public.sit_invitations for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Sitter : voit les invits qui lui sont adressées, peut update viewed/responded
create policy "sitters read their invitations"
on public.sit_invitations for select
using (sitter_id = auth.uid());

create policy "sitters update their invitations status"
on public.sit_invitations for update
using (sitter_id = auth.uid())
with check (sitter_id = auth.uid());
```

Trigger : quand une `applications` est créée par le sitter sur un sit où il a une invit `sent/viewed`, marquer `status = 'applied'`.

Rate-limit : fonction `check_invitation_quota(owner_id)` qui compte les invits des dernières 24 h (max 20).

### Front

Nouveaux fichiers :
- `src/components/sits/owner/InviteSittersBlock.tsx` — wrapper avec onglets (Favoris / Recherche).
- `src/components/sits/owner/InviteSitterCard.tsx` — carte sitter + bouton « Inviter » + état.
- `src/components/sits/owner/InviteSitterDialog.tsx` — modal message + envoi.
- `src/hooks/useSitInvitations.ts` — list/create/update via React Query.

Intégration : ajout du bloc dans `OwnerSitView.tsx` (statut `published` uniquement), après la section Candidatures.

Côté gardien :
- Notification (table `notifications` existante) + entrée messagerie (réutiliser flow conversation existant lié au sit).
- Compteur `Invitations reçues` dans `useSitterDashboardData`.

### Email

Template transactionnel `sit-invitation` (via `sendTransactionalEmail`) — vouvoiement, pas d'icônes/emojis, mentionne « gardien » jamais « voisin ».

---

## Découpage en lots

- **Lot 1 (DB + back)** : migration `sit_invitations` + RLS + trigger + quota. ~30 min.
- **Lot 2 (UI Favoris)** : `InviteSittersBlock` onglet Favoris + dialog + hook + intégration `OwnerSitView`. ~1 h.
- **Lot 3 (UI Recherche)** : onglet Recherche avec filtres ville/rayon/animaux. ~1 h.
- **Lot 4 (côté gardien)** : notif + entrée messagerie + compteur dashboard + email transactionnel. ~45 min.

Total ≈ 3 h. Je peux commencer par le Lot 1 + 2 (le plus à valeur immédiate : inviter ses favoris) et livrer le reste ensuite. OK pour partir comme ça ?