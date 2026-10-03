# Audit architecture technique SEO, guardiens.fr, 03/10/2026

Lecture seule. Aucun code, aucune base, aucune configuration Cloudflare ou Prerender modifiés. Aucune purge ni recache, aucune publication.
Production lue : déploiement `1a94def8` (en-tête `x-deployment-id`), le 03/10/2026 entre 10:45 et 11:05 UTC.

## Méthode

- `GET https://guardiens.fr/robots.txt` et `/sitemap.xml`, parsés.
- Les 673 URL du plan du site visitées avec un agent de navigateur (6 requêtes simultanées au maximum, sans suivre les redirections).
- 43 URL représentatives (1 à 3 par famille), plus 18 cas limites, visitées avec l'agent Googlebot (3 simultanées). Contrôle sur Evreux avec Bingbot, OAI-SearchBot, GPTBot, ClaudeBot et PerplexityBot.
- Aucun lien d'action d'email ni aucun jeton visité.
- Code confronté : `scripts/generate-robots.mjs`, `scripts/generate-sitemap.mjs`, `supabase/functions/sitemap/index.ts`, `src/lib/sitterProfileIndexability.js`, `supabase/functions/_shared/static-seo-refresh.ts`, `index.html`, `src/pages/ProjetsListing.tsx`.
- L'API publique a été interrogée avec la clé publique, en lecture.
- Search Console : NON VÉRIFIÉ. Aucune propriété vérifiée accessible depuis cet outil (il cible guardiens.lovable.app).
- Worker Cloudflare réellement déployé, WAF, quota et échecs Prerender : NON VÉRIFIÉS. Je n'ai pas d'accès à ces consoles, et le fichier `cloudflare-worker-prerender.js` du dépôt n'est pas une preuve de la production. Seul le comportement observé est rapporté.

## Ce qui est sain (confirmé)

- Les 673 URL du plan du site répondent 200, sans doublon, toutes sur https://guardiens.fr.
- Les robots reçoivent un HTML prérendu : en-tête `x-prerender-requestid`, contenu de 2 000 à 24 000 caractères, title, description et H1 propres à chaque page.
- Sur l'échantillon Googlebot, toutes les pages du plan du site renvoient `index, follow` et un canonical unique vers elles-mêmes. Seule exception : /projets (P0-2).
- Les URL inexistantes répondent 404 avec `noindex, follow` : /page-inexistante-xyz, /actualites/article-inexistant-xyz, /house-sitting/ville-inexistante-xyz.
- /projets?utm_source=x et /tarifs/ renvoient un canonical vers l'URL propre.
- /recherche et /search : `noindex, follow`, canonical vers /annonces.
- http vers https (301) et www vers l'apex (308) fonctionnent.
- La préversion id-preview répond 401 : elle n'est pas indexable.
- Bing et les robots IA reçoivent le même prérendu que Google.
- Le robots.txt servi est identique à `public/robots.txt`. Le plan du site servi est identique à `public/sitemap.xml`.
- Les lignes `noindex` en base sont filtrées dans le générateur (articles, villes, départements).

## P0, défauts confirmés à fort impact

### P0-1. Les robots nommés ignorent toutes les zones privées du robots.txt
- **Preuve** : robots.txt servi le 03/10 à 10:45. `User-agent: Googlebot` (et Bingbot, GPTBot, OAI-SearchBot, ClaudeBot, etc.) n'a que `Allow: /`. Les `Disallow: /admin`, `/dashboard`, `/messages`, `/sits`, `/*?*utm_`, etc. existent seulement sous `User-agent: *`.
- **Règle officielle** : un robot applique le seul groupe le plus spécifique qui le nomme, et les groupes ne fusionnent pas (https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec).
- **Conséquence** : pour Google, Bing et tous les robots IA listés, aucune zone privée ni aucun paramètre de suivi n'est interdit.
- **Effet observé avec l'agent Googlebot** : /dashboard, /admin, /sits, /messages, /login et /inscription répondent 200 avec la coquille générique. Elle porte le title « House-sitting : faire garder sa maison et ses animaux | Guardiens », sans canonical et sans `meta robots` dans le HTML servi. Le prérendu n'est pas appliqué à ces chemins.
- **Impact** : budget d'exploration consommé, et risque de pages en double avec un titre identique. L'indexation réelle n'est pas vérifiée faute de Search Console.
- **Correction minimale** : dans `generate-robots.mjs`, répéter le bloc des chemins privés dans chaque groupe nommé, ou supprimer les groupes `Allow: /` sans effet utile et garder `*` seul. Il faut conserver `ByteSpider` et `cohere-ai` en `Disallow: /`. Ne pas interdire les chemins qui doivent rendre `noindex` (fiches gardiens, /recherche).

### P0-2. /projets est dans le plan du site mais servi `noindex` aux robots, avec un prérendu périmé
- **Preuve Googlebot, 03/10** : `https://guardiens.fr/projets` répond 200 avec `meta robots: noindex, follow`. Le H1 servi est « Des chantiers ouverts, chez des particuliers ».
- **En production** : le H1 publié est « Des projets à réaliser ensemble » (constaté le 02/10 dans l'interface et dans le navigateur).
- **Dans le code** : `ProjetsListing.tsx:122` ne met `noindex` que si la liste est vide. La page servie aux robots est donc un instantané d'avant le reclassement du 02/10 (0 projet à l'époque).
- **Pourquoi il n'a pas été rafraîchi** : `STATIC_SEO_URLS` (`_shared/static-seo-refresh.ts:11`) ne contient que /, /tarifs, /actualites, /faq, /a-propos et /contact. /projets et /petites-missions ne sont donc jamais invalidés après publication.
- **Impact** : le plan du site déclare une URL que la page refuse en indexation, et le hub des projets reste hors index.
- **Correction minimale** : ajouter /projets et /petites-missions à `STATIC_SEO_URLS`, dans le budget de rendu déjà prévu. Puis recacher ces deux URL, sur GO, en une seule opération.

### P0-3. L'ancienne adresse du projet est servie aux robots comme une page indexable distincte
- **Preuve Googlebot, 03/10** :
  - `/petites-missions/chantier-participatif-de-plantation` répond 200 `index, follow`, canonical vers elle-même, H1 « Chantier participatif de plantation » (ancien titre).
  - `/petites-missions/e5724f3e-…` répond 200 avec un canonical vers cette même ancienne adresse.
  - La redirection vers /projets/… n'existe que dans le navigateur (`SmallMissionDetail.tsx`) et n'est pas visible par les robots.
- **Impact** : deux URL indexables pour un seul contenu, l'ancienne avec un titre obsolète. Elle n'est plus dans le plan du site, mais reste explorable.
- **Correction minimale** : une redirection 301 côté serveur (règle Worker ou `redirects` déjà en base si le Worker la lit, NON VÉRIFIÉ) de cette adresse vers /projets/chantier-participatif-de-plantation. Sinon, au minimum, un canonical vers /projets/… dans le rendu de l'ancienne route, puis un recache ciblé de ces deux URL.

## P1, défauts confirmés à impact moyen

### P1-1. Plan du site tronqué à 1 000 fiches gardiens, sans ordre de tri
- **Preuve** : `scripts/generate-sitemap.mjs:285` fait `public_profiles … .in("role",["sitter","both"]).limit(5000)` sans ORDER BY. L'API renvoie au plus 1 000 lignes : constaté `content-range: 0-999/1329`.
- En recalculant la règle `isSitterProfileIndexable` sur les 1 329 fiches (lecture paginée, clé publique) : 141 fiches sont éligibles, 81 sont au plan du site, 60 fiches éligibles manquent (42 %), et aucune fiche non éligible n'y figure.
- Même défaut latent sur `public_sitter_profiles` (`limit(5000)`, 788 lignes aujourd'hui) et sur `sits` et `small_missions` (`limit(2000)`), sans effet tant que les volumes restent sous 1 000.
- **Correction minimale** : lecture paginée par `.order("id").range()` dans `fetchOrCache`, et un journal de l'écart entre le nombre lu et le nombre attendu (`count: exact`).

### P1-2. Deux générateurs de plan du site qui divergent
- **Preuve** : https://guardiens.fr/sitemap.xml (673 URL) est identique à `public/sitemap.xml`, généré au build. La fonction `sitemap` produit 568 URL avec une liste statique différente : `/conseils` présent, `/cgs` et `/devenir-home-sitter` absents.
- Le déploiement de cette fonction le 02/10 n'a donc rien changé à ce que lisent les moteurs.
- **Correction minimale** : désigner une seule source. La plus simple est le fichier de build, déjà servi. Marquer la fonction dépréciée par commentaire, sans la supprimer.

### P1-3. lastmod inventé
- **Preuve** : `generate-sitemap.mjs:165` (`today`), puis repli `|| today` aux lignes 198 à 385. Les pages statiques et légales (/, /tarifs, /cgu…) portent toutes 2026-10-02, la date du build et non celle d'une modification.
- **Impact** : les moteurs apprennent à ignorer le lastmod de tout le site.
- **Correction minimale** : ne pas écrire de lastmod quand il n'existe pas de date propre à la page.

### P1-4. guardiens.lovable.app sert la coquille en 200, sans canonical ni noindex dans le HTML
- **Preuve** : `GET https://guardiens.lovable.app/projets` (agent Googlebot) répond 200 avec le title générique, sans canonical. Pas de prérendu sur ce domaine.
- **Probable mais non vérifié** : le canonical vers guardiens.fr est posé par le JavaScript côté navigateur, ce qui limite le risque pour Google mais pas pour les robots qui n'exécutent pas le JavaScript.
- **Correction minimale** : un canonical absolu vers guardiens.fr directement dans `index.html` n'est pas possible page par page. Préférer un en-tête `X-Robots-Tag: noindex` sur ce domaine, si l'hébergement le permet (NON VÉRIFIÉ).

### P1-5. JSON-LD BreadcrumbList en double
- **Preuve Googlebot** : deux `BreadcrumbList` sur /faq, /house-sitting, /house-sitting/{ville}, /departement, /departement/{dep}, /guides, /petites-missions/{ville}, /annonces/{slug} et /observatoire-garde-animaux.
- Les JSON-LD sont valides : aucun bloc illisible sur l'échantillon.
- **Impact** : signal ambigu, et risque d'un fil d'Ariane incohérent dans les résultats.
- **Correction minimale** : un seul émetteur par page. Le doublon vient probablement d'un composant de fil d'Ariane plus d'un bloc local ; à localiser avant correction.

## P2, mineur ou à confirmer

- **P2-1. Générateur robots fragile** (confirmé). `generate-robots.mjs:63` découpe les entrées avec `\n\s{2}\}`. Le fichier `siteRoutes.ts` est indenté autrement, les entrées fusionnent et /login et /inscription (`index: false`) ne sont pas détectées : la section « Routes publiques marquées index:false » du robots servi est vide. Effet faible, puisqu'un Disallow empêcherait de toute façon de lire leur noindex. Correction : importer `siteRoutes` au lieu de le lire par expression régulière, ou supprimer cette section.
- **P2-2. /login et /inscription servies sans `meta robots`** aux robots (coquille). Leur noindex dépend du JavaScript. Elles sont à intégrer au prérendu, ou à couvrir par P0-1.
- **P2-3. /gardiens/{uuid inexistant}** répond 200 `noindex` : un faux 404, sans gravité.
- **P2-4. /projets/{uuid}** répond 200 avec un canonical vers lui-même, alors que l'adresse canonique est le slug. Le canonical devrait viser /projets/{slug}.
- **P2-5. http://www** : 2 sauts (301 puis 308). Viser un seul saut.
- **P2-6. Deuxième H1** « House-sitting : … » dans le HTML prérendu. Il vient du `<noscript>` de `index.html:117`. Probablement sans effet, car il est ignoré quand le JavaScript s'exécute. Le mettre en `<p>` lève le doute.
- **P2-7. FAQPage sur plus de 15 familles.** La fidélité au contenu visible n'est pas vérifiée une par une (NON VÉRIFIÉ).
- **P2-8. Pas d'en-tête de cache** (`cf-cache-status: DYNAMIC` partout). Aucune lenteur observée : temps de réponse médian de 76 ms côté navigateur, 85 à 800 ms côté robots.

## Non vérifié (preuve manquante)

- **Search Console** : indexation réelle, pages exclues, erreurs du plan du site.
- **Script du Worker** réellement déployé, WAF, quota, échecs et repli de Prerender : il faut un accès lecture Cloudflare et Prerender.
- **Âge du cache Prerender** par URL : seuls /projets et l'ancienne route du projet sont prouvés périmés. Le reste de l'échantillon correspond au code.
- **Maillage complet et pages orphelines** : seul un échantillon de liens a été lu. Les 60 fiches gardiens absentes du plan du site ne sont peut-être atteignables que par la recherche.
- **Différence entre le HTML prérendu et le rendu navigateur**, au-delà des titres et des H1.

## Ordre de correction proposé (chaque étape sur GO)

1. P0-1 robots.txt (générateur puis fichier), avec un test qui interprète les groupes comme Google.
2. P0-2 : `STATIC_SEO_URLS` complété, puis un seul recache de /projets et /petites-missions.
3. P0-3 : redirection serveur de l'ancienne adresse du projet, puis recache ciblé.
4. P1-1 et P1-3 dans `generate-sitemap.mjs` (pagination, lastmod).
5. P1-2 : une seule source de plan du site.
6. P1-5, puis les P2.
