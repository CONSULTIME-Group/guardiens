# Audit lecture seule — Alma dashboard / config / avatar

Aucune modification de code. Chemins et lignes ci-dessous.

## 1. Superposition d'icônes dans la topbar mobile

**Localisation** : `src/components/layout/AppLayout.tsx` L53-64.

Contenu du cluster droit (mobile, `md:hidden`) :
```
gap-1 → LanguageSwitcher (compact) · AlmaTopbarButton (h-11 w-11) · MessageBell (h-9 w-9) · NotificationBell (h-9 w-9)
```

**Cause racine (2 problèmes cumulés)** :

1. **Tailles hétérogènes** : `AlmaTopbarButton` (`src/components/ai/alma/AlmaTopbarButton.tsx` L64) impose `h-11 w-11` (44 px, cible WCAG) alors que `MessageBell` L139/155 et `NotificationBell` sont en `h-9 w-9` (36 px). Résultat : l'icône Alma déborde verticalement au-delà de la topbar (`py-2` sur un container ~40 px de hauteur utile) et son cercle hover chevauche visuellement la cloche adjacente.
2. **Badges compteurs superposés** : les badges de non-lu (MessageBell + NotificationBell) sont positionnés `absolute -top-1 -right-1` par rapport à un bouton `w-9`. Avec `gap-1` (4 px) entre les boutons, le badge de la cloche Notifications (à droite) chevauche le coin droit de la cloche Messages (à gauche) dès qu'il apparaît, et l'avatar Alma (plus grand) recouvre le coin gauche de la cloche Messages.

**Fallback Suspense trompeur** : `AppLayout.tsx` L59-63, les fallbacks utilisent `w-9 h-9` pour les cloches mais `w-11 h-11` pour Alma. Après hydratation, la mise en page saute et confirme le mismatch.

**Correctif recommandé** : uniformiser toutes les cibles topbar en `h-10 w-10 rounded-full` (ou `h-11 w-11` partout pour rester WCAG), passer `gap-1` à `gap-2` (8 px) pour dégager les badges, aligner `items-center` (déjà OK) et harmoniser les Suspense fallbacks. Vérifier aussi le z-index des badges (`z-10` sur le span badge suffit).

---

## 2. CTA « Améliorer mon annonce » ne fonctionne pas

**Localisation** : `src/components/ai/alma/WelcomeBackDigest.tsx` L111-118, variante `owner_empty_positive`.

```
actionLabel: "Améliorer mon annonce",
actionHref: "/dashboard",       // ← problème
actionId: "improve_listing",
```

**Cause racine** : `actionHref` pointe vers `/dashboard`, exactement la page où la bulle est affichée (`Dashboard.tsx` L217, `WelcomeBackDigest` monté dans le container `max-w-6xl`). Le clic ne fait rien de perceptible : `react-router` ne navigue pas hors page, le composant reste monté, aucune section « améliorer l'annonce » n'est scrollée ni ouverte. Aucun handler autre que la navigation n'existe (voir rendu du CTA dans `WelcomeBackDigest.tsx`, le bouton exécute juste `navigate(actionHref)`).

L'edge function `improve-sit-description` (`supabase/functions/improve-sit-description/index.ts`) et le composant `ImproveListingButton` (`src/components/ai/ImproveListingButton.tsx`) fonctionnent correctement, mais ils ne sont montés QUE dans le formulaire d'édition (`src/pages/CreateSit.tsx` L980). Depuis la bulle dashboard, aucun chemin n'y mène.

Deux autres CTA du même digest ont le même défaut : `owner_intl` L107-109 (`actionHref: "/dashboard"`) et `owner_first_visit` (à vérifier au-dessus L79 : renvoie aussi vers `/dashboard`). Ce sont des no-op silencieux.

**Correctif racine (avant refonte demandée)** : soit router vers l'édition de la dernière annonce publiée (`/sits/{id}/edit` — récupérer l'id via la même RPC digest), soit remplacer l'action par un scroll vers la carte annonce dans `OwnerDashboard`. Le composant `AlmaSilentSitBubble` (`src/components/ai/alma/AlmaSilentSitBubble.tsx` L113) applique déjà ce pattern (ouvre l'édition) et peut servir de modèle.

---

## 3. Remplacer par « Configurer Alma » avec choix des catégories

### État actuel de la config Alma

- **Fréquence** : stockée dans `profiles.alma_frequency` (enum-like `silent`/`low`/`balanced`/`talkative`), lue par `useAlmaFrequency` (`src/hooks/useAlmaFrequency.ts`), configurée dans `src/pages/Settings.tsx` L387 (section `alma`) + L825-885 (`ALMA_OPTIONS` + `AlmaFrequencySection`). Route : `/parametres` (tab Alma).
- **Filtre par type** : le scheduler client (`src/lib/alma/whisper-scheduler.ts` L20-63) accepte `blacklistedTypes: Set<AlmaWhisperType>` et refuse un whisper si son type y figure. **Mais aucun code n'alimente ce Set depuis les préférences user** : `makeInitialState` est appelé avec une blacklist vide. C'est un crochet prêt, non branché.
- **Prefs email** : `email_preferences` gère les cadences email, aucune colonne côté Alma web.

### Catégories réellement présentes en base (`alma_cultural_facts.fact_type`)

Comptage live :
| fact_type | count |
|---|---|
| home_care_tip | 67 |
| breed_did_you_know | 58 |
| pet_care_tip | 52 |
| animal_humor | 31 |
| usage_nudge | 30 |
| dog_behavior_tip | 25 |
| seasonal_advice | 25 |
| cat_behavior_tip | 23 |
| mutual_aid_tip | 18 |
| city_did_you_know | 5 |
| founder_anecdote | 5 |
| social_stat | 5 |

`usage_nudge` est un cas à part (incitation produit, pas un "conseil"). À exposer ou non selon la stratégie.

### Modèle de stockage proposé

**Option retenue** : nouvelle colonne `profiles.alma_muted_categories text[]` (défaut `'{}'`), mise à jour depuis Settings.

Raisons :
- Colocalise avec `alma_frequency` déjà sur `profiles` (une seule requête).
- Réutilise directement le crochet `blacklistedTypes` du scheduler : `useAlmaFrequency` (ou un hook jumeau `useAlmaCategoryPrefs`) charge le tableau, le passe à `makeInitialState(frequency, muted)` là où c'est instancié.
- RPC serveur `next_alma_cultural_fact` (utilisée par `useAlmaCulturalFact`) : ajouter un paramètre `p_muted_types text[]` et exclure `WHERE fact_type <> ALL(p_muted_types)`. À défaut, filtrer côté client après fetch (moins bien mais tolérable au vu des volumes).

**Alternative** : table `alma_category_preferences(user_id, fact_type, enabled)` — plus normalisée mais surdimensionnée pour ~10 catégories.

### UI cible pour la section Settings

Sous `AlmaFrequencySection` (`Settings.tsx` L848-885), ajouter un bloc « Types de conseils » avec `Checkbox` shadcn par catégorie, groupées :
- Animaux : dog_behavior_tip, cat_behavior_tip, pet_care_tip, breed_did_you_know
- Maison & saison : home_care_tip, seasonal_advice
- Entraide & communauté : mutual_aid_tip, city_did_you_know
- Ton : animal_humor, founder_anecdote, social_stat
- (usage_nudge : séparé, toggle unique « Rappels d'utilisation »)

Toutes cochées par défaut. Décoché → catégorie ajoutée à `alma_muted_categories`.

### CTA depuis le digest

Remplacer L111-118 :
```
actionLabel: "Configurer Alma",
actionHref: "/parametres?tab=alma",
actionId: "configure_alma",
```
`Settings.tsx` lit déjà un tab actif : brancher un `useSearchParams` pour préselectionner `alma` (à vérifier L77 + logique tabs), sinon ancre `#alma`.

---

## 4. Avatar Alma trop petit / peu reconnaissable

### Inventaire des points d'affichage et tailles

| Fichier | Ligne | Taille (px) | Contexte |
|---|---|---|---|
| `src/components/ai/alma/AlmaTopbarButton.tsx` | 69 | **24** | Topbar mobile persistante |
| `src/components/ai/alma/AlmaWhisper.tsx` | 159 | **24** | Bulle whisper flottante |
| `src/components/ai/alma/AlmaBubble.tsx` (variant `inline`) | 79 | **24** | Bulles inline |
| `src/components/ai/alma/AlmaBubble.tsx` (variant `default`) | 79 | **32** | Bulles par défaut |
| `src/components/ai/alma/AlmaBubble.tsx` (variant `sticky-footer`) | 79 | **32** | Footer sticky |
| `src/components/ai/alma/AlmaBubble.tsx` (variant `dashboard`) | 79 | **40** | Dashboard cards |
| `src/components/ai/alma/RepublishAlmaDialog.tsx` | 71 | **32** | Dialog republish |
| `src/components/dashboard/SitDraftFromPrompt.tsx` | 107 | **32 / 24** | Bloc rédaction guidée |
| `src/components/profile/AiSuggestButton.tsx` | (via `size={24}` mappé `h-4 w-4`) | **≈16** | Bouton suggestion profil |
| `src/components/ai/ImproveListingButton.tsx` | (import) | **24** | Bouton améliorer |

Le type `Size = 24 | 32 | 40` (`AlmaAvatar.tsx` L7) plafonne à 40 : impossible d'afficher plus grand sans changer le composant. Or les vraies scènes de premier contact (Onboarding, `useAlmaFirstMeeting`) n'ont jamais Alma en grand.

### Lisibilité du SVG actuel

`src/components/ai/alma/AlmaAvatar.tsx` L15-72. Composition :
- Fond `#FFF6E9` (crème très clair) → contraste très faible avec fond `bg-background` en light mode. En dark mode, cercle crème correct.
- Poil blanc `#FFFFFF` avec contour gris pâle `#E4E1EC` à `strokeWidth 1` : à 24 px, les contours s'affaissent et l'ensemble devient un blob crème indistinct. Les 8 cercles empilés se confondent.
- Yeux/truffe noirs `2B2B2B` : lisibles à partir de 32 px, quasi invisibles à 24 px.
- Nœud coral en haut à droite : à 24 px c'est 2 pixels colorés difficiles à interpréter.

À 24 px (topbar, whisper, boutons), on lit un rond crème avec 3 points noirs : le personnage n'est pas reconnaissable.

### Recos concrètes

1. **Version « pastille »** dédiée aux petites tailles (≤ 24 px) : fond primaire plein (`bg-primary` ou coral), silhouette blanche simplifiée (2 puffs + 2 yeux + truffe), contour plus épais (`strokeWidth 2`). Meilleur contraste immédiat.
2. **Passer la topbar à 28-32 px** (`AlmaTopbarButton.tsx` L69, bouton reste 44 px pour la cible tap) : gain de lisibilité gratuit.
3. **Élargir le type** `Size` à `24 | 32 | 40 | 56 | 72 | 96` pour permettre un « grand Alma » aux moments de premier contact (`useAlmaFirstMeeting`, onboarding, dialogs d'accueil).
4. **Bord/halo** : ajouter un `ring-2 ring-primary/30` autour de l'avatar dans la topbar pour le détacher du fond.
5. **Contours** : passer `strokeWidth` de 1 à 1.5 dans le SVG et assombrir légèrement `#E4E1EC` → `#B8B0C4` pour que le contour soit visible en petit.
6. **Illustration dédiée** (option produit) : si le budget graphique le permet, remplacer le SVG géométrique par une illustration gouache cohérente avec la charte "dessins sur-mesure" (mémoire projet). L'actuel SVG procédural passe pour un pictogramme, pas un personnage.

---

## Tableau récapitulatif

| # | Zone | Problème | Sévérité | Correctif |
|---|---|---|---|---|
| 1 | AppLayout topbar mobile L53-64 | Tailles hétérogènes 44 vs 36 → chevauchement visuel et badges qui se superposent | Bloquant | Uniformiser à `h-10 w-10`, `gap-2`, harmoniser fallbacks Suspense |
| 2 | WelcomeBackDigest L111-118 (et L104-109) | CTA `href="/dashboard"` sur la page elle-même → no-op | Bloquant | Router vers `/sits/{id}/edit` OU remplacer par « Configurer Alma » (voir #3) |
| 3 | Settings.tsx L820-885 + scheduler | Aucune sélection par catégorie exposée, crochet `blacklistedTypes` inutilisé | Moyen | Ajouter `profiles.alma_muted_categories text[]`, section checkboxes, brancher scheduler + RPC |
| 4a | AlmaAvatar.tsx (24 px partout) | Personnage illisible à 24 px | Moyen | Version pastille pour petits formats + passer topbar à 28-32 px |
| 4b | AlmaAvatar.tsx type Size | Impossible d'afficher grand | Moyen | Étendre le type + prévoir un `size={72}` dans les premiers contacts |
| 4c | SVG contours | Contour `#E4E1EC` à 1 px invisible en petit | Cosmétique | `strokeWidth 1.5`, contour plus foncé |

## Ordre de priorité recommandé

1. **P0 — CTA cassé** (#2) : bloque une promesse produit. Choisir avant #3 si on route vers l'édition OU on bascule sur "Configurer Alma".
2. **P0 — Superposition topbar** (#1) : régression visuelle sur mobile, visible sur toutes les pages authentifiées.
3. **P1 — Configurer Alma par catégories** (#3) : refonte demandée, se pose en réponse à #2 et débloque un vrai levier de personnalisation.
4. **P1 — Avatar reconnaissable** (#4) : combiner passage topbar à 32 px + version pastille + extension `Size` pour un grand Alma sur premier contact. Illustration gouache dédiée en P2 si budget.

Aucune modification de code effectuée. Confirmez lesquels de ces points vous voulez que j'implémente et dans quel ordre.
