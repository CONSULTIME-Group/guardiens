## Audit lecture seule, dépôt d'annonce owner

Aucune modification de code. Diagnostic + recommandations.

---

### Localisation

| Rôle | Fichier | Lignes clés |
|---|---|---|
| Page de création | `src/pages/CreateSit.tsx` | 1550 L, orchestrateur complet |
| Étapes formulaire | même fichier | 793 (Step 0), 1046 (Step 1), 1155 (Step 2) |
| Concierge IA | `src/components/dashboard/SitDraftFromPrompt.tsx` + edge `supabase/functions/draft-sit-from-prompt/index.ts` | proposition de brouillon depuis 1 phrase |
| Aperçu avant publication | `src/components/sits/owner/AnnouncementPreviewDialog.tsx` | 188 L |
| Reprise de brouillon | `src/components/dashboard/DraftResumeCard.tsx` | dashboard owner |
| Fiche publique (visiteur) | `src/pages/PublicSitDetail.tsx` + `src/components/sits/PublicSitView.tsx` | 788 L de rendu |
| Fiche owner (post-publish, `/sits/:id`) | `src/pages/SitDetail.tsx` → `src/components/sits/views/OwnerSitView.tsx` + `SitImmersiveContent.tsx` | rendu immersif |

---

### 1. Deux styles d'écriture : diagnostic

**C'est les DEUX, typographique + éditorial.**

**Typographique (rupture principale, spectaculaire) :**
- `CreateSit.tsx:1018` — le textarea « Une journée type » est stylé `font-mono text-[13px]`, seule zone du formulaire en **monospace**. Tous les autres champs (titre, description, mot de vous) sont en Outfit sans-serif. Le propriétaire tape la routine « comme du code », puis voit son rendu en serif/sans → sensation d'incohérence garantie.
- `SitDraftFromPrompt.tsx:74-79` — le titre du composant utilise `font-serif` (défaut Tailwind, pas `font-heading` = Playfair). Deux voies vers du serif coexistent, avec léger différentiel visuel.
- **Aperçu vs publication** (poids typographique) :
  - Preview (`AnnouncementPreviewDialog.tsx:151, 158, 165`) : corps en `text-sm`.
  - Public (`PublicSitView.tsx:261, 293, 446`) : corps en `text-base` pour `specific_expectations` MAIS `text-lg` pour `daily_routine` et `property.description`. Trois tailles différentes pour trois blocs de texte adjacents → sensation de rendu « bricolé ».
- Emojis dans les labels d'espèces (`CreateSit.tsx:87-91`, `AnnouncementPreviewDialog.tsx:41-45`) alors que la mémoire projet interdit emoji dans le contenu.

**Éditorial :**
- La concierge IA génère 60 à 900 caractères par champ (`specific_expectations`, `daily_routine`, `owner_message`), toutes textes soignés en vouvoiement chaleureux. Les libellés/placeholders du formulaire sont eux en registre « produit » ultra concis. Le contraste entre un `owner_message` IA de 120 mots ciselé et le placeholder « Ex : on confie nos animaux à un membre de confiance… » crée l'impression que **l'annonce a été écrite par deux personnes**.
- `PublicSitPitch.tsx` (bandeau anon) parle « logement offert / changement de décor / animaux à câliner » registre acquisition, tandis que le corps parle « proposé par [prénom] / vous pouvez postuler » registre transactionnel. Deux voix marketing coexistent sur la page publique.
- Vouvoiement respecté globalement, aucune fuite tutoiement détectée.

**Conclusion :** le problème perçu est **d'abord typographique** (`font-mono` sur la routine + trois tailles de corps de texte sur la fiche publique), **puis éditorial** (voix IA riche vs voix produit sèche). Prioriser le fix typo.

---

### 2. Restitution de l'offre publiée : état

Champs saisis dans `CreateSit` et leur restitution :

| Champ saisi | Preview dialog | Public `/annonces/:id` | Owner `/sits/:id` |
|---|---|---|---|
| `title` | oui | oui | oui |
| `start_date`/`end_date` | oui + flexibles | oui | oui |
| `flexible_dates` | oui (mention italique) | non affiché explicitement | oui |
| `city`/`country` | oui | partiellement (utilise owner.city, pas sit.city) | oui |
| `specific_expectations` | oui | oui `text-base` | oui |
| `daily_routine` | oui `text-sm` | oui `text-lg` | oui |
| `owner_message` | oui `italic` | **BUG : masqué si `specific_expectations` rempli** (`PublicSitView.tsx:262, 270` : opérateur `\|\|`, un seul des deux s'affiche) | à vérifier |
| `cover_photo_url` | oui | oui via SitHero | oui |
| `open_to` | non affiché | oui (`.451`) | oui |
| `environments` | oui (comma-separated) | **non affiché sur `PublicSitView`** (utilisé par `SitImmersiveContent` sitter uniquement) | oui |
| `min_gardien_sits` | non affiché | non affiché | oui |
| `max_applications` | non affiché | non affiché (compteur owner uniquement) | oui |
| `is_urgent` | oui badge | oui badge | oui |
| `pets` (depuis profil) | oui | oui riche | oui |

**Bugs de mapping identifiés :**
- **BLOQUANT UX** — `PublicSitView.tsx:262` : `{sit.specific_expectations || sit.owner_message}` avec OR logique. Le message personnel du propriétaire est **jamais visible** sur la fiche publique si la description est remplie. C'est le champ « touche humaine » qui disparaît.
- **MOYEN** — `environments` saisi puis absent de `PublicSitView` (visible seulement dans le rendu sitter authentifié `SitImmersiveContent.tsx:68`). Le visiteur ne voit pas si l'annonce est à la campagne, en montagne, etc.
- **MOYEN** — `open_to` (« Familles / Solo / Couples / Retraités ») non affiché dans la preview alors que présent en public. L'owner ne voit pas dans l'aperçu ce que le sitter verra.
- **MOYEN** — `flexible_dates` sans indication visible sur `PublicSitView` (seulement dans preview et owner view).
- **COSMÉTIQUE** — trois tailles de corps (`text-sm` preview, `text-base` puis `text-lg` public) donnent l'impression d'un rendu incomplet.
- **COSMÉTIQUE** — la ville de la garde (`sit.city`) est ignorée en public au profit de `owner.city` (`PublicSitView.tsx:147`). Owner qui a saisi une résidence secondaire à Bruxelles verra Lyon (sa ville profil) en fiche.

---

### 3. Réutilisation profil pour la rédaction

**Réutilisé aujourd'hui :**
- `properties` (type, environnement, équipements, pièces, photos) → affiché dans SummaryCard (`CreateSit.tsx:1227`) + photos utilisées comme galerie de l'annonce.
- `pets` → affichés en résumé (`.1284`) + utilisés dans `buildSuggestedTitle` (`.579`) et le contexte passé à `ImproveListingButton` (`.960`).
- `owner_gallery` → alimente `ownerPhotos`, sert au picker de cover photo.
- `profiles.city` → sert de placeholder ville, transmise à la concierge IA.
- `owner_profiles.environments` → pré-remplit `sitEnvironments` si vide (`.434`).
- `owner_profiles.preferred_sitter_types`, `presence_expected`, `visits_allowed`, `overnight_guest`, `rules_notes`, `meeting_preference`, `handover_preference`, `welcome_notes`, `news_frequency`, `news_format` → **affichés en récap non éditable dans `<details>` à l'étape 2, mais jamais utilisés pour amorcer les champs éditables**.

**Angles morts (non réutilisé pour aider à rédiger) :**
1. **`profiles.bio`** — la biographie du propriétaire n'est jamais lue. C'est pourtant le meilleur input pour amorcer `owner_message` (« Un mot de vous »).
2. **`owner_profile.welcome_notes`** — texte d'accueil déjà rédigé par l'owner, jamais utilisé comme brouillon d'`owner_message`.
3. **`owner_profile.rules_notes` + `presence_expected` + `visits_allowed`** — matière première évidente pour amorcer `specific_expectations` (attentes gardien).
4. **`pets.character`, `activity_level`, `walk_duration`, `alone_duration`, `medication`, `food`, `special_needs`** — données factuelles parfaites pour générer un `daily_routine` de base sans IA (matin/midi/soir déduits des durées).
5. **`owner_profile.competences`** — jamais exposé.
6. **Titre suggéré** — n'inclut pas l'environnement (« à la campagne ») ni la race si un seul chien. Amélioration possible sans IA.
7. **Concierge IA** — l'edge `draft-sit-from-prompt` lit UNIQUEMENT `profile.city` et `first_name` (index.ts:57). Elle ignore la bio, les pets, la property, le owner_profile. Le brouillon est donc générique alors que la moitié du contexte est déjà en base. **Angle mort majeur.**
8. **Photos animaux** — pas mises en avant dans le picker de cover, seulement photos de logement.

---

### 4. Équilibre simple / rapide / complet

- **3 étapes**, stepper sticky top (`CreateSit.tsx:136`). Bien.
- **Champs bloquants réels pour publier** (`.548-557`) : profil ≥ 40 %, property existante, titre, dates cohérentes, description ≥ 150 caractères, ≥ 1 photo. Six blockers → raisonnable.
- **Temps estimé première annonce** : 8-12 minutes en manuel avec description de 150 caractères ; 2-3 minutes via concierge IA + relecture. Correct.
- **Sentiment de complétude/sérieux :** stepper + auto-save + label brouillon + aperçu + récap depuis profil → bon niveau. MAIS le récap profil est dans un `<details>` fermé par défaut à l'étape 2 (`.1221`), le propriétaire peut ne jamais le voir → l'aspect « votre profil enrichit l'annonce » est invisible.
- **Frictions :**
  - Le choix binaire home/away en step 0 (`.797-853`) est correct mais le clic « Ailleurs » redirige en 1,2 s sans annuler possible → confusion si mis-clic.
  - Nudge profil < 60 % (`.781`) puis blocker < 40 % (`.549`) : deux seuils, deux messages → clarifier.
  - Champ « Journée type » en monospace décourage (cf. §1).
  - « Un mot de vous » = optionnel, placeholder plein d'idées, mais l'utilisateur qui le remplit ne le voit pas rendu en public (cf. bug §2).
  - `max_applications` à 10 par défaut sans explication de l'impact.
- **Simplification possible sans perdre la complétude :** Step 2 « Préférences » (expérience + max candidatures + récap profil) pourrait fusionner avec Step 1 → 2 étapes au lieu de 3. Le récap profil devrait passer en « aside sticky » persistant plutôt qu'en `<details>` fermé.

---

### 5. Points non couverts au premier audit

- **Cohérence photos** : owner peut avoir photos dans `owner_gallery` (galerie perso) ET `properties.photos` (logement). CreateSit picker n'utilise que `owner_gallery` (`.334`). Le rendu public affiche `property.photos` en priorité (`PublicSitView.tsx:143`). **Deux sources photo différentes entre saisie et rendu.**
- **Aperçu avant publication** : disponible uniquement desktop (`CreateSit.tsx:1409` `hidden sm:inline-flex`). Owner mobile ne peut jamais voir l'aperçu → risque de mauvaise surprise post-publish.
- **Modération** : `moderateContent` appelé sur `title + specific_expectations + owner_message + daily_routine` (`.604`). OK.
- **Accessibilité** : labels associés (`htmlFor`), `sr-only`, focus visibles. Bon. MAIS le stepper est cliquable seulement pour les étapes passées (`.144`) — accessibilité clavier limitée.
- **Mobile ≤ 400 px** : Step 0 correct (grid sm:grid-cols-2), CTA sticky bottom safe-area OK, DateSheet plein écran OK. Preview inaccessible (voir plus haut).
- **Edge cases :**
  - Owner sans `property` : nudge bloque à `!property` (`.550`). Mais le `saveDraft` retourne `null` si `!property` (`.455`) → si l'onboarding profil crée la property automatiquement, OK ; sinon owner bloqué sans issue visible.
  - Owner sans `pets` : `buildSuggestedTitle` renvoie « animaux » générique, préview affiche section vide.
  - Owner sans photo : blocker actif, redirige vers `/owner-profile` (`.556`).
  - Owner en pays étranger : `sitCountry` par défaut FR, section pays dans un `<details>` fermé (`.1050`) → risque d'oubli. Mémoire projet note d'ailleurs qu'il faut ouvrir auto ce bloc hors FR — pas implémenté ici.
  - Republish + reprise brouillon simultané (`?from=X&draftId=Y`) : `sourceSitRes` gagne, le brouillon est ignoré silencieusement. Pas de garde-fou UI.
- **Cohérence texte** : `specific_expectations` est labellisé « Description de la garde » dans le form (`.956`) et rendu comme « annonce » (bloc fusionné avec le mot du propriétaire) en public. Nommage non cohérent.

---

### Tableau récap

| Zone | Problème observé | Sévérité | Correctif proposé |
|---|---|---|---|
| PublicSitView.tsx:262,270 | `owner_message` masqué si `specific_expectations` rempli (`\|\|`) | **BLOQUANT** | Rendre les deux blocs séparément, avec titres distincts (« Attentes » / « Un mot de [prénom] ») |
| PublicSitView.tsx:147 | `sit.city` ignoré, `owner.city` utilisé | **MOYEN** | `sit.city ?? owner.city` |
| PublicSitView | `environments` non affiché en public | **MOYEN** | Ajouter chips environnement dans « Le logement » |
| CreateSit.tsx:1018 | Textarea `daily_routine` en `font-mono text-[13px]` | **MOYEN** | Retirer `font-mono`, aligner sur les autres textareas |
| PublicSitView.tsx:261,293,446 | Corps de texte en 3 tailles différentes (base/lg/lg) | **MOYEN** | Uniformiser à `text-base leading-relaxed` |
| draft-sit-from-prompt/index.ts:57 | Concierge IA ignore bio, pets, property, owner_profile | **MOYEN** | Charger et injecter bio + pets (nom/espèce/caractère/routine) + property (type/env) + welcome_notes dans le system prompt |
| CreateSit.tsx:1221 | Récap profil fermé par défaut, invisible pour l'owner | **MOYEN** | Ouvrir par défaut, ou remonter en aside sticky avec compteur « 5 sections tirées de votre profil » |
| CreateSit.tsx:1409 | Bouton Aperçu masqué mobile | **MOYEN** | Rendre visible en mobile aussi (icône seule + libellé accessible) |
| CreateSit + owner_profile | `welcome_notes`, `rules_notes`, `bio` jamais utilisés pour amorcer les champs | **MOYEN** | Bouton « Reprendre depuis mon profil » sur `owner_message` et `specific_expectations` |
| CreateSit.tsx:1050 | Bloc pays fermé par défaut alors qu'owner hors FR | **MOYEN** | Ouvrir auto si `sitCountry !== "FR"` (déjà noté en mémoire projet, à appliquer ici) |
| AnnouncementPreviewDialog | Ne montre pas `open_to`, `flexible_dates` details, `environments` chips comme le public | **MOYEN** | Rapprocher le rendu preview du rendu public (composant partagé recommandé) |
| CreateSit.tsx:334 vs PublicSitView:143 | Deux sources photos différentes (`owner_gallery` en saisie, `property.photos` en rendu) | **MOYEN** | Unifier la source ou afficher les deux dans la preview + doc claire |
| CreateSit STEPS | 3 étapes dont Step 2 très légère (expérience + max + récap) | **COSMÉTIQUE** | Fusionner Step 1 + Step 2 en une seule « Détails & préférences » |
| CreateSit.tsx:87-91, PreviewDialog:41 | Emojis dans labels d'espèces (violation mémoire projet) | **COSMÉTIQUE** | Retirer emojis, utiliser illustrations sur-mesure ou texte seul |
| SitDraftFromPrompt.tsx:74 | `font-serif` (Tailwind défaut) au lieu de `font-heading` (Playfair) | **COSMÉTIQUE** | Utiliser `font-heading` pour cohérence |
| CreateSit.tsx:956 | Champ « Description de la garde » mais rendu comme « annonce » | **COSMÉTIQUE** | Renommer libellé ou clarifier l'aide |

---

### 5 correctifs prioritaires

1. **Réparer le `owner_message` masqué en fiche publique** (`PublicSitView.tsx:262`) — remplacer le `||` par deux blocs distincts avec titres. C'est le fix le plus rentable : un champ optionnel que l'owner remplit avec soin et qui n'est jamais vu.

2. **Retirer `font-mono` sur « Journée type »** (`CreateSit.tsx:1018`) et uniformiser les corps de texte de `PublicSitView` (`text-base leading-relaxed` partout). Fait disparaître la sensation « deux écritures ».

3. **Enrichir la concierge IA avec le contexte profil** (`draft-sit-from-prompt/index.ts:57`) — charger `pets` + `property` + `owner_profile.welcome_notes` + `profiles.bio` et les injecter dans le system prompt. Le brouillon passera de générique à personnalisé, sans effort utilisateur supplémentaire. Effet : IA qui « connaît » vraiment le propriétaire, gain de qualité et de temps.

4. **Ajouter des amorces profil sur les champs libres** — bouton « Reprendre depuis mon profil » sur `owner_message` (utilise `bio` + `welcome_notes`) et sur `specific_expectations` (utilise `rules_notes` + `presence_expected`). Aide à la rédaction sans IA, gratuite, rapide, cohérente.

5. **Rendre l'aperçu accessible mobile + le rapprocher du rendu public** (`CreateSit.tsx:1409` + `AnnouncementPreviewDialog`) — sur mobile où se font 60 % des dépôts, l'owner doit voir ce qu'il publie. Un composant `SitCanonicalCard` partagé entre preview et public éliminerait aussi les écarts de mapping (open_to, environments, flexible_dates).

*Fix bonus quasi-gratuit : `PublicSitView.tsx:147` → `sit.city ?? owner.city`. Une ligne, corrige le cas résidence secondaire / étranger.*