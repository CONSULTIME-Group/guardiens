# Audit architecture technique SEO, guardiens.fr, 03/10/2026

Audit de la production en lecture seule : aucune base, aucune configuration Cloudflare ou Prerender modifiée, aucune purge, aucun recache, aucune publication, aucun message. Seul changement de code : le lot SEO-1 (robots), préparé et testé dans le dépôt, non publié (section 7).
Production lue : déploiement `1a94def8` (en-tête `x-deployment-id`).

## Chronologie des contrôles (horodatages réels, UTC, 03/10/2026)

Heures issues des dates de fichiers et de la commande `date -u`. Aucune heure n'est estimée.

| Heure | Contrôle | Trace |
|---|---|---|
| 10:45:25 | `GET /robots.txt` (en-têtes et corps) | `/tmp/seo/robots.txt`, `robots.h` |
| 10:45:52 | `GET /sitemap.xml`, 673 URL extraites | `/tmp/seo/sitemap.xml`, `urls.txt` |
| 10:45:59 à 10:46:11 | 673 URL, agent navigateur, 6 simultanées, sans suivre les redirections | `/tmp/seo/browser.jsonl` |
| jusqu'à 10:46:37 | 61 URL (43 représentatives + 18 cas limites), agent Googlebot, 3 simultanées | `/tmp/seo/google.jsonl` |
| 10:48:02 | Lecture paginée des profils publics (clé publique) | `/tmp/seo/p0.json`, `p1000.json`, `sp.json` |
| 10:49:14 | Première version de ce rapport | |
| 10:52:45 à 10:52:53 | Relecture des mêmes 61 URL, agent Googlebot, 2 simultanées, pour garder liens `<a href>`, JSON-LD complets et texte | `/tmp/seo2/deep.jsonl`, script `deep.py` |
| 03/10/2026, heure exacte non conservée | Requêtes SELECT : `prerender_family_state`, `prerender_recache_log`, déclencheurs `pg_trigger` | ci-dessous |
| 11:02:03 à 11:02:04 | 5 URL, agent Googlebot : /projets/audit-inexistant-20261003, /actualites, /actualites?page=2, /annonces, /guides-locaux | `/tmp/seo2/art1`, `art2` |

Aucun crawl Googlebot des 673 URL. Aucun lien d'action d'email ni aucun jeton visité.

## Ce qui n'est pas vérifié

- **Search Console** : côté ChatGPT, une connexion Google est nécessaire ; la tentative n'a pas fourni d'accès vérifié et le contrôle suivant a expiré. État d'authentification inconnu. Indexation Google réelle, pages exclues, erreurs de plan du site : NON VÉRIFIÉ.
- **Worker Cloudflare réellement déployé, WAF, règles de cache, console Prerender** : NON VÉRIFIÉ. `cloudflare-worker-prerender.js` du dépôt est un miroir ancien, pas une preuve. Seul le comportement observé est rapporté.
- **Prerender.io** (quota, échecs, âge du cache par URL, durée de conservation) : NON VÉRIFIÉ côté console. La base n'enregistre que nos propres demandes de recache (section 4).
- **Maillage complet** : couverture PARTIELLE (61 pages lues sur 673). Voir section 2.

## Ce qui est sain (confirmé)

- Les 673 URL du plan du site répondent 200, sans doublon, toutes sur https://guardiens.fr.
- Les robots reçoivent un HTML prérendu (`x-prerender-requestid`), avec title, description et H1 propres à chaque page.
- Échantillon Googlebot (61 URL) : un seul canonical par page indexable, auto-référent, sauf les cas P0 et P1-6.
- Inexistant : /page-inexistante-xyz, /actualites/article-inexistant-xyz, /house-sitting/ville-inexistante-xyz répondent 404 `noindex, follow`.
- /projets?utm_source=x et /tarifs/ : canonical vers l'URL propre. /recherche, /search : `noindex, follow`.
- http vers https (301), www vers l'apex (308). Préversion id-preview : 401.
- Bing et les robots IA reçoivent le même prérendu que Google (contrôle sur Evreux).
- Comparaison du 03/10 vers 10:45 UTC, avant SEO-1 : robots.txt et plan du site servis identiques à `public/robots.txt` et `public/sitemap.xml`. Depuis, `public/robots.txt` a été régénéré par SEO-1 et diffère encore de la production (non publié) ; `public/sitemap.xml` est inchangé.
- Aucun JSON-LD illisible sur l'échantillon.

## P0, défauts confirmés à fort impact

### P0-1. /projets est dans le plan du site mais servi `noindex` aux robots
- **Preuve** : Googlebot, 10:46 puis 10:52:46 : `https://guardiens.fr/projets` 200, `meta robots: noindex, follow`, H1 « Des chantiers ouverts, chez des particuliers ». Même résultat sur `/projets/`.
- **Code actuel** : `ProjetsListing.tsx:122` met `noindex` seulement si la liste est vide. La production publiée affiche « Des projets à réaliser ensemble » (constaté le 02/10). Le HTML servi est donc un instantané antérieur au reclassement du 02/10.
- **Ce qui explique qu'il ne soit pas rafraîchi (confirmé, mais cause unique NON établie)** :
  - `STATIC_SEO_URLS` (`_shared/static-seo-refresh.ts:11`) ne contient pas /projets ni /petites-missions ;
  - aucun déclencheur de recache sur `small_missions` (SELECT `pg_trigger`, section 1) ;
  - `prerender_recache_log`, 60 derniers jours : aucune ligne pour /projets, /petites-missions, /annonces, /races, /associations.
  - Ce qui reste inconnu : la durée de conservation du cache côté Prerender, et une éventuelle règle Worker. Sans console, on ne peut pas exclure une autre cause.
- **Règle Google** : un plan du site doit lister les URL que l'on veut voir indexées, et `noindex` exclut la page (https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap, https://developers.google.com/search/docs/crawling-indexing/block-indexing).
- **Correction minimale** : ajouter /projets et /petites-missions à `STATIC_SEO_URLS`, puis un recache unique de ces deux URL.

### P0-2. L'ancienne adresse du projet reste une page indexable distincte
- **Preuve Googlebot 10:52:51** :
  - `/petites-missions/chantier-participatif-de-plantation` : 200, `index, follow`, canonical vers elle-même, ancien titre.
  - `/petites-missions/e5724f3e-…` : 200, canonical vers l'ancienne adresse.
- **Code** : `SmallMissionDetail.tsx:259` redirige vers /projets/… seulement dans le navigateur (`navigate`). Le prérendu fixé avant le reclassement ne contient pas cette redirection.
- **Règle Google** : pour fusionner deux URL, une redirection serveur est le signal le plus fort, le canonical est un indice (https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- **Correction minimale** : redirection 301 serveur vers /projets/chantier-participatif-de-plantation. À défaut, recache ciblé de l'ancienne adresse, dont le rendu actuel redirige déjà en JavaScript (effet sur Google probable, non garanti).

## P1, défauts confirmés à impact moyen

### P1-1. Groupes robots nommés sans les restrictions de `*` (contrôle d'exploration). CORRIGÉ EN CODE (SEO-1), non publié
- **Preuve** : robots.txt 10:45:25. `User-agent: Googlebot`, Bingbot, GPTBot, OAI-SearchBot, ClaudeBot… n'ont que `Allow: /`. Les `Disallow` (/admin, /dashboard, /messages, /sits, paramètres de suivi) sont seulement sous `*`.
- **Règle** : un robot suit le seul groupe le plus spécifique, les groupes ne fusionnent pas (https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec).
- **Portée exacte** : c'est une question d'exploration, pas de sécurité. Les espaces privés restent protégés par l'authentification ; robots.txt n'empêche ni l'accès ni l'indexation (https://developers.google.com/search/docs/crawling-indexing/robots/intro).
- **Effet observé** : /dashboard, /admin, /sits, /messages, /login, /inscription répondent 200 aux robots avec la coquille générique (title de l'accueil, ni canonical ni `meta robots`, 7 liens). Ce sont des pages quasi identiques en 200, que Google peut traiter en soft 404 ou en doublons (https://developers.google.com/search/docs/crawling-indexing/http-network-errors#soft-404-errors). Indexation réelle NON VÉRIFIÉE.
- **Correction minimale** : dans `generate-robots.mjs`, recopier les `Disallow` dans chaque groupe nommé (ou supprimer les groupes `Allow: /` seul), conserver ByteSpider et cohere-ai en `Disallow: /`, ne pas interdire les chemins qui doivent exposer un `noindex`.

### P1-2. Lecture des profils source plafonnée à 1 000, 60 éligibles absents du sitemap
- **Preuve** : `scripts/generate-sitemap.mjs:285`, `.limit(5000)` sans ordre ; l'API répond `content-range: 0-999/1329`. Règle `isSitterProfileIndexable` recalculée sur les 1 329 fiches : 141 éligibles, 81 au plan, 60 manquantes, aucune non éligible présente.
- Même risque latent sur `public_sitter_profiles` (788 lignes), `sits` et `small_missions` (`limit(2000)`).
- **Correction minimale** : pagination `.order("id").range()` et journal de l'écart avec `count: exact`.

### P1-3. Deux générateurs de plan du site divergents
- **Preuve** : le plan servi (673 URL) est le fichier du build. La fonction `sitemap` produit 568 URL avec une liste statique différente (`/conseils` présent, `/cgs` et `/devenir-home-sitter` absents).
- **Correction minimale** : un commentaire ne résout pas la divergence. Le prochain lot doit identifier les consommateurs de la fonction `sitemap` (Worker, appels, liens), puis la déprécier ou la raccorder au générateur servi, avec un test de parité des listes d'URL.

### P1-4. lastmod sans date propre à la page
- **Preuve** : `generate-sitemap.mjs:165` (`today`) et replis `|| today` lignes 198 à 385. Pages statiques et légales à 2026-10-02 (date du build).
- **Règle** : Google n'utilise `lastmod` que s'il est vérifiablement exact (https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- **Correction minimale** : omettre `lastmod` sans date propre.

### P1-5. Familles sans invalidation lors d'une modification
Voir section 1. Dans le code et les traces étudiées (`prerender_recache_log`, déclencheurs, `STATIC_SEO_URLS`), aucun mécanisme d'invalidation n'a été trouvé pour annonces, entraide, projets, associations, races, questions et auteurs : ni déclencheur ni entrée statique lors d'une création, d'un reclassement, d'une clôture ou d'une suppression, pour la fiche comme pour le hub qui la liste. Ce n'est pas la garantie qu'aucun système externe (Worker, console Prerender, non vérifiés) ne rafraîchit ces URL. Les cas P0 en sont des exemples. Correction minimale : étendre le marquage existant (`prerender_family_state`, `consume-seo-dirty`) aux familles à contenu en base, dans le budget mensuel déjà prévu.

### P1-6. /projets/{uuid} déclare son propre canonical
- **Code** : `ProjetDetail.tsx:56` accepte l'UUID ; `PublicMissionView.tsx:201` appelle `PageMeta` sans `canonical`, qui prend donc l'URL courante.
- **Production** : `/projets/e5724f3e-…` 200 `index, follow`, canonical vers lui-même (10:52:51). Deux URL indexables pour une fiche.
- **Correction minimale** : canonical vers `/projets/{slug}` quand le slug existe.

## P2, mineur ou à confirmer

- **P2-1. BreadcrumbList multiples** (section 3). Plusieurs fils ne sont pas invalides en soi : Google accepte plusieurs fils d'Ariane sur une page (https://developers.google.com/search/docs/appearance/structured-data/breadcrumb). Seuls les doublons strictement identiques sont du bruit, et les fils divergents méritent un alignement.
- **P2-2. Générateur robots fragile. CORRIGÉ EN CODE (SEO-1), non publié.** Défaut : `generate-robots.mjs:63` analysait les objets TS par expression régulière dépendante de l'indentation. Résultat souhaité, inchangé : /login et /inscription restent explorables et rendent `noindex`. Correction : lecture par l'arbre syntaxique TypeScript, sans lecture de `staticRoutes`.
- **P2-3. /login, /inscription sans `meta robots` dans le HTML servi** (coquille, hors prérendu).
- **P2-4. /gardiens/{uuid inexistant}** : 200 `noindex` (faux 404, page `noindex` donc sans risque d'indexation).
- **P2-5. http://www** : deux sauts (301 puis 308).
- **P2-6. Second H1** venant du `<noscript>` de `index.html:117`. Effet probablement nul.
- **P2-7. guardiens.lovable.app** sert la coquille 200 sans canonical dans le HTML (Googlebot, /projets). Le canonical est posé par JavaScript. Risque faible pour Google, non nul pour les robots sans JavaScript. Moyen de poser un `X-Robots-Tag` sur ce domaine : NON VÉRIFIÉ.
- Retiré de la version précédente : « pas d'en-tête de cache ». `cf-cache-status: DYNAMIC` n'est pas un défaut SEO sans lenteur observée (temps médian 76 ms navigateur, 85 à 800 ms robots).

### P2-8 (anciennement P1-7). FAQPage déclarée mais absente du texte servi, qualité des données structurées
- **Contexte Google (contre-audit ChatGPT, vérification documentaire du 03/10/2026)** : l'ancienne page FAQPage (`/search/docs/appearance/structured-data/faqpage`) redirige vers https://developers.google.com/search/updates. Le journal des changements du 08/05/2026 indique l'arrêt des résultats enrichis FAQ depuis le 07/05/2026 et la suppression de cette documentation le 15/06/2026.
- **Portée** : défaut de fidélité du balisage au contenu visible, pas une perte d'éligibilité à un résultat enrichi FAQ, qui n'est plus offert. Aucun gain de résultat enrichi ni aucune pénalité de classement n'est démontré ou promis.
- **Règle appliquée** : le balisage doit décrire un contenu visible par l'utilisateur sur la page (https://developers.google.com/search/docs/appearance/structured-data/sd-policies, lignes 156 à 166 selon le contre-audit).
- **Contrôle** : chaque question du JSON-LD recherchée (40 premiers caractères) dans le texte HTML servi, hors `<noscript>`.

| Page | Questions absentes | Cause en code |
|---|---|---|
| /races/{slug} (2 lues) | 4/4 | `BreedPage.tsx:142` : `faqQuestions` n'est utilisé que pour le schéma (lignes 142 et 171) ; confirmé |
| /departement/{slug} (2 lues) | 2/2 | `DepartmentPage.tsx:506` : schéma seul ; aucun rendu visible repéré, à confirmer à la ligne |
| /observatoire-garde-animaux | 4/4 | `Observatoire.tsx:236` : schéma seul ; confirmé sur le HTML servi |
| /devenir-home-sitter | 5/5 (formulation) | questions visibles avec un autre libellé (`DevenirHomeSitter.tsx:186`), certaines questions du schéma probablement absentes |

Confirmé aussi par le contre-audit ChatGPT (HTTP, texte hors script, style et noscript) : /races/dog-cane-corso 4/4 questions absentes, /departement/indre-et-loire 2/2.

Les 12 autres pages avec FAQPage de l'échantillon (/, /faq, /tarifs, entraide, villes, guides, associations…) : 0 question absente.
Prochain correctif de qualité : aligner le schéma sur des questions affichées, ou le retirer là où elles ne le sont pas. Note : la réponse département contient « 0 € » alors que la règle éditoriale impose « gratuit ».

## 1. Familles de routes, générateurs et invalidation

Sources : `src/App.tsx` (routes), `src/data/siteRoutes.ts`, `scripts/generate-sitemap.mjs` (plan servi), `supabase/functions/sitemap` (non servie), `STATIC_SEO_URLS`, déclencheurs `pg_trigger` (SELECT), `prerender_family_state` et `prerender_recache_log` (SELECT, 60 jours).

Déclencheurs présents en base : `articles`, `city_guides`, `seo_city_pages`, `seo_department_pages` (`trg_recache_prerender`), `profiles` et `sitter_profiles` (`mark_*_seo_dirty`). Familles marquées : articles (dernier 01/10 15:00), cities, departments, guides (30/09 13:50), static (02/10 10:00).

| Famille (route App) | Au plan servi | Canonical / slug | noindex dynamique | Invalidation sur modification | Recache 60 j |
|---|---|---|---|---|---|
| / et pages fixes (tarifs, faq, contact, a-propos) | oui | auto | non | statique au déploiement | 25 chacune |
| Légales (/cgu, /cgs, /confidentialite, /mentions-legales, /cookies) | oui sauf /cookies | auto | non | AUCUNE | 0 |
| /devenir-home-sitter, /gardien-urgence, /observatoire-garde-animaux | oui | auto | non | AUCUNE | 0 |
| /actualites, /actualites/:slug, /auteurs/:slug | oui (101 + 2) | slug | lignes noindex filtrées | articles : oui ; auteurs : non | 264 |
| /house-sitting, /house-sitting/:slug | oui (161) | slug | oui (contenu, gardiens) | oui | 636 |
| /departement, /departement/:slug | oui (98) | slug | oui | oui | 1 084 |
| /guides, /guides/:slug | oui (95) | slug | lignes filtrées | oui (`city_guides`) | 288 |
| /races, /races/:slug | oui (77) | slug | non | AUCUNE | 0 |
| /annonces, /annonces/:id | oui (9) | slug-suffixe | fermées exclues | AUCUNE | 0 |
| /gardiens/:id | 81 sur 141 éligibles | UUID | `isSitterProfileIndexable` | oui (`profiles`, `sitter_profiles`) | 207 |
| /petites-missions, /petites-missions/{14 villes}, /:id | oui (16) | slug ou UUID | oui (fiche) | AUCUNE | 0 |
| /projets, /projets/:slug | oui (1 + 1) | slug ou UUID (P1-6) | oui (liste vide, fiche) | AUCUNE | 0 |
| /associations, /associations/:slug | oui (11) | slug | non | AUCUNE | 0 |
| /questions/:id | non | UUID | inconnu | AUCUNE | 0 |
| /conseils, /alma | non (servi), /conseils oui dans la fonction | auto | non | AUCUNE | 0 |
| Privés (/dashboard, /admin/*, /sits, /messages…), auth | non | aucun | JavaScript seulement | sans objet | sans objet |

Écarts : `/questions/:id` et `/alma` sont publics sans politique d'indexation lisible dans le plan ; `/conseils` n'apparaît que dans la fonction non servie. `generate-robots.mjs` lisait `siteRoutes.ts` par expression régulière (P2-2, corrigé en code) ; le plan lit les données en base, pas `siteRoutes`. Il n'existe donc pas une source unique des routes.

## 2. Maillage crawlable (couverture partielle)

Méthode : liens `<a href>` internes extraits des 61 HTML Googlebot (10:52), parcours en largeur depuis /. Ce n'est pas un crawl complet : les profondeurs « inconnues » ne veulent pas dire « orphelines ».

- **Navigation non explorable (confirmée en code)** : l'absence d'attribut `onclick` dans le HTML ne prouve rien, React attache ses gestionnaires sans attribut. Défauts confirmés : navigation du bandeau en `Button onClick navigate` (`PublicHeader.tsx`, lignes 164 à 179 environ, menu mobile dans une Sheet non montée) et pagination de /actualites en `Button onClick` (`News.tsx`), voir section 6.
- **Liens `<a href>` lus** : 46 liens communs (essentiellement pied de page) sur les pages de plus de 40 liens.
- **Profondeur des 673 URL du plan** : 1 à 0 clic, 54 à 1 clic, 360 à 2 clics, 10 à 3 clics, 248 inconnues dans l'échantillon. 506 des 673 URL sont la cible directe d'au moins un lien lu.
- **Inconnues par famille** : /gardiens 77, /actualites 76, /annonces 4, /guides 2, /petites-missions 1.
- **Fiches gardiens** : aucun hub (/, /house-sitting, /departement, /guides, /annonces) ne lie de fiche. Liens vus seulement depuis 2 pages ville et la fiche de mission. Atteignabilité de la plupart des 81 fiches par liens : NON PROUVÉE ; elles dépendent probablement du plan du site.
- **Hubs (contre-audit ChatGPT, HTTP)** : /house-sitting lie 161/161 villes du plan, /departement 98/98, /races 77/77, /associations 11/11, /guides 92/95, /projets 0/1.
- **Races** : /races n'est lié que depuis les pages races et une annonce dans l'échantillon, aucun lien /races sur l'accueil lu. Probable sous-maillage, orphelinat non prouvé.
- **Annonces** : 4 liens depuis /. Le hub /annonces n'expose aucun lien vers une fiche de garde, seulement /annonces/international (contrôle 11:02:03, section 6). Les autres annonces du plan ne sont pas prouvées atteignables.
- **Projets** : /projets n'est lié que depuis les pages projet dans l'échantillon, aucun lien sur l'accueil lu.
- **Pagination** : aucun lien `page=` explorable ; /actualites?page=2 sert les mêmes 15 articles que /actualites (section 6). Aucun piège de filtres vu : liens à paramètres limités à `/inscription?redirect=`, `?role=`, `/login?redirect=`, `/contact?sujet=`, `/search?ville=`, `/petites-missions?city=`. Les deux derniers mènent à des pages `noindex` ou à canonical propre.
- Règle de référence : https://developers.google.com/search/docs/crawling-indexing/links-crawlable.

## 3. Fils d'Ariane : doublons localisés

`PageBreadcrumb.tsx:55` émet un BreadcrumbList avec le fil visible. Plusieurs pages ajoutent un second bloc local.

| Page | Fil A | Fil B | Nature | Émetteurs |
|---|---|---|---|---|
| /petites-missions/toulouse, /lille | Accueil > Entraide > Ville | identique | doublon strict | `MissionsCityPage.tsx:134` + `:147` (PageBreadcrumb) |
| /observatoire-garde-animaux | Accueil > Observatoire | identique | doublon strict | `Observatoire.tsx` + PageBreadcrumb |
| /house-sitting | Accueil > House-sitting | identique | doublon strict | `HouseSittingHub.tsx:59` + `:91` |
| /departement | Accueil > Départements | identique | doublon strict | `DepartmentsIndex.tsx` + PageBreadcrumb |
| /faq | Accueil > Questions fréquentes | Guardiens > FAQ | divergent | `FAQ.tsx:288` + `:162` |
| /guides | Accueil > Guides locaux | Guardiens > Guides locaux | divergent (racine) | `GuidesListing.tsx` |
| /departement/{slug} | Accueil > Départements > Dép. | Guardiens > Dép. | divergent | `DepartmentPage.tsx:463` + `:206` |
| /house-sitting/{ville} | … > Ville | … > House-sitting à Ville | divergent (libellé) | `CitySchemaOrg.tsx` / `CityHero.tsx` |
| /annonces/{slug} | Accueil > Annonces > Titre | Accueil > Titre | divergent | `PublicSitDetail.tsx:568` + composant visible |

Correction minimale : supprimer le bloc local là où il est identique ; aligner sur le fil visible là où il diverge.

## 4. Portes de rendu, statut HTTP, risques de performance (code)

- `main.tsx:68` : /gardiens/* commence avec `prerenderReady = false` ; repli à 10 s (`main.tsx:84`) sauf /annonces/* et fiches en attente de métadonnées. `PageMeta.tsx:253` lève le drapeau après écriture des balises, sauf `ready === false`.
- Risque : une page qui garde `ready` faux après une erreur réseau ne lève jamais le drapeau ; Prerender rend alors à son délai maximal. Gardé par `PublicSitterProfile.tsx:1210` pour la fiche ; non vérifié pour /annonces/* (exclu du repli de 10 s), à confirmer sur le chemin d'erreur de `PublicSitDetail.tsx:81`.
- Statut : `PageMeta.tsx:193` pose `prerender-status-code`. Confirmé 404 en production pour articles, villes et URL inconnues ; /gardiens/{uuid inexistant} ne le pose pas (P2-4).
- Échecs déjà enregistrés en base (SELECT `prerender_recache_log`, 30 jours) : toutes les lignes avec code sont en 200 ; 125 lignes `deploy-detector` sans code (marquages, pas des rendus). Aucun échec de rendu enregistré ; cela ne prouve rien côté Prerender, dont les journaux ne sont pas lus.
- Performance : aucune mesure nouvelle ; risques identifiés seulement par lecture du code ci-dessus.

## 5. Projets : UUID, slug, canonical

| URL (Googlebot, 10:52:51) | Statut | robots | Canonical servi |
|---|---|---|---|
| /projets/chantier-participatif-de-plantation | 200 | index, follow | elle-même |
| /projets/e5724f3e-… | 200 | index, follow | elle-même (P1-6) |
| /petites-missions/chantier-participatif-de-plantation | 200 | index, follow | elle-même, ancien titre (P0-2) |
| /petites-missions/e5724f3e-… | 200 | index, follow | /petites-missions/chantier-… (P0-2) |

Code actuel : le canonical de la fiche projet n'est pas fixé (P1-6) ; la redirection ancienne route vers /projets n'existe qu'en JavaScript (P0-2).

## Ordre des lots minimaux

Préparation du code et des tests : possible sans attente. Mise en production, purge ou recache, et migration : sur GO de Jérémie uniquement.

0. **SEO-1, robots** : préparé le 03/10 (section 7), non publié.
1. **Lot A, projets** : `STATIC_SEO_URLS` + /projets et /petites-missions (P0-1) ; PageMeta 404 dans la branche « projet introuvable » (P1-8) ; canonical slug sur /projets/{uuid} (P1-6) ; règle de redirection de l'ancienne adresse (P0-2). Mise en ligne puis recache ciblé de 4 URL.
2. **Lot C, plan du site** : pagination, lastmod, source unique avec test de parité (P1-2, P1-3, P1-4).
3. **Lot D, invalidation** : marquage des familles annonces, entraide, projets, associations, races (P1-5), dans le budget mensuel existant. Exige une migration (déclencheurs).
4. **Lot E, données structurées** : FAQ alignées ou schéma retiré (P2-8, qualité), doublons stricts de fils d'Ariane supprimés (section 3).
5. **Lot F, maillage** : pagination /actualites traitée en un seul lot (liens `<a href>`, paramètre `page` conservé par la normalisation et par le Worker, canonical par page) ; navigation du bandeau en liens ; liens HTML vers les fiches de garde sur /annonces ; lien /guides-locaux remplacé par /guides ; /races et /projets reliés depuis l'accueil, après mesure complète.
6. P2 restants.

## Annexe A, statistiques reproductibles

- Plan du site : 673 URL (`/tmp/seo/urls.txt`). Par famille : actualites 101, house-sitting 161, departement 98, guides 95, gardiens 81, races 77, petites-missions 16, associations 11, annonces 9, auteurs 2, projets 1, hubs et fixes 21.
- Agent navigateur : 673/673 en 200. Agent Googlebot : 61 URL, réparties en catégories mutuellement exclusives recalculées depuis `/tmp/seo/google.jsonl` (statut final, `meta robots`, `X-Robots-Tag`, canonical), sans nouveau GET : 46 en 200 avec canonical et sans `noindex` (dont les cas P0-2 et P1-6) ; 6 en 200 `noindex` (/projets, /projets/, /projets?utm_source=x, /recherche, /search, /gardiens/{uuid inexistant}) ; 6 coquilles 200 sans canonical ni `meta robots` (/login, /inscription, /dashboard, /admin, /sits, /messages) ; 3 en 404 (pages inexistantes testées). Total 61.
- Fils d'Ariane : 13 pages sur 61 avec 2 blocs, dont 5 identiques et 8 divergents.
- FAQPage : 16 pages ; 4 familles avec questions absentes du texte servi (P2-8).
- Reproduire : `python3 /tmp/seo/crawl.py urls.txt "<UA>" 6` et `python3 /tmp/seo2/deep.py` (2 simultanées, lit `google.jsonl`).

## Annexe B, extraits de preuve (sans donnée membre)

```text
GET https://guardiens.fr/projets  UA Googlebot  10:52:46
200  x-prerender-requestid: présent
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="https://guardiens.fr/projets">
<h1>Des chantiers ouverts, chez des particuliers</h1>

GET https://guardiens.fr/petites-missions/chantier-participatif-de-plantation  10:52:51
200  <meta name="robots" content="index, follow">
<link rel="canonical" href="https://guardiens.fr/petites-missions/chantier-participatif-de-plantation">

GET https://guardiens.fr/dashboard  UA Googlebot  10:52:52
200  <title>House-sitting : faire garder sa maison et ses animaux | Guardiens</title>
pas de canonical, pas de meta robots, 7 liens

robots.txt 10:45:25
User-agent: Googlebot
Allow: /
...
User-agent: *
Disallow: /admin
Disallow: /dashboard
```

## 6. Compléments du 03/10 (non corrigés dans ce tour)

Source indiquée pour chaque point : « vérifié ici » (commande et heure) ou « contre-audit ChatGPT » (HTTP, lecture SQL ou code selon le point, non refait ici).

- **P1-8, soft 404 sur les projets (remonte au-dessus des P2).** Vérifié ici à 11:02:03 : `GET /projets/audit-inexistant-20261003` (Googlebot) répond 200, canonical vers cette URL inexistante, aucune `meta robots`. Observé : HTTP 200 et absence de noindex, donc page indexable en principe ; indexation réelle NON VÉRIFIÉE. Cause en code : la branche `!projet` de `ProjetDetail.tsx` ne rend pas de `PageMeta` (ni `noindex`, ni `statusCode={404}`). Règle : https://developers.google.com/search/docs/crawling-indexing/http-network-errors#soft-404-errors.
- **Fiches gardiens éligibles.** Contre-audit ChatGPT (lecture SQL, jointures `public_profiles`, `public_sitter_profiles`, `public_sitter_gallery_counts`) : 141 éligibles, 81 au plan, 60 manquantes. Concorde avec mon calcul de 10:48:02 (P1-2).
- **Pagination /actualites, triple défaut.** Vérifié ici à 11:02:03 : `/actualites` et `/actualites?page=2` exposent les mêmes 15 liens d'articles (listes identiques) et le même canonical `/actualites`. Contre-audit ChatGPT (code) : pagination en `<Button onClick>` dans `News.tsx`, `normalizePathname` supprime la query, `PRERENDER_KEEP_PARAMS` vide dans le miroir Worker (script de production NON VÉRIFIÉ). À traiter ensemble : remplacer les boutons seuls ne rendrait pas les pages 2 et suivantes explorables. Règle : https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading.
- **Navigation du bandeau.** Contre-audit ChatGPT (code) : `PublicHeader.tsx` vers les lignes 164 à 179, `NAV_DEFS` rendu en `Button onClick navigate`, pas en `<a href>` ; le menu mobile utilise des `Link` mais dans une Sheet fermée, non montée. Dans les HTML que j'ai lus, aucun lien /projets ni /races sur l'accueil. Cela ne prouve pas que ces familles soient orphelines : pas de crawl complet.
- **/annonces sans maillage HTML vers les gardes.** Vérifié ici à 11:02:03 : aucun lien vers une fiche de garde, hormis /annonces/international. Un ItemList JSON-LD ne remplace pas un lien HTML. Contre-audit ChatGPT (code) : le drapeau `ready` de `PublicListings` dépend de la requête ItemList, pas du moteur de recherche affiché. À examiner dans un lot suivant.
- **Lien vers une page inexistante.** Vérifié ici à 11:02:03 et 11:02:04 : `/annonces` lie `/guides-locaux` (`PublicListings.tsx:167`), qui répond 404 `noindex, follow`. Destination attendue : `/guides`.
- **Couverture des hubs.** Contre-audit ChatGPT (HTTP) : /house-sitting lie 161/161 villes du plan, /departement 98/98, /races 77/77, /associations 11/11, /guides 92/95 (manquent marrakech, plouescat, pusignan), /projets 0/1 avec noindex et ancien texte. Cela précise la section 2 : les familles villes, départements, races et associations sont entièrement reliées depuis leur hub.
- **Historique des rafraîchissements.** Contre-audit ChatGPT (lecture SQL) : depuis le 01/10, 89 succès HTTP 200 et 6 succès à statut nul dans `prerender_recache_log`, aucune trace pour /projets ni pour l'ancienne URL du projet. Une absence de trace ne prouve pas une panne complète.
- **Clés de cache du générateur de plan du site (risques reproductibles, perte non prouvée).** Contre-audit ChatGPT (code) : le cache `public_profiles` est invalidé sur `created_at` et le nombre de lignes, il ne voit donc pas un changement de bio, de motivation, d'identité ou de galerie, qui fait pourtant basculer l'éligibilité. La clé entraide repose sur `created_at` et un compte, avec une condition qui dépend de la date du jour (missions passées). Une fiche peut ainsi devenir éligible ou inéligible sans régénération.

## 7. SEO-1 préparé : robots.txt (non publié)

- **Groupes** : un groupe pour ByteSpider et cohere-ai (`Disallow: /`) ; un groupe unique qui nomme tous les robots autorisés (moteurs, IA, outils SEO) plus `*`, avec `Allow: /`, les paramètres de suivi et les 18 chemins privés. Politique d'ouverture aux IA inchangée.
- **Portée** : robots.txt règle l'exploration. Il n'empêche pas l'indexation d'une URL connue par ailleurs et ne protège pas les espaces privés, que l'authentification protège.
- **Pages noindex** : /login, /inscription, /search, /recherche, /recherche-gardiens et /gardiens/* restent explorables ; le générateur refuse ces chemins exacts (et leur forme avec barre finale) dans les chemins privés, et `index: false` n'est plus traduit en Disallow. Ce garde-fou ne couvre pas toutes les variantes glob (par exemple `/gardiens/*`) : les tests vérifient le fichier produit, pas toute règle future.
- **Lecture des routes** : `SITE_URL` et `privateDisallowPaths` lus par l'arbre syntaxique TypeScript (`scripts/robots-lib.mjs`) ; `staticRoutes` n'est plus lu par ce générateur.
- **Tests** : `src/__tests__/robots-groups.test.ts`, 33 cas, plus les 4 tests existants `sitter-profile-indexability-single-source.test.ts`, soit 37/37 passés le 03/10 à 11:01:46 ; `generate-robots:check` passé.

## 8. SEO-2 projets préparé (non publié, 03/10/2026)

Préparé et testé dans le dépôt après le GO de Jérémie pour le lot SEO. Rien n'est publié, déployé, purgé ni recaché. Le correctif proximité, le plan du site, le maillage, les notifications et la politique Cloudflare ne sont pas touchés.

| Défaut | Changement préparé | Fichiers |
|---|---|---|
| P0-1 /projets servi `noindex` périmé | Hub indexable dès qu'un projet ouvert éligible (`isIndexableProjetMission`) est lu ; une lecture en erreur répond 503 + `noindex` (non mis en cache par Prerender) au lieu d'un faux « aucun projet » ; jamais prêt pendant le chargement. /projets et /petites-missions ajoutées à `STATIC_SEO_URLS` (8 URL, budget inchangé de 6 par passage : 6 au premier passage, 2 au suivant, un échec reste en file) | `ProjetsListing.tsx`, `src/lib/projetSeo.ts`, `_shared/static-seo-refresh.ts` |
| P0-2 ancienne adresse projet | `/petites-missions/{slug ou uuid}` d'une annonce de catégorie projet : `prerender-status-code` 301 + `prerender-header: Location: https://guardiens.fr/projets/{slug}` (mécanisme déjà utilisé par `NavigateGuideSlug`, `CityPage`, `DepartmentPage`), remplacement d'adresse côté navigateur. L'entraide ordinaire garde sa redirection uuid vers slug actuelle | `SmallMissionDetail.tsx`, `components/seo/LegacyProjetRedirect.tsx` |
| P1-6 /projets/{uuid} | canonical explicite vers `/projets/{slug}` (repli `/projets/{id}` sans slug) | `ProjetDetail.tsx`, `PublicMissionView.tsx` (prop `canonical` facultative) |
| P1-8 projet inexistant | 404 + `noindex`, sans canonical ; erreur de lecture distincte : 503 + `noindex`, bouton « Réessayer », jamais le message « retiré » | `ProjetDetail.tsx` |
| Rendu prématuré | `/projets/` ajouté à `LATE_META_PATH_PREFIXES` : le délai de secours de 10 s ne lève plus le drapeau avant `PageMeta` | `src/main.tsx` |

**Base (SELECT, 03/10/2026, heure exacte non conservée)** : un seul projet, `chantier-participatif-de-plantation`, ouvert, 779 caractères, date 14/11/2026, donc éligible : le hub sera indexable une fois publié et recaché.

**Statut déclaré et statut servi.** Le code DÉCLARE les statuts à Prerender (`prerender-status-code` 404, 503 ou 301 et `prerender-header`). Le statut réellement servi en production reste INCONNU jusqu'au GET de contrôle après activation.
- 404 : déjà observé relayé en production pour d'autres familles (section 4).
- 301 : le miroir Worker relaie les 3xx de Prerender (`redirect-passthrough`), mais le script de production est NON VÉRIFIÉ et aucun 301 `prerender-header` n'a été observé dans cet audit.
- 503 : selon le miroir, une réponse 5xx de Prerender part en `fallback-upstream-error`, c'est-à-dire la coquille d'origine en 200. Un robot recevrait alors probablement la coquille, pas le 503. Ce que sert réellement le Worker reste à vérifier ; le 503 n'est pas une promesse tenue tant que ce contrôle n'est pas fait.

**Robustesse de la fiche (revue du 03/10, 11:29 UTC) :** une lecture de l'auteur en échec laisse l'auteur vide sans bloquer la page ni la changer en absence ; chaque lecture porte une génération et une clé de route (paramètre + « Réessayer ») vérifiées dès le rendu, donc aucune réponse ancienne, ni ancien titre, projet, auteur ou canonical n'est rendu pendant le chargement d'un autre paramètre ; les balises d'un projet précédent (canonical, statut, en-tête Prerender) sont retirées et le drapeau Prerender abaissé avant l'affichage.

**Revue finale (03/10, SHA 7889f4161da48baf2e0a6ba6da3cdf3f089a6c1c) :** nettoyage strict local dans `ProjetDetail` (`scrubStaleProjetHead`) : toutes les balises `data-page-meta` du projet précédent (titre, description, og/twitter, canonical, robots, JSON-LD) et les consignes Prerender sont retirées, titre neutre « Chargement du projet | Guardiens », `prerenderReady=false` et `prerenderMetaPending=true` maintenus. `PageMeta` global et candidatures non modifiés. Test avec `PageMeta` réelle : au premier commit de B en chargement, titre, description, canonical et JSON-LD de A absents, puis métadonnées de B correctes. Correctif en attente de publication.

**Limites :**
- Le navigateur reçoit un remplacement d'adresse en JavaScript, pas un 301 HTTP.
- Si le Worker ne relaie pas le `Location`, une règle de redirection Cloudflare ciblée sur `/petites-missions/chantier-participatif-de-plantation` serait l'alternative, à décider après revue ; le miroir `cloudflare-worker-prerender.js` n'est pas modifié.
- Une annonce reclassée plus tard ne déclenche toujours aucun recache (P1-5, lot D).
- **Publication et fonctions serveur.** La documentation Lovable (https://docs.lovable.dev/features/publish.md) indique qu'une publication peut échouer à cause d'« une fonction serveur qui n'a pas pu être déployée » : la publication du site peut donc déployer des fonctions serveur. Aucune documentation consultée ne garantit qu'une publication du site laisse `send-mass-email-proximity` à sa version actuelle. Réponse de l'assistant de documentation contradictoire, non retenue comme preuve. À traiter comme un risque : une publication globale peut déployer la fonction proximité dont la réservation dédiée n'est pas appliquée en base, ce qui bloquerait tout envoi de proximité (sans doublon possible). Le déploiement ciblé existe côté outil (`deploy_edge_functions` avec une liste de noms), donc `detect-deploy-and-mark-dirty` et `consume-seo-dirty` peuvent être déployées seules ; c'est la publication du site qui n'est pas isolable avec certitude.
- **Version déployée de `send-mass-email-proximity` non récupérable** avec les outils exposés : aucun téléchargement du code en service, aucun SHA ou manifeste, aucune ligne de journal d'appel sur 30 jours permettant d'en déduire une version. L'historique du dépôt ne prouve pas quelle version tourne.
- **Pas de publication sélective** : la publication part toujours de l'état courant du projet, sans choix de ref ou de snapshot. Une publication isolée du frontend sans la fonction proximité n'est pas garantie.

**Activation : SUSPENDUE.** Elle reprend seulement avec l'un des deux préalables suivants :
- un moyen vérifiable d'isoler le backend, c'est-à-dire une publication du site dont on prouve qu'elle ne déploie pas `send-mass-email-proximity` (empreinte du code déployé obtenue auprès du support Lovable, par exemple) ;
- ou une autorisation explicite de Jérémie d'appliquer la migration proximité préparée avant la publication.

Une fois un préalable rempli, et après GO :
1. Publication du site (code client).
2. Déploiement ciblé de `detect-deploy-and-mark-dirty` et `consume-seo-dirty` (elles importent la liste partagée modifiée). Aucune migration SEO.
3. La mise en ligne détectée marque les 8 pages statiques ; /projets et /petites-missions passent au passage suivant du cron (15 min), journalisées dans `prerender_recache_log` par `consume-seo-dirty`.
4. Recache ciblé ponctuel : `/projets/chantier-participatif-de-plantation`, `/projets/e5724f3e-c22b-4fb9-8962-d24c80435660`, `/petites-missions/chantier-participatif-de-plantation`, `/petites-missions/e5724f3e-c22b-4fb9-8962-d24c80435660`, par la fonction `prerender-recache` existante (réservée administrateur ou compte de service). Elle n'écrit RIEN en base (journal console seulement) : conserver la réponse de l'appel (statut par URL) comme trace d'activation.
5. GET de contrôle Googlebot en lecture : statut servi, `meta robots`, canonical, `Location`, en-tête `X-Prerender-Status`.

**Tests (03/10/2026, 11:24 puis revues)** : `seo2-projets.test.tsx` 21/21 à la revue finale (20/20 avant l'ajout du test `PageMeta` réelle) (dont rejet de la lecture auteur, réponses A/B dans le désordre, ancien canonical jamais émis pendant le chargement de B, démontage, « Réessayer ») ; `static-seo-refresh_test.ts` (Deno) 10/10 ; tests voisins 53/53 au premier passage ; `deno check` des deux fonctions : propre. Types du site : propres après retrait d'une annotation `@ts-expect-error` devenue inutile dans `robots-groups.test.ts` (aucun changement de règle robots). Types du site propres à la revue finale.

**Search Console (GSC Wizard)** : installé et activé (ENABLED), mais aucun outil GSC Wizard n'est exposé dans cette conversation ; compte Google et propriété Guardiens NON VÉRIFIÉS ici. L'historique Baromètre confirme que des données GSC ont été lues depuis une autre conversation : aucune panne ni problème de droits GSC général n'est diagnostiqué. Indexation réelle toujours NON VÉRIFIÉE dans cet audit.

## 9. Périmètre activé, états exacts (03/10/2026, UTC)

Cette section remplace, pour le périmètre ci-dessous, le statut « préparé, non publié » des sections 7 et 8. Les autres constats restent valables.

| Élément | État exact | Preuve |
|---|---|---|
| Migration `acquire_proximity_send_claim` | Appliquée par ChatGPT en transaction, avant le déploiement | Relecture SQL après application : SECURITY DEFINER, search_path `public, pg_temp` ; EXECUTE anon = false, authenticated = false, service_role = true. La fonction globale `acquire_member_email_send_claim` n'est pas modifiée. Fichier préparé conservé à sa place, en-tête mis à jour, aucune instruction SQL changée. |
| Fonctions Edge | `send-mass-email-proximity`, `detect-deploy-and-mark-dirty`, `consume-seo-dirty` déployées de 11:53:56 à 11:54:22 | Réponse de l'outil : « Successfully deployed edge functions », sans erreur. Aucune autre fonction déployée. |
| Frontend | Commit ac83d177 publié (après correction du libellé admin et allègement de main.tsx), visible à 12:20:23 | `assets/index-DpUwjLsc.js` servi sur guardiens.lovable.app et guardiens.fr (ancien `index-Dre1sw59.js` encore servi à 12:19:53) ; robots.txt identique octet pour octet à `public/robots.txt` sur les deux hôtes ; types du site sans erreur. |
| SEO-1 robots | Publié | Voir ligne précédente. |
| Recache ciblé | **Non exécuté** | `prerender-recache` à 12:20:30 : HTTP 401 `UNAUTHORIZED_NO_AUTH_HEADER` ; session à l'adresse du demandeur : « no auth user matches the requesting user's email » ; session admin : « requires user approval, which is unavailable in this context ». Aucune session admin obtenue, aucune purge ni recache. Le GO de Jérémie couvre les corrections, il ne lève pas l'exigence d'authentification admin de l'outil. |

### Matrice Googlebot avant recache (12:20:55 à 12:21:00, sans suivre les redirections)

| URL | HTTP réel | Location | Meta robots | Canonical | Titre / H1 | Copie |
|---|---|---|---|---|---|---|
| /projets | 200 | aucune | index, follow | /projets | « Des projets à réaliser ensemble », lien vers le projet présent | à jour |
| /petites-missions | 200 | aucune | index, follow | /petites-missions | « Un coup de main près de chez vous » | à jour |
| /projets/chantier-participatif-de-plantation | 200 | aucune | index, follow | elle-même | « Plantons ensemble à La Rochelle » | à jour |
| /projets/e5724f3e-c22b-4fb9-8962-d24c80435660 | 200 | aucune | index, follow | elle-même (UUID) | Plantons ensemble… | **ancienne** |
| /petites-missions/chantier-participatif-de-plantation | 200 | **aucune** | index, follow | elle-même | ancien titre « Chantier participatif de plantation » | **ancienne** |
| /petites-missions/e5724f3e-c22b-4fb9-8962-d24c80435660 | 200 | **aucune** | index, follow | ancienne adresse /petites-missions/… | ancien titre | **ancienne** |
| /projets/audit-inexistant-122055 (inédite) | **404** | aucune | noindex, follow | aucune | « Projet introuvable » | rendu neuf |
| /robots.txt | 200 | aucune | sans objet | sans objet | identique au dépôt | à jour |

- En-têtes observés : `x-prerender-requestid` et `x-prerender-user-id` seulement, aucun `X-Prerender-Status`. Aucune meta `prerender-status-code` lue dans les copies servies.
- Le vrai HTTP 404 de l'URL inédite montre que le statut déclaré 404 est appliqué pour un rendu neuf.
- **301 non validé en HTTP** : les deux anciennes routes sont encore servies depuis l'ancienne copie. Un statut 301 déclaré par PageMeta n'est pas compté comme servi.
- **503 non promis** : tant que le script Worker actif n'est pas lu, aucune réponse HTTP 503 n'est affirmée.

### Navigateur (rendu JS, 12:21 UTC)
- /projets : canonical /projets, index, prerenderReady vrai.
- /projets/{uuid} : canonical /projets/chantier-participatif-de-plantation.
- /petites-missions/chantier-participatif-de-plantation : redirection côté navigateur vers /projets/chantier-participatif-de-plantation.
- Passage A vers B : non testé en production (un seul projet en ligne) ; couvert par la revue automatisée antérieure (21/21), non relancée le 03/10.

### Trois URL non résolues
`/projets/e5724f3e-…`, `/petites-missions/chantier-participatif-de-plantation`, `/petites-missions/e5724f3e-…` : anciennes copies servies aux robots. Résolution : recache ciblé depuis une session admin authentifiée, puis nouveau GET Googlebot pour confirmer canonical et 301 réels.

### Search Console
Le complément HTML vérifié via GSC Wizard, produit dans un autre workflow, fait foi pour Search Console : 2 propriétés en siteOwner lisibles, 25 inspections ciblées, 426 clics et 31 293 impressions du 02/09 au 29/09/2026, sitemap de 673 URL sans erreur. Il ne fournit pas ici de canonical choisi par Google ni de Core Web Vitals : non renseignés dans ce rapport. Les précisions historiques des sections précédentes sont conservées.
