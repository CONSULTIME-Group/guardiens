# Audit Session — 4 mai 2026

## Résumé exécutif
Toutes les modifications principales (BDD, frontend, Schema.org) sont **cohérentes et appliquées**. **2 effets de bord critiques** détectés sur la propagation SEO (canonical DB non consommé par `ArticleDetail` + sitemap statique non régénéré). Le cache Prerender est encore froid sur `/petites-missions` et les 3 articles désindexés.

---

## 1. Cohérence BDD

| Check | Statut | Détail |
|---|---|---|
| 6 colonnes `seo_city_pages` ajoutées | ✅ OK | `content, cover_image_url, hero_image_alt, noindex, canonical_url, excerpt` présentes |
| `seo_city_pages.lyon` rollback NULL | ✅ OK | Tous les nouveaux champs = NULL, `noindex=false` |
| `annecy/grenoble/chambery` non touchés | ✅ OK | NULL partout, `noindex=false` |
| 4 articles `house-sitting-{lyon,annecy,grenoble,chambery}` désindexés | ✅ OK | `noindex=true` + `canonical_url` correct (vers `/house-sitting/{slug}`) |
| Aucun autre article impacté | ⚠️ MINEUR | 5 autres articles `noindex=true` préexistants (`aix-les-bains`, `auvergne-rhone-alpes`, `caluire-et-cuire`, `haute-savoie-annecy-megeve`, `saint-etienne-guide`, `courses-aide-domicile-entraide-senior-lyon`) — historique, non lié à cette session |
| RLS `seo_city_pages` / `articles` intactes | ✅ OK | 5 policies `seo_city_pages`, 2 policies `articles` — inchangées |

---

## 2. Cohérence frontend `SmallMissionsPublic.tsx` (763 lignes)

| Check | Statut | Détail |
|---|---|---|
| Vouvoiement absolu | ✅ OK | 0 occurrence de `tu/tes/te/toi/ton/ta` |
| Mot proscrit « voisin* » | ✅ OK | 0 occurrence dans tout le fichier |
| « à vie » / « pour toujours » | ✅ OK | 0 occurrence (corrigé en dernière passe) |
| « gratuitement » | ✅ OK | 0 occurrence (remplacé par « gratuit ») |
| `FAQ_ITEMS` source unique | ✅ OK | Défini ligne 70, utilisé Accordion (l.703) ET Schema mainEntity (l.751) |
| 10 entrées FAQ | ✅ OK | Comptées dans le tableau |
| 6 cartes maillage interne — URLs relatives | ✅ OK | Toutes commencent par `/`, aucune URL absolue |
| Cibles articles existent en BDD | ⚠️ MINEUR | 3/3 publiés. **Mais** `courses-aide-domicile-entraide-senior-lyon` est `noindex=true` → lien éditorial vers une page noindex (signal mixte mineur) |
| Cibles `/house-sitting/lyon`, `/tarifs`, `/faq` | ✅ OK | Routes existantes |
| Pas de couleur hardcodée / style inline | ✅ OK | Seul `style={{ transitionDelay }}` (légitime, dynamique) |
| Schemas dans `<Helmet>` | ✅ OK | Les 2 scripts JSON-LD (l.722, l.748) dans Helmet (l.721-757). Plus aucun `dangerouslySetInnerHTML` |
| Validateur `jsonld-validation.test.ts` | ✅ OK | 1/1 vert |

---

## 3. Cohérence rendu Prerender (cache live)

Tests `curl -A "Googlebot"`.

| URL | Check | Statut | Détail |
|---|---|---|---|
| `/actualites/house-sitting-annecy` | `<meta robots noindex>` | 🔴 CRITIQUE | Rendu actuel : `<meta name="robots" content="index, follow">` |
| `/actualites/house-sitting-annecy` | canonical vers `/house-sitting/annecy` | 🔴 CRITIQUE | Canonical pointe vers `https://guardiens.fr/actualites/house-sitting-annecy` (self) |
| `/actualites/house-sitting-grenoble` | idem | 🔴 CRITIQUE | Même problème |
| `/actualites/house-sitting-chambery` | idem | 🔴 CRITIQUE | Même problème |
| `/petites-missions` | FAQPage dans `<head>` | ✅ OK | 1 occurrence trouvée |
| `/petites-missions` | Service schema dans `<head>` | ✅ OK | 1 occurrence `"@type":"Service"` |
| `/petites-missions` | 10 questions FAQ | ⚠️ CACHE FROID | Seulement 6 `"@type":"Question"` détectées (rendu cache antérieur S6.4) |
| `/petites-missions` | Bande "Pour aller plus loin" | ⚠️ CACHE FROID | 0 occurrence (non encore reprerendered) |
| `/petites-missions` | « voisin » / « à vie » / « pour toujours » | ⚠️ MINEUR | 0 « voisin » mais 2 occurrences « à vie / pour toujours » dans le HTML cache (vieille version, à invalider) |

**Action requise** : invalider le cache Prerender sur les 4 URLs concernées.

---

## 4. Effets de bord

| Check | Statut | Détail |
|---|---|---|
| `CityPage.tsx` non modifiée | ✅ OK | Aucune modif cette session |
| `ArticleDetail.tsx` consomme `noindex` | ✅ OK | Ligne 265 : `noindex={article.noindex === true}` → passé à `PageMeta` |
| `ArticleDetail.tsx` consomme `canonical_url` | 🔴 CRITIQUE | **`canonical_url` lu en BDD (l.25) mais JAMAIS passé à `PageMeta`**. `PageMeta` ne supporte pas non plus de prop `canonical` : il génère toujours le canonical depuis `path`. → **les 4 canonical stockés en DB sont inertes**. C'est ce qui explique la section 3 : canonical pointe sur self. |
| `PageMeta` / Helmet inchangés | ✅ OK | Aucune modif |
| Sitemap exclut les 4 articles désindexés | 🔴 CRITIQUE | `public/sitemap.xml` (statique, prébuild) contient encore les 4 `<loc>` pour `house-sitting-{lyon,annecy,grenoble,chambery}`. La fonction edge `supabase/functions/sitemap` filtre bien `noindex=true`, mais le sitemap servi au build est obsolète → signal mixte Google. **À régénérer** (`scripts/generate-sitemap.mjs`). |

---

## Conclusion

- **🔴 Critiques : 3**
  1. `ArticleDetail.tsx` ne propage pas `canonical_url` à `PageMeta` (et `PageMeta` n'accepte pas la prop) → les 4 canonicals BDD sont sans effet en production.
  2. Les 4 URLs `/actualites/house-sitting-*` rendent toujours `robots: index, follow` (cache Prerender + canonical absent).
  3. `public/sitemap.xml` contient encore les 4 articles désindexés.

- **⚠️ Mineurs : 3**
  - 1 carte du maillage interne pointe vers un article `noindex=true` (`courses-aide-domicile-entraide-senior-lyon`).
  - Cache Prerender froid sur `/petites-missions` (S6.2 à S6.4 non encore visibles côté Googlebot).
  - 5 articles `noindex=true` préexistants (historique, hors session).

- **✅ OK** : BDD, frontend `SmallMissionsPublic.tsx`, Schemas, validateur, RLS.

**Prochaine action recommandée (hors audit)** : étendre `PageMeta` avec une prop `canonical?: string` + la passer depuis `ArticleDetail`, régénérer le sitemap statique, purger le cache Prerender sur les 4 URLs critiques.
