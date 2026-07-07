
# Audit LECTURE SEULE — Profils publics (gardien + propriétaire)

## Localisation

- **Aucune page dédiée propriétaire.** Tout passe par `src/pages/PublicSitterProfile.tsx` (2322 l.) qui unifie gardien / proprio / entraide via `Tabs`.
- Routes (`src/App.tsx`) :
  - `/gardiens/:id` → `PublicSitterProfile` (L.315)
  - `/proprietaires/:id` → `Navigate to /gardiens/:id?tab=proprio` (L.255-258)
  - `/profil/:id` → `Navigate to /gardiens/:id` (L.249-252)
  - `/annonces/:id` → `PublicSitDetail` (encart owner via `PublicSitView`)
- Composants clés : `TrustScore.tsx`, `TrustTimeline.tsx`, `ProfileSchemaOrg.tsx`, `useProfileReputation.ts`, `supabase/functions/og-profile/index.ts`.

## A. Profil public PROPRIÉTAIRE

### A1. Pas de page dédiée, seulement `tab=proprio`
Rendu conditionnel `PublicSitterProfile.tsx:1733-2141`. Si l'utilisateur n'a QUE `owner_profiles` (pas de sitter, pas d'entraide), `availableTabs === 1` et la barre d'onglets est masquée (L.1145) : plus aucun libellé ne dit « profil propriétaire ». Fonctionnel mais désorienté.

### A2. Avec annonces publiées
Rendu : avatar, prénom, ville, `identity_verified`, `is_founder`, note owner, bio owner, environments, compétences, badges, avis reçus, feedbacks entraide, animaux, galerie proprio, liste annonces (titre + dates + statut).

**Restitution des annonces (onglet Gardes, L.2013-2067) :**
- `sits` select L.514 = `id, title, start_date, end_date, status, created_at`.
- Aucun `description`, `owner_message`, `environments`, `city`, `cover_photo` — donc les correctifs récents de la fiche annonce ne sont PAS reflétés sur le profil.
- **Aucun lien cliquable** vers `/annonces/:id` : le visiteur ne peut pas ouvrir une annonce depuis le profil.

### A3. Sans annonce publiée
Empty states corrects : « Aucune garde publiée pour l'instant » (L.2065), animaux (L.1994), avis (L.1904), galerie masquée si vide (L.1796). Non cassé, mais très pauvre : seul l'encart présentation reste riche.

### A4. Cohérence saisie → restitution (bug bloquant)
`owner_profiles` select L.368-371 = `id, user_id, environments, competences, competences_disponible`. **`description` est absente du select** → `ownerProfile.description` est toujours `undefined`, le rendu retombe sur `profile.bio` (L.1810). Le mot rédigé dans « Mon profil propriétaire » n'apparaît JAMAIS sur le profil public.

**Champs owner_profiles saisis mais jamais restitués publiquement** :
`property_type`, `presence_expected`, `visits_allowed`, `overnight_guest`, `smoker_accepted`, `rules_notes`, `welcome_notes`, `news_frequency`, `news_format`, `meeting_preference`, `handover_preference`, `experience_required`, `specific_expectations`, `home_ambiance`, `languages`, `interests`, `life_pace`.

## B. Profil public GARDIEN

### B1. Ce que voit le visiteur
Hero illustré (L.850-1109), avatar + statut_gardien (novice/confirmé/super, L.944), prénom + FounderBadge + ProBadge + FavoriteButton + note (L.981), ville + tarif indicatif, badges Identité vérifiée / Abonné / Fondateur / Gardien secours (L.1019-1048), TrustScore, AlmaFitGardien, 4 tuiles rapides, CTA Contacter, sous-onglets À propos / Avis / Pratique / Galerie / Confiance (L.1398-1557 desktop, **dupliqués L.1562-1688 mobile ~170 lignes**). Expériences externes, TrustTimeline, badges missions, ReplyTimeBadge.

### B2. Champs sitter — écarts
Tous les champs sitter_profiles pertinents sont rendus. Seul `accept_unsolicited_pitches` n'est pas exposé publiquement (usage serveur uniquement, normal).

### B3. Profil incomplet / nouveau / sans avis
Bien géré : « Nouveau profil » (L.1335), « n'a pas encore rédigé de présentation » (L.1453), onglets Avis / Galerie masqués si vides, stats « Pas encore noté ». `shouldNoindex=true` (L.735) exclut les profils pauvres des moteurs.

## C. Transverse

### C1. Confiance
`identity_verified` lu depuis `public_profiles` (L.352). `completed_sits_count` maintenu par trigger DB. `statut_gardien` via view `profile_reputation`. TrustScore purement client (0-100). Le public reflète bien le vrai statut, sauf que la description owner masquée (A4) dégrade artificiellement la richesse perçue.

### C2. Vie privée — fuites

| Donnée | Chargée | Rendue | Risque |
|---|---|---|---|
| `last_name` | oui (L.353) | jamais | Chargement inutile, moyen |
| `postal_code` | oui (L.353) | injecté en JSON-LD `PostalAddress` (L.795) | CP complet crawlable, moyen (RGPD) |
| `public_profiles.*` | select("*") L.352 | large | À réduire |
| `sitter_gallery.*` | select("*") L.364 | 2 colonnes utilisées | À réduire |
| email, téléphone, adresse exacte | non chargés | — | OK |

`PublicSitDetail.tsx` charge correctement un select restreint (L.92) et n'expose pas le CP en HTML visible.

### C3. États
- Loading : skeleton minimal (L.625-639) — pas de skeleton complet pour les tuiles.
- 404 : `!profile && !ownerProfile` → écran simple (L.641-652).
- **Erreur réseau : PAS de try/catch autour de `load()` → l'exception non catchée laisse `loading=false, profile=null` et affiche « Profil introuvable » pour un profil qui existe** (pattern déjà présent dans PublicSitDetail L.252-303, non repris ici).
- Mobile ≤400px : classes responsive OK.

### C4. Typographie / emojis
- `font-mono` résiduel sur la date de la timeline (`TrustTimeline.tsx:99`) — incongruent.
- Bandes déco avec `fontFamily: 'sans-serif'` inline (L.822, 826) au lieu du token CSS.
- Aucun emoji dans le contenu visible (🐾 uniquement dans le SVG og-profile).

### C5. Bugs, code mort, N+1
- **20 requêtes supabase** réparties sur 3 useEffects, sans `useQuery` (pas de cache, re-fetch à chaque changement de tab).
- `hydrateReviewers` (L.414, L.533) : risque N+1 selon implémentation batch.
- Duplication desktop/mobile des sous-onglets gardien : ~170 lignes (L.1380-1689) → deux sources de vérité.
- Onglet proprio : lightbox absente (hover CSS uniquement) alors que la galerie sitter en a une (L.597-604).
- Annonces owner : select tronqué + pas de lien vers la fiche annonce.

### C6. SEO / partage

| Aspect | État | Verdict |
|---|---|---|
| `<title>` dynamique | L.714-716 (≤60 chars) | OK |
| `<meta description>` | L.726 (≤160 chars) | OK |
| Canonical | passé via `PageMeta` (pas d'`<link canonical>` explicite Helmet) | À vérifier |
| **og:image** | `profile.avatar_url` (L.833) — **edge function `og-profile` NON branchée** | Bloquant partage |
| **`og-profile` edge function** | Retourne `image/svg+xml` (L.174) | **Bloquant : Facebook/LinkedIn/WhatsApp rejettent SVG** |
| JSON-LD Person + Service + AggregateRating | `ProfileSchemaOrg.tsx` | Solide |
| noindex profils pauvres | L.735 | Bonne pratique |

## Tableau Zone | Problème | Sévérité | Correctif

| # | Zone | Problème | Sévérité | Correctif proposé |
|---|---|---|---|---|
| 1 | Owner public | `owner_profiles.description` absent du SELECT (L.368-371) → jamais rendue | **Bloquant** | Ajouter `description` à la liste des colonnes |
| 2 | Owner public | Annonces sans lien vers `/annonces/:id`, select `sits` tronqué (L.514) | Moyen | Ajouter `<Link>` sur chaque carte + `slug` au select |
| 3 | Owner public | 17 champs owner_profiles saisis jamais restitués (règles, welcome_notes, life_pace, langues…) | Moyen | Sélectionner et rendre au moins welcome_notes, rules_notes, languages, life_pace |
| 4 | Owner public | Onglet unique proprio → barre masquée, aucun titre de section | Moyen | Afficher `<h2>Profil Propriétaire</h2>` quand tab unique |
| 5 | Owner public | Galerie proprio sans lightbox (hover CSS seul) | Cosmétique | Réutiliser l'état lightbox existant |
| 6 | Sitter public | Duplication desktop/mobile des sous-onglets (~170 lignes) | Moyen | Extraire `<SitterTabContent>` partagé |
| 7 | Transverse | Pas de try/catch autour de `load()` → « Profil introuvable » sur erreur réseau | **Bloquant** | try/catch + état `loadError` + bouton Réessayer (pattern PublicSitDetail) |
| 8 | Transverse | 20 requêtes supabase sans cache, re-fetch au changement de tab | Moyen | Migrer vers `useQuery` avec `staleTime` |
| 9 | Perf | N+1 potentiel dans `hydrateReviewers` | Moyen | Vérifier batch, sinon `.in()` unique |
| 10 | Privacy | `last_name` chargé mais jamais rendu | Moyen | Retirer du select |
| 11 | Privacy | `postal_code` complet dans JSON-LD `PostalAddress` (L.795) | Moyen (RGPD) | Passer seulement les 2 premiers chiffres ou omettre |
| 12 | Privacy | `public_profiles.*` et `sitter_gallery.*` en `select("*")` | Moyen | Sélects explicites |
| 13 | SEO/partage | `og-profile` retourne `image/svg+xml` — rejeté par FB/LinkedIn/WhatsApp | **Bloquant SEO** | Convertir en PNG (Resvg-wasm ou Deno canvas) |
| 14 | SEO/partage | `og-profile` jamais appelé — og:image = avatar rond | Moyen | Brancher `og-profile?id=<id>` (conditionné à profil riche) |
| 15 | Typo | `font-mono` résiduel dans TrustTimeline.tsx:99 | Cosmétique | Remplacer par `font-body` |
| 16 | Typo | `fontFamily: 'sans-serif'` inline (L.822, 826) au lieu du token | Cosmétique | Utiliser var CSS |
| 17 | UX | Annonces owner ne reprennent pas les corrections récentes (description, owner_message, environments, city) | Moyen | Lien vers fiche annonce (voir #2) |

## Top 5 correctifs prioritaires

1. **Ajouter `description` au SELECT `owner_profiles`** (`PublicSitterProfile.tsx:368-371`). Bug bloquant : la description propriétaire est systématiquement masquée. Une ligne de correctif.
2. **`og-profile` : générer un PNG au lieu d'un SVG** (`supabase/functions/og-profile/index.ts:174`), puis **brancher l'URL comme `og:image`** dans `PublicSitterProfile.tsx:833`. Sans ça, tous les partages sociaux de profils sont dégradés.
3. **try/catch global sur `load()`** dans `PublicSitterProfile` avec état d'erreur + bouton Réessayer. Sinon toute erreur réseau affiche à tort « Profil introuvable ».
4. **Rendre les annonces owner cliquables + enrichir le select `sits`** (city, cover_photo, slug) et lier vers `/annonces/:id`. Permet de restituer les corrections récentes de fiche annonce sans dupliquer le rendu.
5. **Nettoyage privacy** : retirer `last_name` du select profiles, réduire `postal_code` (2 premiers chiffres) dans le JSON-LD, remplacer les `select("*")` sur `public_profiles` et `sitter_gallery` par des sélections explicites.

Ce plan est un audit livrable, aucune modification de code n'a été effectuée.
