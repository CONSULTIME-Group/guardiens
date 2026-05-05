# Audit détaillé — `validate-og-tags.mjs` (prod)
_Date : 2026-05-05 — Lecture seule, aucune correction appliquée._

Source : `node scripts/validate-og-tags.mjs https://guardiens.fr`
Scope cible : `https://guardiens.fr` (Prerender.io en front).

---

## ⚠️ Détail urgent à signaler (pas de correction ici)

1. **3 routes publiques indexables sont absentes du `sitemap.xml` prod** :
   `/inscription`, `/cgs`, `/recherche`.
   - `/recherche` : NORMAL (marquée `index: false` dans `siteRoutes.ts:185`). C'est le script qui se trompe.
   - `/inscription` et `/cgs` : **vrai bug SEO**. Aucune des deux n'a `index: false` dans `siteRoutes.ts`, donc le sitemap prod est en retard d'un build, OU le générateur a un filtre supplémentaire non documenté. À investiguer.
2. **Divergence `index.html` vs route `/`** sur les `og:title` / `twitter:title` :
   le script attend `Home sitting & petites missions d'entraide locale` (sans suffixe ` | Guardiens`), mais l'`index.html` synchronisé contient le suffixe. Ce n'est PAS une régression : c'est le script qui ne reproduit pas la même règle de suffixage que `PageMeta`. Faux positif (cf. §3.5).

Aucune action immédiate dans ce document.

---

## 1. Section `sitemap.xml` — 13 problèmes

| # | URL | Type | Attendu | Réel | Verdict |
|---|-----|------|---------|------|---------|
| 1 | `/` | changefreq | `weekly` | `daily` | **Vrai bug mineur** : `siteRoutes.ts:126` dit `weekly`, le sitemap publie `daily`. Soit le générateur force `daily` pour la home, soit divergence à corriger d'un côté. |
| 2 | `/tarifs` | changefreq | `monthly` | `weekly` | **Vrai bug mineur** — idem, divergence générateur ↔ source. |
| 3 | `/faq` | priorité | `0.7` | `0.8` | **Vrai bug mineur**. |
| 4 | `/petites-missions` | priorité | `0.7` | `0.8` | **Vrai bug mineur**. |
| 5 | `/petites-missions` | changefreq | `daily` | `weekly` | **Vrai bug mineur**. |
| 6 | `/gardien-urgence` | priorité | `0.7` | `0.8` | **Vrai bug mineur**. |
| 7 | `/recherche` | absente | présente | absente | **FAUX POSITIF** — `index: false` dans `siteRoutes.ts:185`, exclusion attendue. Le script de validation ne lit pas ce flag. |
| 8 | `/contact` | priorité | `0.5` | `0.8` | **Vrai bug mineur**. |
| 9 | `/contact` | changefreq | `monthly` | `weekly` | **Vrai bug mineur**. |
| 10 | `/a-propos` | priorité | `0.5` | `0.6` | **Vrai bug mineur**. |
| 11 | `/inscription` | absente | présente | absente | **VRAI BUG SEO** — pas de `index: false` dans la source ; la page d'inscription doit être indexable. À investiguer côté `scripts/generate-sitemap.mjs`. |
| 12 | `/cgs` | absente | présente | absente | **VRAI BUG SEO** — idem, page légale absente du sitemap alors qu'elle est dans le source. |
| 13 | `/house-sitting/lyon` | priorité | `0.7` | `0.8` | **Vrai bug mineur** (silo géo Lyon, priorité plus haute volontaire ?). À trancher : aligner script ou siteRoutes. |

**Synthèse §1** :
- 1 faux positif (`/recherche`)
- 2 vrais bugs SEO bloquants (`/inscription`, `/cgs` absents)
- 10 divergences mineures de priorité/changefreq → soit corriger le générateur, soit accepter et aligner `siteRoutes.ts` sur la réalité produite (Lyon notamment).

---

## 2. Section CGU / CGS / Mentions légales / Confidentialité

⚠️ Les 4 sont en mode **WARN** dans le rapport (pas bloquant), mais l'utilisateur veut les détails.

### 2.1 `/cgu`
- **Title attendu** : `Conditions générales d'utilisation | Guardiens`
- **Title rendu** : `Conditions Générales d'Utilisation | Guardiens`
- **Description attendue** : `Consultez les conditions générales d'utilisation de la plateforme Guardiens : engagements, responsabilités, droits et obligations des membres.`
- **Description rendue** : `Consultez les conditions générales d'utilisation (version 5) de la plateforme Guardiens.`
- **Diff** : capitalisation (Conditions Générales) + description plus courte mais inclut un numéro de version dynamique.
- **Recommandation** : **aligner le composant `Cgu.tsx` sur `siteRoutes.ts`** (minuscules + description riche). Le numéro de version peut rester dans le H1 ou le corps de page mais pas dans la meta description (instable, pollue Google).

### 2.2 `/cgs`
- **Title attendu** : `Conditions générales de services | Guardiens`
- **Title rendu** : `Conditions Générales de Services | Guardiens`
- **Description attendue** : `Conditions générales de services Guardiens : tarifs, paiement, période d'essai, résiliation simplifiée et droit de rétractation.`
- **Description rendue** : `Tarifs, paiement, résiliation et droit de rétractation des services proposés par Guardiens (CGS version 1).`
- **Recommandation** : **aligner le composant sur `siteRoutes.ts`** (mêmes raisons que CGU).

### 2.3 `/confidentialite`
- **Title attendu** : `Politique de confidentialité | Guardiens`
- **Title rendu** : `Politique de confidentialité | Guardiens` ✅ (identique)
- **Description attendue** : `Comment Guardiens protège vos données personnelles : collecte, conservation, partage, cookies et exercice de vos droits RGPD en France.`
- **Description rendue** : `Comment Guardiens collecte, utilise et protège vos données personnelles, conformément au RGPD et à la loi Informatique et Libertés.`
- **Diff** : description rendue mentionne explicitement la loi Informatique et Libertés (plus précis juridiquement) mais ne liste pas les sous-thèmes (collecte, cookies…).
- **Recommandation** : **garder la formulation siteRoutes.ts** (plus riche en mots-clés SEO, sous-thèmes utiles). Aligner le composant.

### 2.4 `/mentions-legales`
- **Title attendu** : `Mentions légales — Éditeur et hébergeur | Guardiens`
- **Title rendu** : `Mentions légales | Guardiens`
- **Description attendue** : `Mentions légales de la plateforme Guardiens : éditeur, hébergeur, directeur de publication, propriété intellectuelle et coordonnées de contact.`
- **Description rendue** : `Mentions légales de la plateforme Guardiens : éditeur, hébergeur, propriété intellectuelle.`
- **Recommandation** : **aligner le composant sur `siteRoutes.ts`** (title plus descriptif + description plus complète = meilleur SEO).

### 2.5 Bonus — autres routes en WARN avec divergence intéressante

| Route | Verdict |
|-------|---------|
| `/tarifs` | Composant **plus riche** que siteRoutes (date butoir 13 juin). **Aligner siteRoutes.ts sur le composant** — info commerciale critique. |
| `/faq` | Composant **plus riche** (mentionne parrainage + entraide). **Aligner siteRoutes.ts sur le composant**. |
| `/actualites` | Composant utilise « Guides & Conseils ». **À trancher éditorialement** : est-ce un blog ou un hub guides ? Aligner sur le choix retenu. |
| `/petites-missions` | Composant **plus court** mais OK. **Aligner siteRoutes.ts sur le composant** (« Gratuite pour tous » est un message clé). |
| `/gardien-urgence` | Composant moins précis que siteRoutes (pas de « moins de 24h »). **Aligner composant sur siteRoutes** (la promesse 24h est forte SEO). |
| `/guides` | Composant **bien plus riche** (parcs, vétos, cafés). **Aligner siteRoutes.ts sur le composant**. |

---

## 3. Section faux positifs du script

### 3.1 `/recherche` et `/login` flaguées en bloquant

**Cause** : ces deux routes ont `index: false` dans `siteRoutes.ts`, ce qui implique légitimement :
- `<meta name="robots" content="noindex, nofollow">` côté composant ✅
- absence du sitemap ✅
- pas de canonical (volontaire) ✅

Le script flag ces 3 points comme bloquants alors qu'ils sont **attendus**.

**Règle à ajouter** :
```js
// Avant chaque check OG/canonical/meta-robots/sitemap d'une route :
if (route.index === false) {
  // Vérifier au contraire la PRÉSENCE de noindex et l'ABSENCE du sitemap
  expectNoindex(route);
  expectAbsentFromSitemap(route);
  return; // skip les checks OG match exact
}
```

### 3.2 Article `/actualites/nouveaux-tarifs-2026` — `og:type=article`

Le script attend `og:type=website`, mais Schema.org/OpenGraph **exige `article`** pour les articles de blog.

**Règle à ajouter** :
```js
// Dans validate-og-tags.mjs, autoriser og:type=article pour les patterns d'articles
if (route.pathPattern?.startsWith("/actualites/")) {
  expectedOgType = "article";
}
```

### 3.3 `/house-sitting/[city]` — composant plus riche que pattern

Le pattern `siteRoutes.ts` est générique : `House-sitting à {city} | Guardiens`.
Le composant `CityPage.tsx` génère un titre éditorial : `Garde chien et chat à Lyon — Home sitter | Guardiens`.

**Le composant est meilleur** (mots-clés `chien`, `chat`, `home sitter` = volume de recherche).

**Règle à ajouter** :
```js
// Pour les patterns dynamiques avec dynamicTitle: true, ne pas comparer
// strictement même quand sampleParams est défini — vérifier seulement que
// le titre contient le param interpolé (ex. "Lyon") + " | Guardiens".
if (config.dynamicTitle && config.sampleParams) {
  const cityName = config.sampleParams.city;
  expectTitleContains(cityName);
  expectTitleEndsWith(" | Guardiens");
}
```

### 3.4 `index.html` `og:title` flagué « MISMATCH » alors qu'il est correct

Le script compare `og:title` brut contre `siteRoutes.ts:title` mais oublie que l'index.html (SSR-static) inclut le suffixe `| Guardiens` déjà présent dans le title de la route. Faux positif structurel.

**Règle** : normaliser les deux côtés avant comparaison (strip suffixe ` | Guardiens` si présent des deux côtés OU sur aucun).

### 3.5 Routes internes en WARN OG (70 warnings) — voir §4

---

## 4. Section 70 warnings OG non bloquants

**Confirmé : comportement attendu.**

Sans pré-rendu route-par-route (Prerender.io ne couvre que `/` aujourd'hui), tous les bots sociaux (Facebook, Twitter, LinkedIn, WhatsApp, Slack…) reçoivent **les balises OG d'`index.html`** quelle que soit la route demandée, parce qu'ils n'exécutent pas React.

Conséquence :
- partager `https://guardiens.fr/tarifs` sur Facebook → preview = balises de `/` (home).
- partager `https://guardiens.fr/actualites/garde-chat-domicile-lyon` → preview = balises de `/`.

**Pour Google c'est différent** : Googlebot exécute le JS et indexe les vraies balises rendues par `PageMeta`. Donc l'impact SEO Google est nul.

**Action** :
- Pas de correction nécessaire pour passer la validation locale.
- **Décision produit à prendre séparément** : étendre le pré-rendu Prerender.io aux routes clés (tarifs, actualités, silos villes) si on veut de jolies previews sociales.

---

## Récapitulatif des actions à valider (par toi, cas par cas)

| # | Action | Priorité | Type |
|---|--------|----------|------|
| A | Investiguer pourquoi `/inscription` et `/cgs` sont absents du sitemap prod | 🔴 Haute | Bug SEO |
| B | Aligner les 10 divergences priorité/changefreq (générateur ↔ siteRoutes) | 🟡 Moyenne | Cohérence |
| C | Aligner CGU/CGS/Mentions/Confidentialité sur siteRoutes.ts (descriptions plus riches) | 🟡 Moyenne | SEO légal |
| D | Aligner siteRoutes.ts sur composants (tarifs, faq, petites-missions, guides) | 🟡 Moyenne | SEO marketing |
| E | Patcher `validate-og-tags.mjs` pour les 5 catégories de faux positifs (§3) | 🟢 Basse | DX/CI |
| F | Décider du pré-rendu étendu (Prerender.io routes clés) | 🟢 Basse | Stratégique |

**Rien n'est corrigé. À toi de valider quels points traiter.**
