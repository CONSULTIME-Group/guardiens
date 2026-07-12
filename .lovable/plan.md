# Audit AURA / Auvergne-Rhône-Alpes — rapport read-only

Aucun fichier n'a été modifié. Résultats bruts + hiérarchisation.

---

## 1. Code source — hits pertinents (hors i18n, hors faux positifs `aurait`/`restaurant`/`alma-aura`/`dog_friendly_restaurant`/`Sauvegardes`/`Restauration`)

**A. Données de référence légitimes (à conserver — infra régionale FR)**
- `src/lib/regions.ts:20` — `ARA: "Auvergne-Rhône-Alpes"` dans mapping des 18 régions FR.
- `src/data/cities.ts` L14, L33, L79, L127, L174, L219 — 6 villes hub Guardiens (Annecy, Lyon, Grenoble, Caluire, Chambéry, +1) avec `region: "Auvergne-Rhône-Alpes"`. Légitime : ce sont réellement des villes AURA.

**B. Traces user-facing (à purger)**
- `src/pages/CityPage.tsx:559` — `region: "Auvergne-Rhône-Alpes"` **hardcodé** pour toute page ville servie par la BDD (au lieu de dériver du `department`).
- `src/components/layout/PublicFooter.tsx:47` — lien vers `/actualites/house-sitting-aura-guide-complet` (footer visible partout).
- `scripts/generate-sitemap.mjs:57` — `"aura"` dans `cityLandingPages` → régénère `/house-sitting/aura` dans le sitemap à chaque build.

**C. Garde-fous & tests (à conserver — protection anti-régression)**
- `scripts/validate-jsonld.mjs` L5, L22, L23 — bannit AURA/Auvergne-Rhône-Alpes dans JSON-LD.
- `scripts/sync-index-html.mjs` L30, L33, L34 — bannit dans index.html.
- `scripts/preview-article-diff.mjs:75` — bannit dans previews articles.
- `src/pages/AdminArticles.tsx` L57–99 — regex + commentaires bloquant les articles avec AURA.
- `src/pages/EditSit.tsx:180` — regex bloquant AURA dans les annonces.
- `src/__tests__/sync-index-html-guard.test.ts` L8, L28, L46 — test de non-régression.
- `src/__tests__/jsonld-validation.test.ts:6` — test de non-régression.
- `src/lib/__tests__/normalize.test.ts:49` — test unitaire de `looseIncludes`.
- Commentaires "No AURA" dans `SearchOwner.tsx` (L549, L553, L598), `SearchSeoFooter.tsx:10`, `ZonePickerPopover.tsx:57` — rassurants, à conserver.

**D. Backoffice / docs internes**
- `src/pages/admin/AdminLongTailArticles.tsx:114` — texte explicatif interne.
- `AUDIT_GUARDIENS.md:130` — audit historique.

**E. Faux positifs (à ignorer — verbe `aura`, mot `restaurant`, animation `alma-aura`, `hsl(27...)`)**
- `src/pages/Pricing.tsx:28`, `src/lib/conversation.ts` L110/L122, `src/pages/MesAvis.tsx` L108/L215, `src/components/sits/views/SitOverridesEditor.tsx:71`, `src/data/missionTemplates.ts:136`, `src/components/ai/alma/AlmaAvatarAnimated.tsx:588`, `tailwind.config.ts` L192/L222/L223 → aucune action.

---

## 2. Fichiers i18n

Grep strict `\baura\b` + `auvergne` + `rhône-alpes` sur `src/i18n/locales/{fr,en,es,de,it}/**` :
**0 hit pertinent.** Seuls des `dog_friendly_restaurant` (bruit).

**i18n = propre.**

---

## 3. Base de données

### 3.1 Articles avec AURA/Auvergne (slug ou contenu, match strict)

| id (préfixe) | slug | category |
|---|---|---|
| 5597f4d2 | `house-sitting-ete-aura-guide` | saisonnier |
| 03f0bf66 | `gardiennage-maison-vacances-aura` | guide_local |
| 3c6d8b50 | `reseau-entraide-quartier-lyon-aura` | vie_locale |
| ddc0342e | `temoignage-premiere-garde-auvergne` | temoignage |
| 27dbc88c | `house-sitting-aura-guide-complet` | thematique |
| 4bf0d4b1 | `house-sitting-auvergne-rhone-alpes` | guide_local |
| 809eceed | `house-sitting-week-end-court-sejour-aura` | saisonnier |
| ea8e64fd | `faire-garder-animal-pendant-hospitalisation` | conseil_proprio (contenu seul) |
| 26443d76 | `pet-sitting-clermont-ferrand-guide` | guide_ville (title mentionne "volcans d'Auvergne", légitime éditorial) |

**→ 8 articles à arbitrer, dont 5 avec AURA en clair dans le slug (URL indexée).**

### 3.2 Répartition catégories scopées

| category | published |
|---|---|
| guide_local | 23 |
| guide_ville | 5 |
| saisonnier | 4 |
| vie_locale | 14 |
| ville | 5 |

### 3.3 seo_city_pages
- Total : **163** pages
- Traces strictes AURA (`\bAURA\b` ou `Auvergne-Rh[oô]ne-Alpes`) dans intro/content/meta : **0**
- **Propre.**

### 3.4 seo_department_pages
- Total : 101 pages, **12 avec `region = "Auvergne-Rhône-Alpes"`** (ain, allier, ardeche, cantal, drome, haute-loire, haute-savoie, isere, loire, puy-de-dome, rhone, savoie).
- **Légitime** : ce sont les 12 vrais départements AURA. La valeur `region` est nationale (14 régions présentes, réparties normalement).

### 3.5 sits
- `sits` n'a **pas** de colonne `region`. Rien à purger côté annonces.

### 3.6 feature_flags
- `key ILIKE '%aura%|%scope%|%region%'` → **0 ligne**. Aucun flag régional.

---

## 4. Schema.org / JSON-LD hardcodés

**Références "Auvergne-Rhône-Alpes" en clair :** aucune dans le JSON-LD rendu. Une seule occurrence hardcodée : `src/pages/CityPage.tsx:559` (voir §1B).

**Hubs SEO Lyon/Annecy/Grenoble hardcodés dans `areaServed`** (choix stratégique explicite, à confirmer) :
- `src/pages/Landing.tsx:330` et `:454` — `areaServed: [Country France, Lyon, Annecy, Grenoble]`.
- `src/components/seo/CitySchemaOrg.tsx:162, :231, :239` — `addressRegion: city.department` (dérivé, pas hardcodé AURA).
- `src/pages/DepartmentPage.tsx:378` — `areaServed: { AdministrativeArea, containedInPlace: page.region || "France" }` → propage `region` BDD.
- `src/pages/CityPage.tsx:513` — `areaServed: { City: dbPage.city, containedInPlace: Country France }` (propre).
- `src/pages/EmergencySitter.tsx:70`, `Observatoire.tsx:112`, `ArticleDetail.tsx:424` — `Country France` (propre).
- Divers (`PublicSitDetail`, `SitSchemaOrg`, `SmallMissionDetail`, `ProfileSchemaOrg`, `RecentSitsItemListJsonLd`, `PublicMissionView`, `GuideDetail`) — `City` ou `Place` par nom, sans mention AURA.

**Question stratégique** : les 3 villes hub `Lyon/Annecy/Grenoble` en dur dans `Landing.tsx` (2 blocs `areaServed`) sont-elles à retirer maintenant que le scope est France entière, ou conservées comme signal SEO ? → à trancher.

---

## 5. Meta descriptions / titles hardcodés

- Aucun composant client ne pose `<title>` ou `<meta description>` en dur avec AURA/Auvergne.
- BDD `seo_city_pages` : 0 meta contenant AURA (strict).
- BDD `seo_department_pages` : les 12 pages AURA ont naturellement `meta_title` / `meta_description` mentionnant leur département (Ain, Isère, Rhône…), pas "AURA" ni "Auvergne-Rhône-Alpes" en tant que promesse produit.
- BDD `articles` : les 8 articles §3.1 portent la mention dans title / meta / slug.

---

## 6. Routes & sitemap

### 6.1 Sitemap.xml généré
- **3 URLs `/aura`** en clair :
  - `https://guardiens.fr/house-sitting/aura`
  - `https://guardiens.fr/actualites/house-sitting-ete-aura-guide`
  - `https://guardiens.fr/actualites/house-sitting-week-end-court-sejour-aura`
- Chaque URL a 6 hreflang → 21 lignes au total.
- Aucune URL `/regions/auvergne-rhone-alpes`.

### 6.2 Footer
- `PublicFooter.tsx:47` → 1 lien vers l'article `house-sitting-aura-guide-complet`.

### 6.3 Composants dédiés
- Aucun `RegionSelector`, `AuraCoverage`, `AuraCarousel` ou similaire dans `src/`.

---

## Synthèse chiffrée

| Zone | Items à purger | Items légitimes (conserver) |
|---|---|---|
| Code source user-facing | **3** (CityPage L559, Footer L47, generate-sitemap L57) | 0 |
| i18n | 0 | — |
| Articles BDD | **8** (7 slugs AURA/Auvergne + 1 contenu) | 0 |
| seo_city_pages | 0 | 163 |
| seo_department_pages | 0 | 12 (vrais dépts AURA) |
| Sitemap URLs | **3** (+ 18 hreflang) | — |
| Schema.org hardcodé | **1** (CityPage) + **2 blocs à arbitrer** (Landing Lyon/Annecy/Grenoble) | reste OK |
| Garde-fous / tests | 0 | 10+ (à conserver) |
| Backoffice / audits internes | 0 (peut rester) | 2 |
| Feature flags | 0 | — |

---

## Stratégie de purge — 3 vagues

### V1 — Copy user-facing (impact SEO/UX max) — **5 items — PRIORITÉ 1**

1. `src/pages/CityPage.tsx:559` — retirer `region: "Auvergne-Rhône-Alpes"` hardcodé (déduire via `regions.ts` depuis `department` ou passer `null`).
2. `src/components/layout/PublicFooter.tsx:47` — remplacer le lien vers l'article `house-sitting-aura-guide-complet` par un article national (candidat : `c-est-quoi-le-house-sitting` déjà travaillé statement-first).
3. `scripts/generate-sitemap.mjs:57` — retirer `"aura"` de `cityLandingPages`.
4. Régénérer `public/sitemap.xml` (supprime les 3 URLs `/aura` + 18 hreflang).
5. Poser des `redirects` (`redirects` table déjà présente en BDD) 301 sur les 3 URLs `/aura` → cibles nationales.

### V2 — Données structurées & contenu BDD — **8 items — PRIORITÉ 2**

Arbitrer les 8 articles §3.1 en trois options :
- **Renommer slug** (301 + réécriture éditoriale nationale) : `house-sitting-ete-aura-guide` → `house-sitting-ete-france-guide`, idem pour `week-end-court-sejour`, `aura-guide-complet`, `gardiennage-maison-vacances-aura`, `reseau-entraide-quartier-lyon-aura` → conserver Lyon (ville hub légitime), retirer `-aura`.
- **Dépublier** : `temoignage-premiere-garde-auvergne` (temoignage nominatif — peut rester si vrai témoignage AURA, retirer `-auvergne` du slug).
- **Conserver + purger contenu** : `pet-sitting-clermont-ferrand-guide` (ville d'Auvergne réelle → mention légitime), `faire-garder-animal-pendant-hospitalisation` (retirer la seule mention AURA du corps).

Bonus V2 (à trancher — pas dans le scope strict AURA mais adjacent) :
- `src/pages/Landing.tsx:330` et `:454` — décider si les hubs `Lyon/Annecy/Grenoble` restent dans `areaServed` ou si on ne garde que `Country France`.

### V3 — Backoffice / scripts / commentaires — **0 action bloquante**

- Baseline régionale interne (`regions.ts`, `cities.ts` avec `region: "Auvergne-Rhône-Alpes"` pour 6 villes réelles AURA, `AdminLongTailArticles.tsx:114`, `AUDIT_GUARDIENS.md`) : **conserver**, c'est de la donnée référentielle FR.
- Garde-fous `validate-jsonld.mjs`, `sync-index-html.mjs`, `preview-article-diff.mjs`, tests, regex `AdminArticles`/`EditSit` : **conserver impérativement**, c'est la protection anti-régression.
- 12 `seo_department_pages` AURA : **conserver**, ce sont les vrais départements administratifs.

---

## Ordre de bataille recommandé

1. **V1 immédiatement** (impact indexation + footer visible partout).
2. **V2 dans la foulée** avec plan de redirection 301 pour les 5 slugs renommés.
3. **V3 : rien à faire**.

Total effort net : **~13 modifications** (5 code/sitemap + 8 articles). Aucun risque sur les tests / garde-fous / infra régionale.

Dites-moi lequel des trois axes vous voulez que je prépare en build mode (V1 seul, V1+V2, ou V1+V2 avec plan de redirects détaillé).
