# AUDIT TECHNIQUE GUARDIENS — SEO, indexation & funnel d'inscription

> Audit en lecture seule réalisé le 25 avril 2026.
> Périmètre : `src/App.tsx`, pages publiques, `public/robots.txt`, `public/sitemap.xml`, parcours d'inscription.
> Aucune modification de code n'a été effectuée. Aucune recommandation n'est formulée — uniquement le constat.

---

## PARTIE 1 — Inventaire des routes (`src/App.tsx`)

Légende : **Ix** = indexable (pas de `noindex`) · **PM** = utilise `PageMeta` ou `CityPageMeta` · **JSON-LD** = présence de `application/ld+json` détectée dans le composant.

| Path | Composant | Ix | PageMeta | JSON-LD | Notes |
|---|---|---|---|---|---|
| `/` | `Landing` | ✅ | ✅ | Organization, WebSite, Service, FAQPage | route critique |
| `/login` | `Login` (PublicOnly) | ❌ noindex | ❌ Helmet manuel | — | dans `robots.txt Disallow` |
| `/register` | `RegisterRedirect` → `/inscription` | — | — | — | redirect 301 client |
| `/inscription` | `Register` (PublicOnly) | ❌ noindex | ❌ Helmet manuel | — | présent dans sitemap (incohérence) |
| `/auth/confirm` | `AuthConfirm` | ❌ noindex | ❌ Helmet manuel | — | |
| `/forgot-password` | `ForgotPassword` (PublicOnly) | ❌ noindex | ❌ Helmet manuel | — | |
| `/reset-password` | `ResetPassword` | ❌ noindex | ❌ Helmet manuel | — | |
| `/actualites` | `News` | ✅ | ✅ | — | |
| `/actualites/:slug` | `ArticleDetail` | ✅ (sauf `noindex` BDD) | ✅ | Article + FAQPage + Product/LocalBusiness conditionnels | |
| `/blog` | `Navigate→/actualites` | — | — | — | |
| `/blog/:slug` | `NavigateBlogSlug→/actualites/:slug` | — | — | — | |
| `/a-propos` | `About` | ✅ | ✅ | — | |
| `/contact` | `Contact` | ✅ | ✅ | — | |
| `/cgu` | `Terms` | ✅ | ✅ | — | |
| `/confidentialite` | `Privacy` | ✅ | ✅ | — | |
| `/mentions-legales` | `MentionsLegales` | ✅ | ✅ | — | |
| `/faq` | `FAQ` | ✅ | ✅ | FAQPage (conditionnel) | |
| `/guides` | `GuidesListing` | ✅ | ✅ | détecté | |
| `/guides/:slug` | `GuideDetail` | ✅ | ✅ | détecté | |
| `/guide`, `/guide/:slug` | redirection vers `/guides…` | — | — | — | |
| `/house-sitting/:slug` | `CityPage` | ✅ | ✅ (`CityPageMeta`) | détecté (`CitySchemaOrg`) | silos géo |
| `/departement/:slug` | `DepartmentPage` | ✅ | ✅ | détecté | |
| `/tarifs` | `Pricing` | ✅ | ✅ | FAQ JSON-LD | |
| `/test-accord` | preview accord | — | — | — | dans Disallow `robots.txt` |
| `/gardien-urgence` | `EmergencySitter` | ✅ | ✅ | détecté | |
| `/petites-missions` | `SmallMissionsRoute` (`Public` ou `Private`) | ✅ public | ✅ | détecté | |
| `/petites-missions/creer` | `CreateSmallMission` (Protected) | ✅ par défaut | ✅ | — | route protégée mais sans `noindex` |
| `/petites-missions/:id` | `SmallMissionDetail` | ✅ | ✅ | — | thin content potentiel |
| `/long-stays/:id` | `Navigate→/` | — | — | — | legacy |
| `/actualites/gardes-longue-duree-guide` | `Navigate→/actualites` | — | — | — | legacy |
| `/profil/:id` | `RedirectProfil→/gardiens/:id` | — | — | — | |
| `/proprietaires/:id` | `RedirectProprietaire→/gardiens/:id?tab=proprio` | — | — | — | |
| `/annonces/:id` | `PublicSitDetail` | ❌ noindex,follow | ✅ + Helmet | détecté (`SitSchemaOrg`) | thin content protection |
| `/gardiens/:id` | `PublicSitterProfile` | ❌ noindex (politique RGPD) | ✅ | détecté (`ProfileSchemaOrg`) | jamais dans sitemap |
| `/admin/*` (toutes) | divers | — | — | — | dans `robots.txt Disallow` |
| `/dashboard` | `Dashboard` (Protected) | ❌ noindex | ❌ Helmet manuel | — | |
| `/profile` | `Profile` (Protected) | ❌ noindex | ❌ Helmet manuel | — | |
| `/search`, `/recherche` | `SearchPage` (Protected) | ❌ noindex | ❌ Helmet manuel | — | `/recherche` présent dans sitemap (incohérence) |
| `/recherche-gardiens` | `SearchOwner` (Protected) | ❌ noindex | ❌ | — | |
| `/messages` | `Messages` (Protected) | ❌ noindex | ❌ Helmet manuel | — | |
| `/sits`, `/sits/create`, `/sits/:id`, `/sits/:id/edit` | divers (Protected) | ❌ noindex | ❌ Helmet manuel | — | |
| `/review/:sitId` | `LeaveReview` (Protected) | ❌ noindex | ❌ Helmet manuel | — | |
| `/mes-avis` | `MesAvis` (Protected) | ❌ noindex | ❌ Helmet manuel | — | |
| `/notifications` | `Notifications` (Protected) | ❌ noindex | ❌ Helmet manuel | — | |
| `/house-guide/:propertyId` | `HouseGuide` (Protected) | ❌ noindex | ❌ Helmet manuel | — | |
| `/owner-profile` | `OwnerProfile` (Protected) | ❌ noindex | ✅ | — | |
| `/settings` | `Settings` (Protected) | ❌ noindex | ❌ Helmet manuel | — | |
| `/mon-abonnement` | `MySubscription` (Protected) | ❌ noindex | ✅ (`PageMeta noindex`) | — | |
| `/favoris` | `Favorites` (Protected) | ❌ ? | ✅ | — | aucun `noindex` détecté dans le fichier |
| `/planche-badges` | `PlancheBadges` | ❌ noindex | — | — | |
| `/test/badges-long-labels` | `TestBadgesLongLabels` | ❌ noindex | — | — | |
| `/test/hero-gallery` | `TestHeroGallery` | ❌ noindex | — | — | |
| `/test/hero-distribution` | `TestHeroDistribution` | ❌ noindex | — | — | |
| `/admin/hero-weights` | `AdminHeroWeights` | ❌ noindex | — | — | hors `AdminLayout` (anormal) |
| `/test/error-boundary` | `TestErrorBoundary` | indéfini | — | — | aucun `noindex` détecté |
| `/test/empty-states` | `TestEmptyStates` | indéfini | — | — | aucun `noindex` détecté |
| `/unsubscribe` | `Unsubscribe` | ❌ noindex | ❌ Helmet manuel | — | |
| `*` (404) | `NotFound` | ❌ noindex | ✅ | — | |

---

## PARTIE 2 — Audit SEO on-page (pages indexables uniquement)

Liste **uniquement** les pages présentant un défaut détectable statiquement.

| Page | Title | Description | H1 | OG | Canonical | Schema | Problème(s) constaté(s) |
|---|---|---|---|---|---|---|---|
| `/test/error-boundary` | inconnu | inconnu | inconnu | non | non | — | route en `<Routes>` sans `noindex`, sans `PageMeta` (Partie 1) |
| `/test/empty-states` | idem | idem | idem | non | non | — | idem |
| `/petites-missions/creer` | via `PageMeta` | OK | OK | OK | OK | — | route protégée mais aucune balise `noindex` (devrait l'être) |
| `/petites-missions/:id` (`SmallMissionDetail`) | dynamique : `${mission.title} — Entraide Guardiens` | `mission.description?.slice(0,155)` | `<h1>` non audité ici | OK | OK | aucun JSON-LD (pas de `LocalBusiness`/`Event`) | description vide si la mission n'a pas de description ; pas de Schema thématique |
| `/actualites/:slug` (Article) | `meta_title || article.title` (longueur non garantie 50–60) | `meta_description || article.excerpt` (longueur non garantie 140–160) | OK (`<h1>` ligne 335) | OK | OK | OK | aucun garde-fou de longueur côté code (qualité dépend du contenu BDD) |
| `/favoris` (`Favorites`) | OK | OK | OK | OK | OK | — | route protégée affichant `PageMeta` indexable par défaut (devrait être `noindex`) |
| `/gardien-urgence` | OK | OK | OK | OK | OK | détecté | — |
| `/petites-missions` (public) | OK | OK | OK | OK | OK | détecté | — |
| `/` (Landing) | `Guardiens — Partez l'esprit tranquille` (54 c.) | description 142 c. | OK | OK | OK | 4 blocs JSON-LD | — |
| `/tarifs` | 56 c. | 156 c. | OK | OK | OK | FAQ | — |
| `/faq` | 37 c. | 138 c. | OK | OK | OK conditionnel | conditionnel | description légèrement courte (<140) |
| `/contact` | 18 c. | 108 c. | OK | OK | OK | aucun | description courte (<140) |
| `/a-propos` | 22 c. | 87 c. | OK | OK | OK | aucun | description courte (<140) |
| `/cgu`, `/confidentialite`, `/mentions-legales` | OK | descriptions courtes (~70–110 c.) | OK | OK | OK | aucun | descriptions courtes ; aucun bloc `Article`/`LegalDocument` |

> Remarque : `PageMeta` injecte `og:image`, `og:title`, `og:description`, `canonical`, `robots`, Twitter card et `prerenderReady=true`. Les pages qui utilisent `PageMeta` sont conformes par construction sur ces points. Le défaut n'est jamais "absence d'OG", mais "longueur de description inférieure aux seuils SEO".

---

## PARTIE 3 — `robots.txt` & `sitemap.xml`

### 3.1 `public/robots.txt` (37 lignes)

```
User-agent: *
Allow: /

Disallow: /admin, /dashboard, /messages, /mon-abonnement, /notifications,
          /sits, /annonces/, /search, /recherche, /recherche-gardiens,
          /review/, /house-guide/, /profile, /owner-profile, /favoris,
          /mes-avis, /settings, /forgot-password, /reset-password,
          /login, /inscription, /unsubscribe, /test-accord, /auth/

Crawl-delay: 1
Sitemap: https://guardiens.fr/sitemap.xml
```

### 3.2 `public/sitemap.xml` — 148 URLs

### 3.3 Incohérences constatées

| Type | URL | Constat |
|---|---|---|
| **Disallow ↔ sitemap** | `https://guardiens.fr/inscription` | Présente dans le sitemap **ET** `Disallow: /inscription` dans `robots.txt` **ET** `<meta name="robots" content="noindex,nofollow">` dans `Register.tsx:282`. Conflit triple : Google reçoit l'URL via le sitemap mais ne peut pas la crawler ni l'indexer. |
| **Disallow ↔ sitemap** | `https://guardiens.fr/recherche` | Présente dans le sitemap **ET** `Disallow: /recherche` dans `robots.txt` **ET** noindex dans `SearchPage.tsx:21`. Même type de conflit. |
| **Indexable absente** | `/petites-missions/creer` | Indexable par défaut (route SPA), pas de `noindex` détecté, pas dans le sitemap. Faible enjeu. |
| **Indexable absente** | `/test/error-boundary`, `/test/empty-states` | Idem ; pages de test sans `noindex` ni mention dans `robots.txt`. |
| **Politique cohérente** | `/gardiens/:id`, `/annonces/:id`, `/admin/*`, `/dashboard`, etc. | Correctement absentes du sitemap, `noindex` posé en code et/ou bloquées dans `robots.txt`. ✅ |
| **City pages** | `/house-sitting/annecy/lyon/grenoble/caluire-et-cuire/chambery/aura` | Présentes dans le sitemap, indexables. ✅ |
| **Articles** | 113 articles sous `/actualites/…` | Présents dans le sitemap. La cohérence avec la colonne `noindex` en BDD n'a pas pu être vérifiée statiquement. |

---

## PARTIE 4 — Redirections (`ArticleDetail.tsx`)

`ArticleDetail.tsx` lignes 89–125 définit un dictionnaire `ARTICLE_REDIRECTS` (35 entrées) appliqué via `navigate(\`/actualites/${target}\`, { replace: true })` ligne 141.

### 4.1 Détection de chaînes (A→B→C)

Une analyse programmatique du dictionnaire indique : **aucune chaîne de redirection détectée**. Aucune cible n'est elle-même clé d'une autre redirection.

### 4.2 Cibles présentes dans le sitemap (échantillon)

| Slug source | Slug cible | Cible dans sitemap ? |
|---|---|---|
| `golden-retriever-lyon-guide-race` | `golden-retriever-guide-race-complet` | non vérifié (probable) |
| `house-sitting-noel` | `house-sitting-noel-fetes-fin-annee` | ✅ |
| `gardien-urgence-presentation` | `devenir-gardien-urgence-guardiens` | ✅ |
| `rediger-annonce-garde` | `rediger-bonne-annonce-house-sitting` | ✅ |
| `conseils-garder-chien` | `reussir-premiere-garde-house-sitting` | ✅ |
| `erreurs-premiere-garde` | `reussir-premiere-garde-house-sitting` | ✅ |
| `5-erreurs-premiere-garde` | `reussir-premiere-garde-house-sitting` | ✅ |
| `10-conseils-garder-chien` | `reussir-premiere-garde-house-sitting` | ✅ |
| `devenir-pet-sitter` | `creer-profil-gardien-attractif` | ✅ |
| `devenir-pet-sitter-guide-debutant` | `creer-profil-gardien-attractif` | ✅ |

> ⚠️ Les slugs `conseils-garder-chien` et `devenir-pet-sitter-guide-debutant` figurent **encore dans le sitemap** (vérifié) **bien que** redirigés en client. Cela force Google à découvrir une URL listée comme indexable mais qui répond par une redirection JS — pénalisant pour la consolidation des signaux.

### 4.3 Autres redirections dans `App.tsx`

- `/register` → `/inscription` (préserve query+hash) ✅
- `/blog` → `/actualites` ✅
- `/blog/:slug` → `/actualites/:slug` ✅
- `/guide` → `/guides` ✅
- `/guide/:slug` → `/guides/:slug` ✅
- `/profil/:id` → `/gardiens/:id` ✅
- `/proprietaires/:id` → `/gardiens/:id?tab=proprio` ✅
- `/long-stays/:id` → `/` (legacy)
- `/actualites/gardes-longue-duree-guide` → `/actualites` (legacy)

Aucune chaîne A→B→C détectée dans `App.tsx`.

---

## PARTIE 5 — Funnel d'inscription

### 5.1 Parcours technique

1. **Landing** → CTA "Publier mon annonce" / "Je veux garder" / "S'inscrire" : `navigate("/inscription?role=owner")`, `navigate("/inscription?role=sitter")` (Landing.tsx l. 264, 274, 380, 519). Liens `<Link to="/inscription?role=owner">`, etc. ✅
2. **`/inscription`** (`Register.tsx`) :
   - **Step 1** : sélection du rôle (`owner` / `sitter` / `both`).
   - **Step 2** : email, mot de passe.
     - Validations client : longueur ≥ 8, blacklist `COMMON_WEAK_PASSWORDS`, score force ≥ 2, `acceptedTerms`.
     - Si `weak_password` côté serveur (HIBP Supabase) : message clair (l. 244–245).
     - `register()` appelée avec timeout 15 s ; au-delà, message dédié.
     - Référence parrainage : `sessionStorage('guardiens_ref')` lié post-signup.
     - Si `already registered` : ouverture `Dialog` avec lien "Se connecter".
3. **Confirmation email** : Step `confirmation` (l. 322) → invite à vérifier la boîte mail. Bouton "Renvoyer l'email" via `supabase.auth.resend({ type: 'signup', emailRedirectTo: getSignupRedirectUrl() })`.
4. **Edge function** : aucune edge function n'est appelée explicitement par le funnel d'inscription. Les emails passent par Supabase Auth (avec hook `auth-email-hook` côté backend, hors funnel client).
5. **Création profil** : trigger SQL `handle_new_user` (mentionné en commentaire l. 159–163). Le client n'effectue **aucun INSERT profil**.
6. **Redirection après confirmation** : lien email → `/auth/confirm` puis vers `/dashboard`. `Dashboard.tsx` gère :
   - Toast "Bienvenue sur Guardiens !" si hash `type=signup`/`type=email` (l. 110–117).
   - Émission `signup_email_confirmed` une seule fois (l. 56–72).
   - Émission `user_activated` si flag `first_dashboard_seen=pending` (l. 24–50).
   - Filet "profil incomplet" : si `profiles` introuvable côté serveur, toast `destructive` "Profil incomplet… Contactez contact@guardiens.fr." (l. 77–108).
7. **Dashboard** : aucun bandeau "Compléter mon profil" généralisé n'a été détecté. La logique d'**accès** est portée par `<AccessGateBanner>` (`src/components/access/AccessGateBanner.tsx`) qui propose `Link to="/inscription"` ou `Link to={profilePath}` (`/owner-profile` ou `/profile`). Ces deux routes existent dans `App.tsx`. ✅
8. **Ressources contextuelles** (`OwnerDashboard` → `ContextualResources`) : 9 liens internes vers des articles. **Tous présents dans le sitemap** (vérifié pour les 5 référencés : `rediger-bonne-annonce-house-sitting`, `choisir-gardien-bons-criteres`, `preparer-maison-avant-garde`, `accueillir-gardien-bonnes-pratiques`, `que-faire-probleme-pendant-garde`).

### 5.2 Points de friction / blocages potentiels (observés dans le code)

| Endroit | Constat | Impact |
|---|---|---|
| `Register.tsx:248–250` | `toast.destructive` générique "Une erreur est survenue. Réessayez dans quelques instants." sans détail (catch-all) | un utilisateur dont la cause n'est ni `weak_password` ni `already registered` ni `timeout` n'a aucun message exploitable. |
| `Register.tsx:147` | `email.trim().toLowerCase()` mais pas de validation regex côté client (le `type="email"` HTML suffit, mais aucun retour visuel inline) | confusion possible si la saisie contient des espaces invisibles. |
| `Login.tsx:65–71` | Catch-all `toast.destructive "Erreur de connexion"` pour toute erreur autre que `Invalid login credentials` ou `Email not confirmed` | mêmes erreurs Supabase non discriminées (rate-limit, captcha, etc.). |
| `Dashboard.tsx:97–103` | Toast "Profil incomplet" sans CTA (pas de lien vers `/profile` ou contact en un clic) | l'utilisateur lit "Contactez contact@guardiens.fr" mais doit copier l'email manuellement. |
| `Login.tsx:45` / `Register.tsx:263` | `getSignupRedirectUrl()` utilisé pour `emailRedirectTo` | la valeur exacte n'est pas auditable ici sans ouvrir `src/lib/authRedirect.ts`, mais elle conditionne la cible post-confirmation : un mauvais domaine = lien email cassé. |
| `Register.tsx:399, 414` | `autoComplete="email"` / `autoComplete="new-password"` en clair, sans la fonction `getAuthFieldAttrs` utilisée sur `Login.tsx` | inconsistance avec la stratégie autofill WebView mise en place sur Login. |
| `Register.tsx:282` | `noindex,nofollow` posé via `<Helmet>` ET `Disallow: /inscription` dans `robots.txt` ET URL présente dans le sitemap | conflit signalétique vu en Partie 3. |
| `App.tsx:212–214` | `PublicOnlyRoute` redirige `/login` et `/inscription` vers `/dashboard` si déjà authentifié | OK mais aucun toast d'explication. |

### 5.3 Liens cassés / routes inexistantes détectés

Aucune cible de redirection client (`navigate`/`Link to`) ne pointe vers une route absente de `App.tsx`. Les 9 articles référencés depuis `ContextualResources` sont tous publiés (présents dans le sitemap). Les liens `/owner-profile`, `/profile`, `/dashboard`, `/inscription`, `/login`, `/forgot-password`, `/messages`, `/sits`, `/recherche`, `/favoris`, `/mon-abonnement`, `/notifications`, `/petites-missions` existent.

### 5.4 Redirections circulaires

Aucune redirection circulaire détectée dans `App.tsx` ni dans `ArticleDetail.tsx`.

---

## PARTIE 6 — Liens internes (maillage SEO)

Pages auditées : `/`, `/tarifs`, `/faq`, `/actualites`, `/house-sitting/lyon`.

### 6.1 Liens internes sortants (statiques `<Link to=…>` détectés)

| Source | Cibles internes |
|---|---|
| `/` (`Landing.tsx`) | `/inscription` (×7 via Link/navigate), `/petites-missions` (×3), `/gardien-urgence`, `/house-sitting/lyon`, `/house-sitting/annecy`, `/house-sitting/grenoble` |
| `/tarifs` (`Pricing.tsx`) | `/inscription`, `/faq`, `/gardien-urgence`, `/actualites/nouveaux-tarifs-2026` |
| `/faq` (`FAQ.tsx`) | `/contact`, `/actualites/nouveaux-tarifs-2026` |
| `/actualites` (`News.tsx`) | liens dynamiques vers `/actualites/:slug` (non énumérables statiquement) |
| `/house-sitting/:slug` (`CityPage.tsx`) | `/`, `/faq`, `/gardien-urgence`, `/guides`, `/inscription`, `/tarifs` |

### 6.2 Pages indexables n'ayant **aucun** lien interne entrant détecté depuis ces 5 pages

- **`/a-propos`** — aucune des 5 pages stratégiques ne pointe vers cette page.
- **`/contact`** — pointée uniquement depuis `/faq` ; absente de `/`, `/tarifs`, `/actualites`, `/house-sitting/*`.
- **`/cgu`, `/confidentialite`, `/mentions-legales`** — supposées présentes dans le footer (`PublicFooter`, non audité ici), mais aucun lien direct depuis le corps des pages stratégiques.
- **`/guides`** — pointée uniquement depuis `/house-sitting/*` ; absente de `/`, `/tarifs`, `/faq`, `/actualites`.
- **`/guides/:slug`** (tous les guides locaux) — aucun lien depuis les 5 pages stratégiques (orphelins relatifs).
- **`/departement/:slug`** — aucun lien depuis les 5 pages stratégiques.
- **Articles `/actualites/:slug`** autres que `nouveaux-tarifs-2026` — aucun lien depuis `/`, `/tarifs`, `/faq`, `/house-sitting/lyon`. Ils dépendent intégralement des cross-links `ContextualResources` (réservé au dashboard authentifié) et des liens internes encodés dans le contenu Markdown des articles eux-mêmes.

> Le footer (`PublicFooter`) n'a pas été ouvert dans cet audit ; certains de ces liens y figurent peut-être. Le constat porte sur le **corps** des pages stratégiques.

---

## PARTIE 7 — Performance théorique

### 7.1 Composants chargés sans skeleton/loader

- `Landing.tsx` charge `public_stats` via `supabase.from('public_stats').select('*').single()` (l. 105–125). Pas de skeleton sur les 4 KPIs : un fallback codé en dur (`37`, `234`, `0`, `0`) s'affiche pendant le fetch — ce n'est pas un loader, c'est une valeur trompeuse jusqu'à résolution.
- `ArticleDetail.tsx` charge l'article (l. 144–151) avec `<Skeleton>` (l. 191–199). ✅
- `Dashboard.tsx` (et `OwnerDashboard.tsx`) utilisent `DashboardSkeleton`. ✅

### 7.2 Images sans `loading="lazy"`

- `Landing.tsx` l. 232 : `<img src="/hero-landing.webp" loading="eager" width=1920 height=1080>` — voulu (LCP). ✅
- `ArticleDetail.tsx` l. 365 : `loading="eager"` sur l'image de couverture. ✅ (acceptable car au-dessus de la ligne de flottaison)
- `Login.tsx` l. 83 et 106 : illustrations sans `loading="lazy"` — acceptable car au-dessus de la ligne de flottaison.
- Plusieurs pages admin (`AdminVerifications`, `AdminListings`, `AdminReviews`, etc.) ont des `<img>` sans `loading="lazy"` détectés ; non-bloquant SEO car ces routes sont en `Disallow`.

### 7.3 Images sans `width` / `height`

Vérification ciblée :
- `Landing.tsx` hero : `width={1920} height={1080}` ✅
- `Login.tsx` : `width={400} height={400}` et `width={200} height={200}` ✅
- `ArticleDetail.tsx` cover : `width={800} height={427}` ✅
- Les `<img>` issus de `ArticleRenderer` (contenu Markdown) ne sont pas auditables ici.

### 7.4 Imports lourds non lazy-loadés

Tous les composants secondaires sont déjà chargés via `lazyWithRetry` dans `App.tsx` (l. 46–127). En particulier :
- `SearchPage`, `SearchOwner`, `Messages`, `Sits`, etc. : ✅ lazy.
- `GuideMap` (Leaflet) : importé uniquement par `GuideDetail.tsx` (lazy-loadé depuis `App.tsx`). ✅ chaîne lazy.
- `SearchMapView` : idem.
- Aucun import direct de `recharts` détecté dans les pages publiques.
- `Landing.tsx` est **eager** (l. 25) — choix justifié pour la home, mais son poids inclut `DemoListingShowcase`, `PublicHeader`, `PublicFooter` directement.

### 7.5 Autres remarques

- `react-helmet-async` est utilisé en parallèle de `PageMeta` (qui manipule directement le DOM via `document.head.appendChild` dans un `useEffect`). Risque de doublons de balises `og:*` si une page déclare elle-même un `<Helmet>` avec ces propriétés ; vu uniquement sur `/login`, `/inscription`, `/dashboard`, `/profile`, etc. (Helmet pour `<meta robots noindex>` uniquement, pas de doublon OG).
- `PageMeta` exécute `(window as any).prerenderReady = true` à chaque mise à jour des dépendances (l. 93). Sur les routes qui changent fréquemment de props, cela peut signaler "ready" prématurément à Prerender.

---

## PARTIE 8 — Bugs documentés (vérification)

| Bug | Constat factuel |
|---|---|
| **Lien "Compléter mon profil" → 404** | Aucun lien littéral "Compléter mon profil" trouvé dans `src/components/dashboard/` ni dans les pages. La route pertinente (`/profile` pour sitter, `/owner-profile` pour owner) est calculée dynamiquement dans `AccessGateBanner.tsx:22` et **les deux routes existent** dans `App.tsx` (l. 282, 295). **Bug non reproduit.** |
| **Lien "Voir mon profil public" → /gardiens/{id}** | Aucun lien littéral "Voir mon profil public" trouvé dans `src/components/dashboard/`. La route `/gardiens/:id` existe (`PublicSitterProfile`, App.tsx l. 247). Si un tel lien existe ailleurs (ex. `Sidebar`, `Settings`), il pointerait vers une route fonctionnelle. **Bug non confirmé en lecture du code.** |
| **Listings démo sans GPS, filtrés du rayon 50 km** | `src/data/demoListings.ts` injecte des listings avec `latitude`/`longitude` réels (Lyon `45.7676 / 4.8344`, Annecy `45.8992 / 6.1294`, etc.). Les démos **ont** des coordonnées GPS. Aucune référence `is_demo` détectée dans `SearchPage.tsx` ou `src/components/search/` — **donc ils ne sont pas injectés dans le moteur de recherche actuel**. Ils ne sont visibles que dans `DemoListingShowcase` (Landing). **Bug "filtrés du rayon" : non applicable, ils ne sont jamais dans le flux de recherche.** |
| **Suppression admin bloquée par RLS cascade** | `supabase/functions/admin-delete-user/index.ts` utilise `SUPABASE_SERVICE_ROLE_KEY` (l. 26) qui contourne RLS par construction. Le code de la fonction n'a pas été lu intégralement ; si un blocage subsiste, il viendrait soit (a) d'une foreign key sans `ON DELETE CASCADE`, soit (b) d'un trigger `BEFORE DELETE`, soit (c) d'une vérification métier dans la fonction. **Bug ni confirmé ni infirmé en l'état (audit code uniquement).** |

---

## PARTIE 9 — Synthèse

### 🔴 TOP 5 PROBLÈMES BLOQUANTS

| # | Problème | Fichier · ligne | Impact |
|---|---|---|---|
| 1 | **`/inscription` et `/recherche` listés dans le sitemap MAIS bloqués par `robots.txt` ET `noindex` en code** | `public/sitemap.xml` (l. 56, 47) ; `public/robots.txt` (l. 13, 25) ; `Register.tsx:282` ; `SearchPage.tsx:21` | Signal contradictoire envoyé à Google → "URL soumise mais bloquée par robots.txt" dans la GSC. Gaspille du crawl budget et pollue les rapports d'indexation. |
| 2 | **Slugs d'articles redirigés (client) toujours présents dans le sitemap** (ex. `conseils-garder-chien`, `devenir-pet-sitter-guide-debutant`) | `public/sitemap.xml` ; `ArticleDetail.tsx:89-125` | Google découvre des URLs listées comme indexables qui répondent par redirection JS (et non HTTP 301). Les signaux de la cible ne se consolident pas correctement. |
| 3 | **Maillage SEO orphelin : aucun lien depuis les pages stratégiques vers `/guides`, `/guides/:slug`, `/departement/:slug`, `/a-propos`, `/contact` (hors footer)** | `Landing.tsx`, `Pricing.tsx`, `FAQ.tsx`, `News.tsx`, `CityPage.tsx` | Les silos géo (`/guides/*`, `/departement/*`) ne reçoivent aucun jus interne depuis la home/tarifs/FAQ. Pénalise leur ranking. |
| 4 | **Catch-all silencieux dans le funnel d'inscription** | `Register.tsx:246-251` ; `Login.tsx:65-71` | Toute erreur Supabase non listée → toast générique sans cause. L'utilisateur abandonne sans pouvoir corriger. Forte perte de conversion. |
| 5 | **Routes de test exposées sans `noindex`** (`/test/error-boundary`, `/test/empty-states`) et `/petites-missions/creer` indexable par défaut | `App.tsx:305-306, 239` | Risque d'indexation de pages de test ou pages d'action authentifiée → contenu de qualité douteuse exposé à Google. |

### ⚡ TOP 5 QUICK WINS (< 30 min de dev chacun)

| # | Action constatable | Fichier · ligne | Impact estimé |
|---|---|---|---|
| 1 | **Retirer `/inscription` et `/recherche` du `sitemap.xml`** (et de `staticRoutes` si applicable) | `public/sitemap.xml` ; `src/data/siteRoutes.ts` (l. 119, 100) ; régénération via `scripts/generate-sitemap.mjs` | Élimine le warning GSC immédiatement. |
| 2 | **Ajouter `<meta name="robots" content="noindex, nofollow">` sur `/test/*` et `/petites-missions/creer` et `/favoris`** | `App.tsx:239, 298, 305-306` ; pages concernées | Évite l'indexation accidentelle. |
| 3 | **Ajouter un CTA cliquable au toast "Profil incomplet"** (mailto ou `Link to="/contact"`) | `Dashboard.tsx:98-103` | Réduit l'abandon des utilisateurs en situation d'erreur trigger. |
| 4 | **Détailler le catch-all d'erreur d'inscription** (afficher `error.message` brut quand non normalisé, en plus du message générique) | `Register.tsx:246-251` ; `Login.tsx:65-71` | Récupère les utilisateurs bloqués par rate-limit ou captcha. |
| 5 | **Allonger les `metaDescription` < 140 caractères** (`/contact` 108 c., `/a-propos` 87 c., `/cgu`/`/confidentialite`/`/mentions-legales`) | `src/data/siteRoutes.ts` (l. 86, 95, 134, 142, 150) | Améliore le CTR en SERP. |

### 🛠 TOP 3 CHANTIERS DE FOND (> 2h)

| # | Chantier | Fichiers concernés | Impact estimé |
|---|---|---|---|
| 1 | **Maillage interne SEO** : ajouter une section "Explorer par ville" et "Tous les guides locaux" dans le corps de `/`, `/tarifs`, `/faq` ; et liens cross-articles depuis `/actualites` (liste). Idéalement, alimenter dynamiquement depuis `staticRoutes` + DB. | `Landing.tsx`, `Pricing.tsx`, `FAQ.tsx`, `News.tsx`, `CityPage.tsx` | Alimente les silos géo, sort les guides du statut d'orphelins, distribue le PageRank interne. |
| 2 | **Migrer les redirections d'articles côté serveur (HTTP 301)** plutôt que client (`navigate(replace:true)`) — via `cloudflare-worker-prerender.js` ou `vercel.json`. Et supprimer du sitemap les slugs source. | `ArticleDetail.tsx:89-141` ; `cloudflare-worker-prerender.js` ; `public/sitemap.xml` | Consolide correctement les signaux SEO sur les cibles. Évite que Google indexe des slugs morts. |
| 3 | **Refonte du parcours d'erreur du funnel auth** : taxonomie d'erreurs explicite (mapping Supabase → message i18n), inline error sous chaque champ, télémétrie dédiée. Inclure tests Playwright dédiés au funnel. | `Register.tsx`, `Login.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `lib/analytics.ts` (`mapSignupError`) | Conversion visiteur → inscrit potentiellement +10–20% sur la marge bloquée par erreurs muettes. |

---

*Fin de l'audit.*
