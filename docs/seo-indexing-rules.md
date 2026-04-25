# Règles d'indexation SEO — Guardiens

> Documentation interne. **Toute modification touchant à `robots.txt`, `sitemap.xml`,
> `<meta robots>` ou `<link rel="canonical">` DOIT respecter les règles ci-dessous.**
>
> Source de vérité unique : [`src/data/siteRoutes.ts`](../src/data/siteRoutes.ts).
> Les fichiers `public/robots.txt` et `public/sitemap.xml` sont **générés** —
> ne jamais les éditer à la main.

---

## 1. Principe directeur

Une URL ne peut se trouver que dans **un seul** des trois états ci-dessous.
La cohérence est garantie *par construction* via les générateurs.

| État | `meta robots` | `robots.txt` | `sitemap.xml` | `canonical` |
|------|---------------|--------------|---------------|-------------|
| **Publique indexable** | `index, follow` | `Allow: /` | ✅ présente | self-canonical absolu |
| **Publique non-indexable** (outil/auth) | `noindex, follow` | `Disallow: <path>` | ❌ absente | self-canonical absolu |
| **Privée** (auth requise) | `noindex, follow` | `Disallow: <path>` | ❌ absente | self-canonical (peu importe) |

Toute combinaison hors de ce tableau est un **bug d'indexation** :
- `Allow` + `noindex` → gaspille du budget de crawl.
- `Disallow` + sitemap → erreur Search Console "Bloquée par robots.txt".
- `noindex` + canonical pointant ailleurs → signal contradictoire ignoré par Google.

---

## 2. Classification des routes

### 2.1 Routes statiques (déclarées dans `staticRoutes`)

Chaque entrée `SiteRoute` porte un flag `index?: boolean` (défaut `true`).

```ts
{
  path: "/recherche",
  // …
  index: false,   // ← outil interne : Disallow + hors sitemap + meta noindex
}
```

**Règles d'attribution du flag `index` :**

| Catégorie | `index` | Exemples actuels |
|-----------|---------|------------------|
| Page éditoriale / hub / landing | `true` | `/`, `/tarifs`, `/faq`, `/actualites`, `/guides`, `/a-propos` |
| Page de conversion (gratuit) | `true` | `/inscription` |
| Page d'auth (sans contenu SEO) | `false` | `/login` |
| Outil interne dynamique | `false` | `/recherche` |
| Page légale | `true` | `/cgu`, `/confidentialite`, `/mentions-legales` |

### 2.2 Routes dynamiques (générées via Supabase)

Filtrage côté `scripts/generate-sitemap.mjs` :

| Pattern | Condition d'inclusion sitemap |
|---------|-------------------------------|
| `/actualites/:slug` | `published = true` ET `noindex IS NULL OR noindex = false` |
| `/house-sitting/:city` | `seo_city_pages.published = true` |
| `/guides/:slug` | `city_guides.published = true` |
| `/departement/:slug` | `seo_department_pages.published = true` |
| `/races/:species-:breed` | toutes les `breed_profiles` |
| `/gardiens/:id` | `account_status='active'` ET `profile_completion ≥ 60` ET `role IN (sitter,both)` ET `postal_code` 5 chars ET `avatar_url` ET `bio.length > 50` |

Voir aussi : `mem://security/seo-indexing-policy` (politique profils) et
`mem://marketing/seo-editorial-quality` (qualité éditoriale articles).

### 2.3 Routes privées (`privateDisallowPaths`)

Liste explicite dans `siteRoutes.ts`. Critère d'inclusion :

- Toute route derrière auth (`/dashboard`, `/messages`, `/profile`, `/settings`…)
- Toute route exposant de la donnée sensible (`/sits`, `/annonces/`, `/review/`,
  `/house-guide/`, `/notifications`, `/mon-abonnement`, `/favoris`, `/mes-avis`)
- Tout endpoint d'auth interne (`/auth/`, `/forgot-password`, `/reset-password`,
  `/unsubscribe`)
- Pages de test (`/test-accord`)
- Variantes de la recherche en zone privée (`/search`, `/recherche-gardiens`)

> ⚠️ **Ne pas dupliquer** dans `privateDisallowPaths` une route qui figure déjà
> dans `staticRoutes` avec `index: false`. Le générateur lève une erreur si un
> doublon est détecté.

---

## 3. Implémentation côté composant

### 3.1 `<meta name="robots">`

Géré par `src/components/PageMeta.tsx` via la prop `noindex` :

```tsx
<PageMeta
  title="..."
  metaDescription="..."
  noindex={true}   // ← pour /recherche, /login, pages d'erreur, prévisualisations
/>
```

Comportement :
- `noindex={false}` (défaut) → `<meta name="robots" content="index, follow">`
- `noindex={true}` → `<meta name="robots" content="noindex, follow">`

**Règle :** une route avec `index: false` dans `siteRoutes.ts` **doit** passer
`noindex={true}` à `<PageMeta>`. L'inverse est aussi vrai : ne jamais mettre
`noindex={true}` sur une route déclarée indexable sans la passer aussi à
`index: false` côté `siteRoutes.ts`.

### 3.2 `<link rel="canonical">`

Toujours **absolu**, basé sur `SITE_URL` + path courant (sans query string sauf
si le query est sémantiquement essentiel à l'identité de la page — ce qui n'est
le cas pour aucune route actuelle).

- ✅ `https://guardiens.fr/actualites/nouveaux-tarifs-2026`
- ❌ `/actualites/nouveaux-tarifs-2026` (relatif)
- ❌ `https://guardiens.fr/actualites/nouveaux-tarifs-2026?utm_source=…`

Géré automatiquement par `PageMeta.tsx` (suppression des canoniques existants
puis insertion d'un seul `<link rel="canonical">`).

### 3.3 Pages d'erreur (404, 500)

Toujours `noindex={true}` côté composant. Pas d'entrée dans `siteRoutes.ts` (donc
pas dans le sitemap, pas de règle dans robots.txt).

### 3.4 Variantes "preview"/"draft" d'un contenu

`noindex={true}` + canonical pointant vers la version publiée. Aucune route de
prévisualisation n'est référencée dans `siteRoutes.ts`.

---

## 4. Fichiers générés (NE PAS ÉDITER À LA MAIN)

| Fichier | Générateur | Lance via |
|---------|------------|-----------|
| `public/robots.txt` | `scripts/generate-robots.mjs` | `npm run generate-robots` |
| `public/sitemap.xml` | `scripts/generate-sitemap.mjs` | `npm run generate-sitemap` |
| `.sitemap-cache.json` | `scripts/generate-sitemap.mjs` | (cache incrémental) |

Le pipeline `npm run build` enchaîne les deux. Pour forcer un rebuild complet du
sitemap (bypass cache) : `SITEMAP_FORCE=1 npm run generate-sitemap`.

### 4.1 Vérification CI

```bash
node scripts/generate-robots.mjs --check   # exit 1 si robots.txt désync
```

À ajouter dans la CI pour garantir qu'un PR modifiant `siteRoutes.ts` régénère
bien `robots.txt`.

---

## 5. Workflow pour une modification

### 5.1 Ajouter une nouvelle page publique indexable

1. Ajouter une entrée dans `staticRoutes` (`siteRoutes.ts`) — sans flag `index`
   (défaut `true`).
2. Vérifier `title` (30-60 chars) et `metaDescription` (120-160 chars).
3. Sur le composant React de la page, utiliser `<PageMeta>` avec les mêmes
   valeurs (ou laisser `<PageMeta>` lire depuis `siteRoutes.ts`).
4. `npm run generate-robots && npm run generate-sitemap`.
5. Commiter `siteRoutes.ts` + `public/robots.txt` + `public/sitemap.xml`.

### 5.2 Rendre une page existante non-indexable

1. Ajouter `index: false` à son entrée dans `staticRoutes`.
2. Sur le composant React, ajouter `noindex={true}` à `<PageMeta>`.
3. Régénérer robots + sitemap. Commiter.

### 5.3 Ajouter une route privée

1. Ajouter le path dans `privateDisallowPaths`.
2. **Ne pas** créer d'entrée dans `staticRoutes` (la route n'a pas de SEO).
3. Sur le composant : `noindex={true}` (par sécurité, même si `Disallow` suffit).
4. Régénérer robots. Commiter.

### 5.4 Retirer une page de l'index Google

1. Étape 1 — `index: false` + `noindex={true}` → déploiement.
2. Étape 2 — attendre que Google re-crawle (≈ 7-30 jours, surveiller GSC).
3. Étape 3 — une fois désindexée, on peut éventuellement passer en
   `privateDisallowPaths` si la route disparaît côté UI.

> ⚠️ Ne jamais commencer par `Disallow` : Google ne peut alors plus voir le
> `noindex`, et la page reste dans l'index avec la mention "Aucune information
> disponible".

---

## 6. Cas particuliers documentés

### 6.1 `/recherche` (outil interne)

- Page publique (pas d'auth) → accessible aux visiteurs.
- Mais : contenu généré dynamiquement (combinaisons infinies de filtres) → pas
  de valeur SEO + risque de duplicate content massif.
- **Décision :** `index: false`. Route présente dans `staticRoutes` (pour avoir
  un title/description corrects côté composant), mais exclue du sitemap +
  Disallow + meta noindex.

### 6.2 `/login`

- Page d'auth pure, sans contenu SEO exploitable.
- **Décision :** `index: false`. Idem `/recherche`.

### 6.3 `/inscription`

- Page de conversion → garde sa valeur SEO (mots-clés "créer un compte
  gardien", "inscription gardien").
- **Décision :** `index: true`. Présente dans sitemap + Allow + meta index.

### 6.4 Profils gardiens `/gardiens/:id`

- Filtrage strict côté sitemap (cf. § 2.2). Politique alignée sur
  `mem://security/seo-indexing-policy` : seuls `sitter`/`both` actifs avec
  profil complet à ≥ 60 % sont exposés.
- Pas de `noindex` côté composant : si la route est servie, elle est par
  hypothèse indexable (le filtrage se fait à l'amont du sitemap).

### 6.5 Pages géo (`/house-sitting/:city`, `/departement/:slug`, `/guides/:slug`)

- Toujours indexables tant que `published = true` en base.
- Le canonical pointe systématiquement vers la version sans paramètres de
  tracking (UTM strippés côté `PageMeta`).

---

## 7. Checklist PR (revue)

À cocher pour tout PR touchant SEO/indexation :

- [ ] Modif de `siteRoutes.ts` accompagnée d'une régénération de `robots.txt`
      et `sitemap.xml` commitée.
- [ ] Aucune édition manuelle de `public/robots.txt` ni `public/sitemap.xml`.
- [ ] Cohérence triple respectée : `siteRoutes.index` ↔ `<PageMeta noindex>` ↔
      présence dans sitemap.
- [ ] Aucun doublon entre `privateDisallowPaths` et les routes
      `index: false` de `staticRoutes`.
- [ ] Title 30-60 chars, metaDescription 120-160 chars (vérifié manuellement
      ou via `scripts/validate-og-tags.mjs`).
- [ ] Canonical absolu (`https://guardiens.fr/...`), pas de query string
      parasite.
- [ ] Si la page contient du JSON-LD : type Schema.org valide (cf.
      `mem://tech/seo/geo-silo-architecture-and-design`).

---

## 8. Références croisées

- Source : [`src/data/siteRoutes.ts`](../src/data/siteRoutes.ts)
- Générateur robots : [`scripts/generate-robots.mjs`](../scripts/generate-robots.mjs)
- Générateur sitemap : [`scripts/generate-sitemap.mjs`](../scripts/generate-sitemap.mjs)
- Composant meta : [`src/components/PageMeta.tsx`](../src/components/PageMeta.tsx)
- Audit initial : [`AUDIT_GUARDIENS.md`](../AUDIT_GUARDIENS.md)
- Mémoires liées :
  - `mem://security/seo-indexing-policy` — politique profils
  - `mem://tech/seo/content-pillar-strategy` — stratégie hub & spoke
  - `mem://tech/seo/geo-silo-architecture-and-design` — silos géo
  - `mem://marketing/seo-editorial-quality` — qualité éditoriale
