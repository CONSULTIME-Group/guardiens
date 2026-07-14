# Audit code mort — rapport consolidé (read-only)

Aucun fichier modifié. Chiffrages appuyés par `rg`, `wc -l`, `du`. Trois catégories : **A** mort certain (0 référence), **B** probablement mort (référence indirecte non branchée / doublon / flag inactif), **C** douteux (à ne pas toucher sans vérification manuelle).

## Récapitulatif chiffré

| Périmètre | Cat. A (LOC / poids) | B | C douteux |
|---|---|---|---|
| Pages src/pages | 559 LOC (2 fichiers + 1 ré-export) | – | – |
| Composants src/components | 4 749 LOC (51 fichiers) | – | – |
| Hooks src/hooks | 252 LOC (4 fichiers) | – | – |
| Libs src/lib (fichiers entiers) | 249 LOC (2 fichiers) | – | – |
| Libs src/lib (exports isolés) | ~60 exports orphelins | – | – |
| Contextes | – | AuthContext.mock.tsx (usage test) | – |
| Edge functions supabase/functions | 2 892 LOC (22 fonctions) | – | stripe-webhook (206 LOC, webhook Stripe externe) |
| RPC Postgres public.* | 22 fonctions candidates | – | À revalider individuellement (wrappers `.rpc(var)`) |
| Assets src/assets + public | ~15,2 Mo (33 fichiers) | – | icon-512-maskable (manifest.json) |
| Dépendances npm | 2 paquets | – | – |
| Feature flags | 0 | 2 flags actifs | – |
| Exports partagés (constants/data/config) | 17 exports | – | siteRoutes.ts (parsé par regex dans scripts/) |

**Total LOC frontend + edge en catégorie A : ~8 700 LOC. Assets : ~15 Mo.**

---

## A. MORT CERTAIN — supprimable sans risque après double check build

### A.1 Pages / ré-exports (559 LOC)

| Fichier | LOC | Preuve |
|---|---|---|
| `src/pages/admin/AdminOverviewLegacy.tsx` | 313 | `rg "AdminOverviewLegacy" .` → 0 hors définition |
| `src/pages/SmallMissionsPublic.tsx` | 244 | Route `/petites-missions` pointe vers `EntraideHub`, ce fichier n'est référencé nulle part sauf docs `audit/*.md` |
| `src/pages/Index.tsx` | 2 | Ré-export `Landing`; App.tsx importe `Landing` directement |

### A.2 Composants (4 749 LOC, 51 fichiers)

Vérifiés un par un : aucun n'a d'import réel `from "…/NomFichier"`. Les seuls hits résiduels sont soit des commentaires "remplacé par…", soit des homonymes locaux (`StatCard` redéfini dans 5 pages admin, `NavLink` de react-router-dom).

Regroupés par dossier pour lisibilité :

- **NavLink.tsx, city/CityPOISection, CitySidebar, CityTableOfContents**
- **dashboard/** : EmergencyActivation, MissionsNearbySection, MobileDashboardTabs, ProSpaceBanner, VerificationBanner
- **dashboard/owner/** : ExchangesColumn, MyMissionsColumn, StatCard
- **dashboard/sitter/** : AsideArticlesCard, QuickActionsCard, SitterBottomColumns, SitterHero, SitterNextGuard
- **landing/LiveListingsSection**
- **layout/CookieConsent** (App.tsx ligne 20 : commentaire "CookieConsent retiré")
- **marketing/FreeTickerChip**
- **missions/** : EntraideSection, ProposeExchangeDialog
- **missions/connected/** : ExamplesSection, HelperCard, MissionsArticlesStrip, MissionsFilterBar, MissionsHero, OfferDialog
- **owner-profile/** : OwnerExperiences, OwnerStepCalendar
- **profile/** : OwnerHighlights, PublicGallery, PublicOwnerGallery, PublicSkills, StepProgress
- **reviews/CancellationReviewsSection**
- **seo/SitSchemaOrg**
- **shared/** : PhotoLightbox, ResourceSection
- **sits/public/** : PublicSitFAQ, PublicSitGallery, PublicSitPitch, PublicSitTrustStrip
- **skeletons/ListSkeleton**
- **subscription/** : AdvantagesList, EntraideLibreBanner, MySubscriptionFAQ, PricingCards, PricingCardsCheckout, SecurityTrustSection, SubscriptionFAQ

Note : `CookieConsent` est un retrait volontaire documenté dans App.tsx, à supprimer proprement.

### A.3 Hooks (252 LOC)

| Fichier | LOC |
|---|---|
| `src/hooks/usePreloadImages.ts` | 35 |
| `src/hooks/useScrollDepthTracker.ts` | 50 |
| `src/hooks/missions/useGeocodedCoords.ts` | 44 |
| `src/hooks/missions/useMissionsData.ts` | 123 |

### A.4 Libs — fichiers entiers morts (249 LOC)

| Fichier | LOC | Note |
|---|---|---|
| `src/lib/fatalErrorOverlay.ts` | 181 | À vérifier : pas d'`import "./fatalErrorOverlay"` (side-effect) trouvé, `installGlobalErrorHandlers` de `lib/logger.ts` est déjà appelé dans `main.tsx`. |
| `src/lib/sitCoverPhoto.ts` | 68 | `resolveSitCoverPhoto`, `resolvePropertyCover` : 0 ref |

### A.5 Libs — exports orphelins dans fichiers vivants (à retirer symbole par symbole)

Extraits significatifs :
- `lib/constants.ts` : `LAUNCH_START`, `PRICE_MONTHLY`, `PRICE_ONESHOT`, `PRORATA_DISCOUNT`, `PROFILE_COMPLETION_THRESHOLD` (doublons morts de `config/pricing.ts`)
- `lib/pricing.ts` : `getSitterYearlyLabel`, `getSitterOneshotLabel`, `FOUNDER_DEADLINE_ISO`, `REFERRAL_FREE_MONTHS`, `REFERRAL_REWARD_LABEL`
- `lib/alma/whisper-triggers.ts` : `buildFreshSitWhisper`, `buildSearchIndecisionWhisper`, `buildSearchRepeatedNoActionWhisper`, `buildInternationalDiscoveryWhisper`
- `lib/admin/alma-analytics.ts` : `ALMA_MOMENTS`, `AlmaMomentKey`, `MomentStats`, `BubbleKpis`, `WhisperStats`
- `lib/alma/whisper-scheduler.ts` : `SESSION_MUTE_THRESHOLD_BY_FREQUENCY`, `SESSION_MUTE_THRESHOLD`, `CanEmitResult`
- `lib/trustTimeline.ts` : `TimelineEventKind`, `ActivityMonth`, `timelineToSchemaEvents`, `monthsSince`
- `lib/skills/categories.ts` et `lib/skills/tokenize.ts` : tous exports 0 ref → probables fichiers entiers morts (à re-confirmer)
- Types morts isolés : `AllowedAlertRadius`, `AuthErrorInfo`, `PrefillDecision`, `ConsentValue`, `DigestAttribution`, `PasswordStrength`, `OgKind`, `MaybeId`, `FaqItem`, `AvatarValidation`, `TrustTier`, `HeroSelection`, `HeroBankIssue`, `HeroBankValidationReport`, `ModerationVerdict`, `ThirdPartyReason`, `SendTransactionalEmailParams`, `NextActionInput`, `ActivationStep`

Liste complète disponible dans le rapport source si besoin.

### A.6 Data / config (17 exports)

| Fichier | Exports morts |
|---|---|
| `src/data/missionsPublicContent.ts` | **fichier entier** : `MISSIONS_ILLUSTRATIONS`, `MISSIONS_EXAMPLES`, `MISSIONS_FAQ`, `MISSIONS_TESTIMONIALS` (62 LOC) |
| `src/data/demoListings.ts` | `DEMO_THRESHOLD`, types `DemoPet`, `DemoSit` |
| `src/data/authors.ts` | `AUTHORS`, `COSIGNED_AUTHOR_VARIANTS` (usage interne uniquement) |
| `src/data/topCitiesFrance.ts` | type `TopCity` |
| `src/data/cityContent.ts` | types `CityArticleSection`, `CityContentData` |
| `src/data/missionsCityContent.ts` | types `MissionsCityFAQ`, `MissionsCityContent` |
| `src/data/cities.ts` | type `ZoneProfile` |
| `src/config/pricing.ts` | `SITTER_PRICE_MONTHLY_LEGACY_DISCOUNT_RATIO` |

### A.7 Edge functions (22 fonctions, 2 892 LOC)

Aucune référence dans `src/`, aucune référence croisée entre fonctions, aucun cron pg_cron actif, aucune mention `config.toml`.

| Fonction | LOC | Fonction | LOC |
|---|---|---|---|
| add-custom-skill | 197 | send-avis-j1 | 97 |
| auto-transition-sits | 109 | send-avis-j5 | 94 |
| broadcast-sit-to-sitters | 79 | send-conseils-publication-annonce | 254 |
| check-subscription | 154 | send-error-digest | 187 |
| gsc-submit-sitemap | 90 | send-helpers-digest | 265 |
| nudge-dormant-top-sitters | 63 | send-rappel-j48 | 82 |
| nudge-repeated-cancellations | 61 | send-rappel-j7 | 84 |
| nudge-repeated-republished-sits | 59 | send-sit-reminders | 196 |
| nudge-suspicious-accounts | 64 | send-subscription-expiry-reminders | 144 |
| nudge-untapped-cities | 90 | smoke-test | 171 |
| remind-unread-messages | 222 | send-availability-nudge | 130 |

Attention `broadcast-sit-to-sitters` : wrapper deprecated qui délègue à `send-listing-proximity`, à supprimer avec les éventuels appelants historiques restants.

### A.8 Assets orphelins (~15,2 Mo)

**src/assets/ (~9,7 Mo)** :
- Illustrations Alma abandonnées : `alma-avatar.png` (1,4 Mo), `alma-full.png` (828 Ko)
- Essais d'illustration auth : `auth-sage-overflow.png` (646 Ko), `auth-wisteria-overflow.png` (709 Ko)
- 12 fichiers `hero-style-*.jpg` (~2,4 Mo) — planches d'exploration
- 8 fichiers `sample-*.jpg` (~3 Mo)
- Logos non utilisés : `logo-guardiens-light-white.webp`, `logo-guardiens-light.webp`, `logo-guardiens.webp` (le logo réel est `public/logo-guardiens.png`)
- 5 covers d'articles orphelines : `article-garde-chien-lyon-vacances.jpg`, `article-villes-chien-autour-lyon.jpg`, `cover-juridique-house-sitting.jpg`, `cover-pilier-comment-fonctionne-guardiens.jpg`, `cover-satellite-imprevus-garde.jpg`
- 6 fichiers `*.jpg.asset.json` orphelins (metadata sans binaire présent)

**public/ (~5,5 Mo)** :
- `public/_tmp_uploads/cover-satellite-imprevus-garde.webp` (dossier `_tmp_uploads` suspect)
- `public/badges/fondateur.png` (1,4 Mo) + `fondateur_clean.png` (1,3 Mo)
- `public/images/malinois-lyon.jpg` (2,8 Mo)

### A.9 Dépendances npm

| Paquet | Preuve |
|---|---|
| `@lottiefiles/react-lottie-player` | 0 import ; commentaire "ne rend jamais AlmaAvatarLottie" dans AlmaDock.tsx |
| `browser-image-compression` | 0 import de `imageCompression` |

---

## B. PROBABLEMENT MORT

- `src/contexts/AuthContext.mock.tsx` : utilisé uniquement par tests unitaires, à conserver si vitest tourne dessus.
- `src/lib/heroBankMobile.ts` : ne contient qu'un export (`HERO_BANK_MOBILE`) à 0 référence externe → probable fichier mort entier, à confirmer.
- `send-founder-reminder-30` / `send-founder-reminder-7` : crons désinscrits le 05/07, ne restent en vie que via bouton admin manuel dans `AdminSubscriptions.tsx`. Si vous ne prévoyez pas de les rejouer, elles peuvent basculer en A.

## C. DOUTEUX — ne pas toucher sans vérification manuelle

1. **`stripe-webhook` (206 LOC)** : 0 hit interne mais endpoint appelé par Stripe en externe (URL configurée hors repo). Vérifier dashboard Stripe avant toute suppression.
2. **`public/icons/icon-512-maskable.png`** : probablement référencé par `public/manifest.json` (non grepé dans "code"). PWA sensible.
3. **22 RPC Postgres candidats** (`accept_application`, `admin_alma_matching_diagnosis`, `admin_get_application_counts`, `admin_get_listings_application_counts`, `check_invitation_quota`, `generate_sit_slug`, `get_dormant_recovery_context`, `get_email_pipeline_health`, `get_garde_environments`, `get_own_email`, `get_owner_response_median_minutes`, `get_owner_sits_view_trend`, `get_sit_context_for_alma`, `get_sit_view_count_week`, `get_sitter_context_for_alma`, `get_sitter_stay_stats`, `haversine_km`, `record_sit_view`, `slugify_city`, `_debug_geocode_secret_len`, `_debug_vault_names`, `_normalize_species_pg`) : recherche par nom exact ; risque de faux négatif si appel via wrapper `.rpc(fnName, …)` avec variable. À vérifier individuellement.
4. **`src/data/siteRoutes.ts`** : exports `staticRoutes`, `dynamicRoutes`, `privateDisallowPaths`, types `SiteRoute`/`DynamicRouteConfig` invisibles au grep TS mais parsés par regex dans `scripts/generate-robots.mjs` et `scripts/validate-og-tags.mjs`. **Ne pas classer A.**
5. **Fonctions security-definer** (`has_role`, `is_admin`, `enforce_*`, `validate_*`, `trg_*`) : vivantes via policies RLS et triggers — jamais à toucher.

---

## Détails techniques

### Faux positifs corrigés pendant l'audit
Les edge functions ci-dessous ressortaient en 0 hit par recherche naïve `functions.invoke("nom")` mais sont **vivantes** via template literals dynamiques :
- `fetch-bing-data` (useBingData.ts)
- `fetch-seo-data` (useSeoData.ts)
- `send-founder-reminder-30/7` (AdminSubscriptions.tsx)
- `backfill-profile-coordinates` (AdminDiagnostics.tsx)
- `delete-empty-duplicate-account` (DuplicateAccountGuard.tsx)
- `geocode-guide-places` (NetworkErrorMonitor.tsx)

### Limites connues
- Imports 100 % dynamiques via variable (`import(\`@/pages/\${x}\`)`) non détectables par `rg` — aucun pattern de ce type repéré dans le repo.
- Ré-exports par barrel (`index.ts` avec `export *`) : aucun n'a été trouvé masquant un usage.
- Suppression réelle non effectuée : à valider par `tsgo` + build + vitest après retrait, avec attention particulière aux side-effects d'imports (`main.tsx` en tête).

### Ordre de suppression recommandé (si vous validez)
1. Composants + pages + hooks A (batch simple, 0 risque bundle).
2. Assets A (gain immédiat repo + éventuels imports morts détectés).
3. Exports orphelins A.5/A.6 (symbole par symbole).
4. Libs entières A.4 après re-lecture de `fatalErrorOverlay.ts`.
5. Edge functions A.7 (suppression via `supabase functions delete`).
6. Dépendances npm A.9 (`bun remove`).
7. Vérifications C avant tout retrait.

Aucune modification n'a été apportée. Validez la liste (ou marquez les éléments à conserver) et je passerai à la suppression en une ou plusieurs passes selon votre préférence.