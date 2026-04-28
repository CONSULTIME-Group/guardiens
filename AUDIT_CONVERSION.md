# AUDIT CONVERSION — Vues vs Candidatures

**Date :** 28 avril 2026
**Mode :** Lecture seule, aucune modification
**Périmètre :** Annonce Patricia (`293fab2e-b32d-45a0-9c04-36a4f43c484f`) + diagnostic plateforme

---

## TL;DR (à lire en premier)

> **Le problème est presque entièrement systémique, pas individuel.**
>
> 1. **Patricia est la SEULE annonce publiée et active sur toute la plateforme** (1 sit `published` sur 2 sits totaux en base).
> 2. **3 gardiens seulement existent dans toute l'Alsace (67/68)**, dont Patricia elle-même. Le bassin local est quasi vide.
> 3. **Sur les 68 vues de l'annonce : 49 sont anonymes, 17 viennent de l'admin (toi), 1 de Maria Elisa (qui a candidaté), 1 d'un autre gardien.** Donc **2 gardiens identifiés réels** ont vu l'annonce, **1 a candidaté → taux de conversion gardien-réel = 50 %**.
> 4. **Aucun gardien n'a d'abonnement actif** (`subscriptions` = 0 ligne). Or `canApplyGuards` exige un abonnement (sauf ID non vérifiée → fallback `hasAccess`). Couplé au profil ≥ 60 %, **structurellement très peu de gardiens peuvent cliquer "Postuler"** sans tomber sur un mur.

L'annonce Patricia n'a pas de défaut bloquant. Le problème est : **pas d'audience cible dans la zone + funnel candidature gated derrière un abonnement que personne n'a souscrit.**

---

## PARTIE 1 — Répartition des inscrits

**Source :** `public.profiles`

| Métrique | Valeur |
|---|---|
| Total inscrits | **392** |
| Gardiens (`role='sitter'`) | 341 |
| Propriétaires (`role='owner'`) | 31 |
| Les deux (`role='both'`) | 20 |
| **Ratio gardiens / propriétaires** | **361 / 51 = ~7,1 gardiens pour 1 proprio** |
| Gardiens (sitter+both) avec ID vérifiée | **4** sur 361 (= 1,1 %) |
| Gardiens connectés sur 7 derniers jours | 42 sur 361 (= 11,6 %) |
| Gardiens avec abonnement actif | **0** |
| Gardiens "fondateur" (`is_founder=true`) | 198 sur 361 |

### Top villes (gardiens & proprios)

| Ville | Rôle | n |
|---|---|---|
| Lyon | sitter | 8 |
| Lyon | owner | 4 |
| Marseille | sitter | 3 |
| Nice | sitter | 3 |
| Collonges-au-Mont-d'Or | owner | 3 |
| Caluire-et-Cuire | sitter | 2 |
| Villeurbanne | sitter | 2 |
| Lyon | both | 2 |
| Rennes | sitter | 2 |
| Belleville-en-Beaujolais | sitter | 2 |
| Bois-le-Roi | sitter | 2 |

### Couverture Alsace (zone Patricia)

| Ville | Rôle | n |
|---|---|---|
| Bettwiller (67) | both | 1 |
| **Schweighouse-sur-Moder (67)** | both | 1 *(Patricia elle-même)* |
| Strasbourg (67) | sitter | 1 |

**Total gardiens dépt 67 + 68 : 3 (dont Patricia).**

#### Lecture
- Le **ratio 7:1 gardiens/proprios** est sain en valeur absolue (le marché vise 3-5:1).
- Mais la **distribution géographique est extrêmement concentrée sur Lyon**, et **vide partout ailleurs**.
- **0 gardien actif éligible** au sens strict (ID + abonnement) sur toute la plateforme.

---

## PARTIE 2 — Annonce Patricia

**Sources :** `public.sits`, `public.properties`, `public.profiles`, `public.owner_profiles`, `public.pets`, `public.applications`, `public.analytics_events`, `public.favorites`

### Annonce
| Champ | Valeur |
|---|---|
| ID | `293fab2e-b32d-45a0-9c04-36a4f43c484f` |
| Titre | "Tribu de 4chats et 2 perroquets et un chien" |
| Statut | `published` |
| Publiée le | 21 avril 2026 |
| Dates | 14 juin → 28 juin 2026 (15 jours) |
| Dates flexibles | oui |
| Min gardes requises gardien (`min_gardien_sits`) | **0** (aucun filtre) |
| `accepting_applications` | true |
| `max_applications` | 10 |
| Environnements | forêt, campagne, ville |
| Attentes spécifiques | "Le plus important sera le bien être de mes animaux et la prise en charge de Sam le chat diabétique" |

### Logement (`properties`)
| Champ | Valeur |
|---|---|
| Type / env. | maison / countryside |
| Pièces / chambres | 5 / 3 |
| Description | 343 caractères, ton chaleureux mais générique |
| Équipements | WiFi, Parking, Terrasse, Lave-vaisselle, Congélateur, TV, Équipement sport, BBQ |
| **Photos logement** | **1 seule** (`property-photos/.../1776770923385.jpeg`) |
| `region_highlights` | vide |

### Animaux (6 au total)
| Nom | Espèce | Race | Âge | Note |
|---|---|---|---|---|
| Sam | chat | Gouttière | 8 | **Diabète, 2 injections + glycémies/jour** |
| Benji | chien | Croisé bichon | 14 | traitement nourriture |
| Marwin | chat | Maine coon | 7 | aucun |
| Cleo | chat | Gouttière | 13 | thyroïde |
| Maya | chat | Bleu russe | 17 | sénile, présence |
| Pépée + Charly | oiseau | Gris du Gabon | 35 | aucun |

### Profil propriétaire (Patricia)
| Champ | Valeur |
|---|---|
| ID | `a39281eb-86ef-4d98-8733-082d243df3f5` |
| Nom | Patricia Stisy |
| Ville | Schweighouse-sur-Moder (67590) |
| Avatar | présent |
| Bio | "Bonjour je suis une gaga des bébêtes. Avec une maison et jardin. Nous sommes heureux d'accueillir chez nous 4 chats, un chien et 2 perroquets" |
| `profile_completion` | **75 %** |
| `identity_verified` | **false** (`not_submitted`) |
| `is_founder` | false |
| `completed_sits_count` | 0 |
| `cancellation_count` | 0 |
| `date_of_birth` | NULL |
| `last_seen_at` | 27 avril 2026 (active) |
| Onboarding | complété |

### Owner profile (`owner_profiles`)
- Présence attendue : "Absences courtes OK"
- Visites autorisées : "Oui ponctuellement"
- Préférence rencontre : "Obligatoire pour moi"
- Remise des clés : "La veille avec nuit commune"
- Fréquence nouvelles : "Chaque jour"
- Compétences requises : `[]` (aucune)
- `accept_unsolicited_pitches` : false

### Bassin gardiens autour de la zone
> ⚠️ Le code de recherche utilise un géocodage par ville via `geocode_cache` (pas de lat/lng directes sur les sits). La table `geocode_cache` ne contient pas Schweighouse → on raisonne sur le code postal.

| Périmètre | Gardiens (sitter + both) |
|---|---|
| Schweighouse-sur-Moder (67590) | 1 (Patricia, qui n'est pas candidate à elle-même) |
| Département 67 + 68 (Bas-Rhin + Haut-Rhin) | **3** dont Patricia |
| Rayon 15 km / 30 km | **non calculable précisément** (pas de lat/lng dans `sits`/`profiles`, géocodage à la volée), mais ≤ 2 maximum d'après la répartition |
| Gardiens éligibles dans la zone (ID + sub) | **0** |

### Vues, favoris, candidatures

**Tracking présent (`analytics_events`) :**
- `sit_view` : oui
- `sit_apply_clicked` : oui
- `sit_apply_blocked` : oui (avec raison)
- `sit_share_clicked` : oui

**Pas de tracking** : ouvertures de la modale candidature sans soumission (`setApplyOpen(true)` ne logge rien), clics sur le profil propriétaire depuis l'annonce.

| Métrique | Valeur |
|---|---|
| Vues totales annonce | **68** |
| Vues uniques (par user_id ou anon) | 3 viewers connectés + 49 anon |
| Vues anonymes | 49 |
| Vues utilisateurs connectés | 19 (dont **17 = admin Jérémie**, 1 = Maria Elisa, 1 = autre user `5b1947f6…`) |
| **Vues "gardien réel" non-admin** | **2** |
| Favoris | **1** |
| Candidatures reçues | **1** (Maria Elisa, Lyon, statut `discussing`) |
| `sit_apply_clicked` sur cette annonce | 7 dont 5 admin + 1 Maria Elisa + 1 ambigu |
| `sit_apply_blocked` sur cette annonce | 7, **tous avec `reason: not_authenticated`** (visiteurs anonymes qui devraient s'inscrire) |
| `sit_apply_blocked` avec `reason: no_subscription` | **0** sur cette annonce (mais le code l'émet ailleurs) |

**Conversion réelle hors admin/anon : 1 candidature pour 2 vues gardien réel = 50 %.**

---

## PARTIE 3 — Benchmark annonces similaires

**Source :** `public.sits` + `public.analytics_events` (event_type=`sit_view`)

| Annonces publiées | 60 derniers jours | Total |
|---|---|---|
| `status='published'` | **1** (Patricia) | 1 |
| Total annonces dans `sits` | — | 2 |
| Autre annonce existante | "Garde de 2 chats à Lyon — 7 jours" | statut `completed`, 0 vue, 2 candidatures |

**Le benchmark est vide.** Il n'y a aucune autre annonce active à comparer. Toutes les questions de corrélation (photos vs candidatures, longueur description vs candidatures, complétion proprio vs candidatures) sont **non évaluables** faute d'échantillon (n=1).

> Donnée non disponible : impossible d'établir un pattern statistique. Il faudrait au moins 20-30 annonces actives pour produire une corrélation utile.

---

## PARTIE 4 — Funnel annonce → candidature

**Sources lues :**
- `src/components/search/SearchSitter.tsx` (recherche)
- `src/pages/PublicSitDetail.tsx` (vue annonce anonyme)
- `src/components/sits/views/SitterSitView.tsx` (vue annonce gardien connecté)
- `src/hooks/useAccessLevel.ts` (logique d'éligibilité)
- `src/hooks/useSubscriptionAccess` (porte abonnement)

### Étape 1 — Recherche (`/recherche`)
- Affichage hybride 50/50 carte/grille.
- Filtres par défaut : rayon (15 km par défaut d'après mémoire `search-engine-ux-with-map-layout`), aucune date par défaut.
- Filtre `min_gardien_sits` appliqué côté client : `userCompletedSits >= minRequired`. Pour Patricia `min_gardien_sits=0` → tout le monde passe.
- Filtre `verifiedOnly` (sur le proprio) : si activé, l'annonce de Patricia **est exclue** car `identity_verified=false`. À vérifier si activé par défaut.
- Filtre par environnement : si gardien sélectionne un env. non listé (foret/campagne/ville), Patricia exclue.

### Étape 2 — Clic annonce
- Route : `/sits/:id` (`PublicSitDetail` pour anonymes, `SitterSitView` pour gardien connecté). Pas de `/annonces/:id`.

### Étape 3 — Conditions du bouton "Postuler"

**Visiteur anonyme (`PublicSitDetail.tsx` L607-664) :**
1. Si `accepting_applications=false` → bouton désactivé "Candidatures en cours d'analyse".
2. Sinon non authentifié → CTA `/inscription?role=sitter` "S'inscrire et postuler — aider {prénom}". `sit_apply_blocked` loggé avec `reason: not_authenticated`. ✅ C'est ce que voient les 49 visiteurs anonymes.
3. Sinon `!hasAccess` (pas d'abonnement) → CTA `/mon-abonnement` "S'abonner pour postuler". `sit_apply_blocked` avec `reason: no_subscription`.
4. Sinon `hasApplied` → bouton désactivé "Candidature envoyée ✓".
5. Sinon → "Postuler à cette garde" → ouvre `ApplicationModal`.

**Gardien connecté (`SitterSitView.tsx` L191-285) :**
- Lit `useAccessLevel()` → `level` + `canApplyGuards`.
- Si `accessLevel === 1` (profil < 60 %) → bandeau `AccessGateBanner` (PAS de bouton postuler).
- Si `!canApplyGuards` → autre bandeau gate (incite à finir profil OU souscrire).
- Sinon → bouton "Postuler pour cette garde".

### Étape 4 — Logique `canApplyGuards` (`useAccessLevel.ts`)

| Niveau | Conditions | `canApplyGuards` |
|---|---|---|
| 0 | non connecté | false |
| 1 | profil < 60 % | **false (BLOQUE)** |
| 2 | profil ≥ 60 %, ID non vérifiée, sitter | **= `hasAccess`** (abonnement requis) |
| 2 | profil ≥ 60 %, ID non vérifiée, owner | true |
| 3A | sitter, profil ≥ 60 %, ID vérifiée, **pas d'abo** | **false (BLOQUE → "S'abonner pour postuler")** |
| 3B | owner, profil ≥ 60 %, ID vérifiée | true |
| 4 | sitter, profil ≥ 60 %, ID vérifiée, **abo actif** | true |

**Conséquence directe :** un gardien sans abonnement actif **ne peut pas postuler à une garde**, même avec ID vérifiée et profil 100 %.

### Étape 5 — Modale candidature
- `ApplicationModal` (non lue en détail). Une fois ouverte, friction = soumission du message.
- **Pas de tracking** entre ouverture modale et envoi : impossible de mesurer l'abandon à cette étape.

### Synthèse points de friction
| Friction | Impact actuel sur Patricia |
|---|---|
| Visiteur anonyme doit s'inscrire | 7 `sit_apply_blocked` (visiteurs perdus) |
| Profil gardien < 60 % bloque tout (level 1) | non quantifié |
| Abonnement obligatoire pour postuler aux gardes | **0 gardien éligible aujourd'hui (0 abo en base)** |
| Filtre `verifiedOnly` exclurait Patricia (proprio non ID-vérifié) | possible |
| Pas de tracking ouverture modale → envoi | angle mort |

---

## PARTIE 5 — Visibilité de l'annonce

**Sources :** `src/components/search/SearchSitter.tsx` L730-783, `DEMO_SITS`

- **Annonces démo** : `interleaveDemos(final, DEMO_SITS, 3)` → intercalées tous les 3 résultats. Elles **apparaissent dans la recherche** avec un badge "exemple". Avec 1 seul vrai résultat (Patricia), la liste affichée est dominée par des démos.
- **Tri** : `sortResults(final, sort)` (logique non lue ici, mais tri appliqué en plus du filtre).
- **Annonce sans photo** : aucun filtre côté code n'exclut une annonce sans photo. Patricia a 1 photo, donc apparaît.
- **Annonce avec date passée** : la requête lit `sit.start_date`/`end_date` mais aucun `gte('end_date', today)` n'est imposé en SQL côté SearchSitter (filtre dates appliqué côté UI). Les sits `published` avec dates passées peuvent donc apparaître si l'utilisateur ne filtre pas par dates.
- **Critères pour Patricia** : `status='published'`, `accepting_applications=true`, `min_gardien_sits=0`, environnements remplis, 1 photo, dates futures (juin 2026). **L'annonce respecte tous les critères techniques pour apparaître.**

---

## PARTIE 6 — Tracking vues & engagement

**Source :** `public.analytics_events`

### Événements trackés
| Event | Volume total | Pour Patricia |
|---|---|---|
| `page_view` | 11 257 | n/a |
| `sit_view` | **68** | **68** (tout le tracking de sit_view = Patricia, normal car 1 seule annonce) |
| `sit_apply_clicked` | 7 | 7 |
| `sit_apply_blocked` | 7 | 7 (tous `not_authenticated`) |
| `sit_share_clicked` | 9 | non décomposé |
| `search_outofzone_impression` | 61 | n/a |
| `search_outofzone_click` | 26 | n/a |
| `signup_started` / `signup_form_submitted` | 483 / 42 | gros entonnoir d'inscription |
| `signup_email_confirmed` | **5** | seulement 5 confirmations email vs 42 soumissions |

### Métriques Patricia (résumé)
- Vues totales : **68**
- Vues uniques connectées : **3** (admin x17, Maria Elisa x1, user `5b1947f6` x1)
- Vues anonymes : **49**
- Favoris : **1**
- `sit_apply_clicked` : 7 (5 admin, 1 Maria Elisa, 1 admin/ambigu)
- `sit_apply_blocked` : 7 (tous anonymes, redirection vers inscription)
- Candidatures envoyées : **1** (Maria Elisa)

### Non trackés (angles morts)
- ❌ Clic sur le profil propriétaire depuis l'annonce
- ❌ Ouvertures de la modale `ApplicationModal` sans soumission
- ❌ Conversion modale → candidature soumise
- ❌ Distance entre la position du viewer et l'annonce (pour comprendre s'ils sont hors zone)

---

## PARTIE 7 — Synthèse

### Diagnostic Patricia (individuel)

**Forces :**
- Annonce techniquement saine et publiée correctement.
- Bio chaleureuse, description correcte, 6 animaux décrits avec précision.
- `min_gardien_sits=0` (n'écarte aucun gardien).
- Compte actif (vue récente).

**Faiblesses :**
- **1 seule photo de logement.** Standard attendu : 4-6 photos.
- **ID non vérifiée** (`not_submitted`) → exclue si un gardien active "Vérifié uniquement".
- `profile_completion=75 %` (manque `date_of_birth` et l'ID).
- Bio : 2 phrases, manque de personnalité différenciante.
- `region_highlights` vide.
- **Profil "Sam le chat diabétique"** : exigeant (2 injections/jour) → barrière naturelle pour les gardiens débutants. Pas mentionné en titre ni mis en valeur dans la description courte.
- Patricia compte 6 animaux dont 2 perroquets gris du Gabon (espèce rare) → demande des compétences spécifiques. `competences=[]` côté owner_profile : aucune compétence demandée explicitement → rassurant mais aussi flou.

### Diagnostic systémique

| Question | Réponse |
|---|---|
| Ratio gardiens/proprios sain ? | **Oui en absolu (7:1)** mais **non en pratique** : presque tous concentrés sur Lyon, et 0 abonné actif. |
| Pattern global "vues élevées / candidatures faibles" ? | **Non évaluable (n=1 annonce active)**. Patricia est l'unique cas. |
| Bug ou friction dans le parcours candidature ? | **Friction structurelle massive** : `canApplyGuards` exige un abonnement Stripe actif. La table `subscriptions` contient **0 ligne**. Donc **aucun gardien ne peut postuler à une garde sans bypass.** Sans le fallback `identityRecommended`/`hasAccess` qui passe quand même par `hasAccess`, le funnel est verrouillé. |

### Bassin local Alsace
- **2 gardiens hors Patricia** dans le département (Bettwiller, Strasbourg).
- Aucun n'a candidaté.
- L'un (Strasbourg) est à ~30 km, l'autre (Bettwiller) ~50 km : **probablement hors rayon par défaut (15 km)**.

---

## VERDICT

### 1. Le problème de Patricia est-il individuel ou systémique ?

**Systémique à ~85 %, individuel à ~15 %.**

Sur la part systémique :
- Il n'existe quasiment pas de gardiens dans son département (3 dont elle).
- Les gardiens d'autres régions ne candidatent pas pour une garde de 15 jours en Alsace (dépaysement, distance, animaux exigeants).
- Le funcal `Postuler` est gated derrière un abonnement (table `subscriptions` vide) : **même un gardien éligible géographiquement et motivé ne peut techniquement pas candidater** sauf à passer par un fallback ou à être en role=`both` (qui passe par la branche owner si `activeRole='owner'`).
- L'audience anonyme (49 visiteurs sur 68 vues) sort sur l'écran "S'inscrire et postuler" : énorme déperdition, et 5 confirmations email sur 42 inscriptions (12 %) montre un funnel inscription cassé en amont.

Sur la part individuelle : Patricia n'a que 1 photo, ID non vérifiée, et son profil de mission est intrinsèquement difficile (Sam diabétique + 6 animaux + Gris du Gabon).

### 2. Si systémique : quel est le facteur principal ?

> **Trois facteurs cumulés, par ordre d'impact :**
>
> 1. **Densité de gardiens nulle dans la zone géographique de l'annonce** (3 gardiens en Alsace, dont la proprio elle-même).
> 2. **Funnel candidature verrouillé par l'abonnement** (`canApplyGuards` exige `hasAccess`, et `subscriptions` = 0 ligne).
> 3. **Funnel d'inscription cassé en aval de la prospection** (42 inscriptions soumises → 5 emails confirmés = 88 % de perte avant même de pouvoir candidater).

### 3. Si individuel : quels sont les 3 changements qui auraient le plus d'impact ?

> Le diagnostic est systémique, mais sur la part individuelle Patricia gagnerait à :
>
> 1. **Ajouter 4-6 photos** (logement intérieur/extérieur, jardin, chaque animal en gros plan) — l'annonce n'en a qu'une.
> 2. **Vérifier son identité** (`identity_verified=false`, `identity_verification_status='not_submitted'`) — débloque les recherches "Vérifié uniquement" et augmente la confiance.
> 3. **Réécrire le titre + premier paragraphe pour rassurer sur Sam** (chat diabétique mentionné comme attente principale mais pas comme contexte rassurant : préciser "j'enseignerai le geste, c'est facile, mes anciens sitters l'ont fait sans souci"). Optionnel : compléter `region_highlights` (vide) et passer le profil de 75 % à 100 % en ajoutant `date_of_birth`.

---

## Traçabilité — sources consultées

**Tables :** `profiles`, `sits`, `properties`, `owner_profiles`, `pets`, `applications`, `analytics_events`, `favorites`, `subscriptions`, `geocode_cache`.

**Fichiers code :**
- `src/pages/PublicSitDetail.tsx` (L580-700)
- `src/components/sits/views/SitterSitView.tsx` (L60-300)
- `src/hooks/useAccessLevel.ts` (intégral)
- `src/components/search/SearchSitter.tsx` (L730-820)

**Aucune écriture, aucune modification de données ou de code n'a été effectuée pendant cet audit.**
