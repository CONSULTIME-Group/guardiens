// MIROIR DE DOCUMENTATION, CE FICHIER NE DÉPLOIE RIEN.
// La source de vérité est l'éditeur Cloudflare (Workers & Pages >
// guardiens-prerender > Edit code). Le code sous le repère « CODE DÉPLOYÉ »
// est, à l'octet près, la version active be02d9c5 (v7.5 du 12/11/2026),
// capturée le 12/11/2026 : SHA-256
// 25d5010079586e7204a35461c97482a904591c56bf402d51496f799dcb60a4ab.
// Le bloc d'historique au-dessus du repère n'existe que dans ce miroir. Toute
// modification faite ici reste sans effet sur la production tant qu'elle n'est
// pas reportée dans l'éditeur Cloudflare.

/**
 * Cloudflare Worker — Prerender.io proxy for guardiens.fr
 * ========================================================
 * Deploy: Cloudflare Dashboard > Workers & Pages > guardiens-prerender > Edit code
 *         ou `npx wrangler deploy`
 * Route:  guardiens.fr/* + *guardiens.fr/*
 *
 * ══ v7.5 (2026-11-12) : HTML DES ROBOTS ALIGNÉ SUR LES FICHIERS EN LIGNE ══
 *
 *  MESURE du 12/11/2026, 25 URL du sitemap demandées en Googlebot : 12
 *  citaient une feuille de style `/assets/index-*.css` d'une ancienne mise en
 *  ligne, qui répondait 404 (annonces, races, /petites-missions/ville, des
 *  villes et des articles). Une copie Prerender vit jusqu'à 7 jours, l'origine
 *  Lovable retire les fichiers des anciennes mises en ligne : Google rendait
 *  ces pages sans mise en forme. Même cause, second effet : le HTML des robots
 *  gardait 68 `<link rel="modulepreload">` (les scripts, eux, sont retirés par
 *  Prerender), et Cloudflare comptait sur 7 jours 2 190 réponses 4xx à
 *  Googlebot sur 9 590 requêtes, les chemins en tête étant tous des
 *  `/assets/*.js`.
 *
 *  CORRIGÉ : `alignBotHtml` (HTMLRewriter, corps relayé en flux) retire les
 *  modulepreload et pose la feuille de style en ligne sur toute réponse HTML
 *  de Prerender, 200 comme 404. La feuille de style en ligne est lue sur
 *  l'index de l'origine par `currentCssHref`, gardée 5 minutes en mémoire, en
 *  parallèle de l'appel Prerender (aucune attente ajoutée, 1,5 s au plus si
 *  l'origine se tait). Lecture en échec : dernière valeur connue, nouvel essai
 *  une minute plus tard, et sans valeur le href reste celui de la copie. Aucun
 *  rendu consommé, aucun changement pour un visiteur.
 *
 *  LIMITE CONNUE : seule `/assets/index-*.css` est réalignée. Une feuille de
 *  style de morceau (ex. `mapTiles-*.css`) garde le nom de la copie.
 *
 *  TESTS : 21 scénarios dans le runtime workerd (miniflare) contre le v7.4,
 *  dont la vraie page /house-sitting/lyon du 12/11 ; visiteurs, fichiers,
 *  sitemap, `?lang=`, www, replis 403, 429 et 5xx identiques au v7.4.
 *  RECETTE en production le 12/11/2026 (version be02d9c5, retour arrière
 *  1474474e) : 25 URL sur 25 en Googlebot avec feuille de style en 200 et
 *  zéro modulepreload, 404 gardée en 404 noindex.
 *
 * ══ v7.4 (2026-10-04) : SITEMAP VIVANT, VARIANTES ?lang= EN 301 ══
 *
 *  `/sitemap.xml` relaie la fonction Supabase `sitemap` (503 en cas de panne
 *  de l'amont, jamais de repli sur le fichier du build) ; les anciennes
 *  variantes `?lang=` reçoivent une redirection permanente vers l'URL sans ce
 *  paramètre. Version 1474474e, voir
 *  claude/reprise-seo-constats-claude-4-octobre-2026.md.
 *
 * ══ v7.3 (2026-09-07) : 404 RELAYÉES, JSON-LD BOTS SEULS, 304 SANS CORPS ══
 *
 *  1. LES 404 DE PRERENDER SONT RELAYÉES. Jusqu'ici un 404 Prerender partait
 *     en repli origine : le crawler recevait un shell React en 200, donc un
 *     soft-404 indexable pour une URL inexistante. La règle Ignored URL
 *     `/gardiens/` qui justifiait ce repli n'existe pas : vérifié le
 *     07/09/2026 dans le dashboard Prerender (Cache Manager > Ignored URLs),
 *     les 8 règles portent toutes sur des paramètres de query string
 *     (`lang=`, `?q=`, `?profil=`, `?focus=`, `?filter=`, `?ville=`, `utm_`,
 *     `fbclid=`), aucune sur un chemin. CORRIGÉ : cas 404 dédié
 *     (`notfound-passthrough`), le repli origine ne concerne plus que 403,
 *     429 et 5xx.
 *
 *  2. LE JSON-LD N'EST INJECTÉ QUE POUR LES BOTS. `serveOrigin` sert aussi le
 *     chemin `bypass`, donc chaque visite humaine d'une fiche gardien lisait
 *     tout le HTML en mémoire et ajoutait un aller-retour vers la fonction
 *     profile-jsonld pour un balisage qu'aucun navigateur n'exploite.
 *     CORRIGÉ : `profileMatch` n'est calculé que si `isBot`.
 *
 *  3. `withDiagHeaders` NE PEUT PLUS LEVER D'ERREUR 1101. `fetchOrigin`
 *     retransmet les en-têtes conditionnels de la requête (If-None-Match,
 *     If-Modified-Since), l'origine peut donc répondre 304. Construire une
 *     Response avec un corps sur 204/205/304 lève une TypeError, page perdue.
 *     CORRIGÉ : `NO_BODY_STATUSES`, le corps est remplacé par `null` sur ces
 *     statuts.
 *
 *  4. `isImmutableAsset` TESTE LE CHEMIN EFFONDRÉ. `//assets/index.js` ne
 *     commence pas par `/assets/` et ratait le cache edge, donc repartait en
 *     transit origine à chaque hit.
 *     CORRIGÉ : `canonicalPath` appliqué dans `isImmutableAsset`, et dans
 *     `serveImmutableAsset` pour l'URL d'origine comme pour la clé de cache.
 *
 *  TESTS DE VALIDATION passés le 07/09/2026 sur le Worker déployé :
 *  `/departement/06` avec user-agent Googlebot renvoie 404, là où il
 *  renvoyait 200 avec le shell React vide ; `/gardiens/{uuid}` renvoie 200
 *  avec son contenu prérendu réel et sa canonique auto-référente ;
 *  `/house-sitting/lyon` renvoie 200 en `index, follow`.
 *
 * ══ v7.2 (2026-09-05) — CACHE EDGE DES FICHIERS À NOM HACHÉ ══
 *
 *  MESURE du 05/09/2026 sur la page d'accueil : les 44 fichiers statiques
 *  revenaient tous en `cf-cache-status: BYPASS`, médiane 306 ms, p90 481 ms,
 *  pour 17 ms d'attente serveur. Le temps perdu était du transit, pas de
 *  l'origine. Cause : `fetchOrigin` transmet les cookies de session dans la
 *  sous-requête, ce qui interdit à Cloudflare de stocker ou de servir la
 *  réponse depuis son cache.
 *
 *  CORRIGÉ : court-circuit `serveImmutableAsset`, placé avant toute détection
 *  de bot, pour les préfixes `/assets/` et `/lovable-uploads/`. Sous-requête
 *  sans cookie, réponse stockée dans le cache edge via la Cache API et
 *  renvoyée avec `Cache-Control: immutable`.
 *
 *  CE N'EST PAS UNE REMISE EN CAUSE DU « NON RETENU » CI-DESSOUS. Ce qui était
 *  écarté, c'est la mise en cache edge du HTML PRÉRENDU : le pipeline
 *  `seo_dirty_at` ne sait pas purger cette couche, donc du vieux HTML resterait
 *  servi après déploiement. Ici, seuls sont mis en cache des fichiers dont le
 *  nom porte une empreinte de contenu (hash Vite, UUID d'upload). Un contenu
 *  différent produit un nom différent, donc ce cache ne peut pas devenir
 *  obsolète et n'a rien à purger. Le HTML n'entre jamais dans ce chemin.
 *
 *  Pilotage par la Cache API plutôt que par `cf: { cacheTtl }` : avec
 *  `cacheTtl`, une 404 transitoire pendant un déploiement serait figée un an à
 *  la frontière. Ici, seul un 200 franc est stocké.
 *
 * ══ v7.1 (2026-08-11) — CORRECTIFS D'AUDIT, avant tout déploiement ══
 *
 *  Le v7 n'a jamais été déployé. Un audit adversarial a trouvé dix défauts,
 *  tous reproduits en test. Les voici, avec ce qui a été fait.
 *
 *  A1. `injectProfileJsonLd` consommait le corps de la réponse d'origine dans
 *      un `Promise.all`, puis retournait cette même réponse depuis son `catch`.
 *      Si l'appel à la fonction Supabase rejetait (réseau, DNS, TLS), le
 *      runtime tentait de streamer un corps déjà lu : erreur 1101, page profil
 *      perdue. Défaut hérité du v6, mais le v7 en augmentait la fréquence en
 *      basculant tout le volume ahrefs/semrush sur ce chemin.
 *      CORRIGÉ : une seule lecture du corps, hors `Promise.all`, et un
 *      `passthrough()` réutilisable sur tous les chemins d'échec.
 *
 *  A2. Une réponse 3xx de Prerender partait en `fallback-upstream-error` :
 *      le render était facturé, la réponse jetée, une sous-requête origine
 *      ajoutée, et le crawler recevait un shell React en 200 au lieu d'une
 *      redirection. Soft-404 et double coût.
 *      CORRIGÉ : les 3xx sont relayés tels quels.
 *      CORRIGÉ EN v7.3 pour les 404 : la règle Ignored URL `/gardiens/` qui
 *      justifiait le repli n'existe pas côté Prerender (vérifié le
 *      07/09/2026, Cache Manager > Ignored URLs : les 8 règles portent
 *      uniquement sur des paramètres de query string). Les fiches gardien
 *      sont bien rendues et en cache. Voir l'entrée v7.3 ci-dessus. Le repli
 *      origine ne concerne plus que 403, 429 et 5xx.
 *
 *  A3. `replace(/\/+$/, '')` ne traitait que les slashs finaux. `//admin`
 *      contournait `isNeverPrerendered`, et `/guides//mon-guide` créait une
 *      seconde entrée de cache facturée pour la même page.
 *      CORRIGÉ : effondrement des slashs multiples dans les deux fonctions.
 *
 *  A4. `http://guardiens.fr/faq` et `https://guardiens.fr/faq` étaient deux
 *      entrées de cache distinctes, chacune facturée. Idem pour un port ou un
 *      sous-domaine, alors que la route `*guardiens.fr/*` les capte tous.
 *      CORRIGÉ : protocole, port et hôte forcés à la forme canonique.
 *
 *  A5. `IGNORED_EXTENSIONS` est ancré sur `$`, donc `/assets/hero.png/` ne
 *      matchait pas, puis la normalisation retirait le slash final et envoyait
 *      un PNG se faire rendre en navigateur headless.
 *      CORRIGÉ : le test porte sur le pathname normalisé.
 *
 *  A10. `PRERENDER_KEEP_PARAMS` : la clé de cache n'était pas stable. `?Page=2`
 *      et `?page=2` produisaient deux renders, et `?p=2&p=3` perdait la seconde
 *      valeur en silence. Code dormant (liste vide) mais piège à retardement.
 *      CORRIGÉ : nom en minuscules, valeurs multiples jointes.
 *
 *  A11. `html.replace(/<\/head>/i, tagged)` interprète `$&` et $backtick. Une
 *      bio de gardien contenant ces caractères dupliquait une portion
 *      arbitraire du HTML dans le `<head>`. Reproduit en test.
 *      CORRIGÉ : remplacement par fonction.
 *
 *  B1. Les trois chemins de secours ne posaient jamais le JSON-LD. Quand
 *      Prerender tombait, Googlebot recevait un `/gardiens/:uuid` sans le
 *      moindre Schema.org, alors que le chemin humain était couvert.
 *      CORRIGÉ : `serveOrigin()` factorise les quatre sorties.
 *
 *  B2. Retirer ahrefsbot et semrushbot casse Ahrefs Site Audit et Semrush Site
 *      Audit, qui ne verraient plus qu'un shell vide. C'est la seule mesure
 *      externe du rendu, au moment précis où les pages villes, races et guides
 *      s'industrialisent.
 *      CORRIGÉ : mj12bot et dotbot restent retirés, sans discussion.
 *      ahrefsbot et semrushbot passent derrière `PRERENDER_ALLOW_SEO_TOOLS`,
 *      désactivé par défaut, à mettre à '1' le temps d'un audit.
 *
 *  B4. Un timeout de 20 s appliqué aux bots sociaux, qui coupent entre 3 et
 *      10 s, garantissait le pire : aperçu de partage vide ET render facturé.
 *      CORRIGÉ : 8 s pour les bots sociaux, 20 s pour les autres.
 *
 *  C4. Le 301 www vers apex sur un POST fait perdre le corps de la requête.
 *      CORRIGÉ : 308, qui préserve la méthode.
 *
 *  C5. `console.log` sur chaque requête bot, à volume de crawl à cinq chiffres.
 *      CORRIGÉ : conditionné à `PRERENDER_DEBUG`.
 *
 *  C6. `new RegExp([].join('|'))` matche TOUTE chaîne. Si `OPTIONAL_BOT_AGENTS`
 *      ou `BOT_AGENTS` devenait vide, tout le trafic humain aurait été traité
 *      comme du bot. Reproduit en test.
 *      CORRIGÉ : garde-fou `/(?!)/` sur liste vide.
 *
 *  NON RETENU, et c'est un choix. Mettre les réponses Prerender en cache edge
 *  Cloudflare (`cf: { cacheTtl }`) économiserait probablement plus que la
 *  normalisation d'URL. Écarté : cela ajoute une seconde couche de cache que le
 *  pipeline `seo_dirty_at` ne sait pas purger, ce qui réintroduit exactement le
 *  piège de l'ancien HTML servi après déploiement déjà documenté sur ce projet.
 *  À n'envisager qu'avec une purge edge branchée sur le même pipeline.
 *
 *  CONTRÔLE DE SÉCURITÉ. `isNeverPrerendered` et `normalizePrerenderUrl` ont
 *  été passés sur les 713 URLs du sitemap de production : zéro bloquée par
 *  erreur, zéro altérée. La comparaison de préfixes est segmentaire, donc
 *  `/devenir-home-sitter` survit à `/dev`, `/departement/...` à `/dev`,
 *  `/pros` à `/pros/inscription`.
 *
 * ══ v7 (2026-08-11) — maîtrise de la consommation de renders Prerender ══
 *
 *  CONSTAT MESURÉ le 11/08/2026 sur le dashboard Prerender :
 *  15 581 renders consommés le 9 août sur un quota mensuel de 25 000, soit
 *  83 % du cycle en une journée. Prerender gardait 1 437 URLs en cache pour
 *  866 URLs déclarées dans les sitemaps. L'écart était constitué de variantes
 *  à query string, chacune facturée comme un render distinct.
 *
 *  1. NORMALISATION D'URL. `fetchPrerender` recevait `request.url` complet.
 *     Le Worker envoie désormais une URL canonique, sans query string sauf
 *     whitelist explicite. Effet de bord assumé : un bot qui demande `?lang=en`
 *     reçoit le rendu canonique FR. Correct tant qu'aucun cluster hreflang
 *     n'est déclaré.
 *  2. USER-AGENT TRANSMIS, sans quoi Prerender classe 100 % du trafic en
 *     « Others » et les rapports Crawler Type sont inexploitables.
 *  3. CRAWLERS SEO COMMERCIAUX, voir B2 ci-dessus.
 *  4. TIMEOUT 10 s vers 20 s, voir B4 ci-dessus.
 *  5. ROUTES FONCTIONNELLES EXCLUES, `NEVER_PRERENDER_PREFIXES`.
 *
 * ══ v6 (2026-07-28) ══
 *  - Liste des crawlers IA complétée (oai-searchbot, meta-externalagent,
 *    amazonbot, applebot-extended, mistralai-user, duckassistbot, cohere-ai,
 *    youbot). oai-searchbot est le crawler de recherche de ChatGPT, distinct
 *    de gptbot qui sert l'entraînement.
 *  - En-têtes X-Prerender-* conditionnés à env.PRERENDER_DEBUG === '1'.
 *  - bytespider isolé, activable par env.PRERENDER_ALLOW_BYTESPIDER.
 */

// ═══ CODE DÉPLOYÉ (be02d9c5) ═══
/**
 * guardiens-prerender, v7.5 (12/11/2026)
 * Proxy Prerender.io pour guardiens.fr. Route : guardiens.fr/* et *guardiens.fr/*
 *
 * Historique détaillé, mesures et audits : dépôt Lovable,
 * cloudflare-worker-prerender.js. Ce fichier ne garde que les invariants.
 *
 * INVARIANTS À NE PAS CASSER
 *  1. Prerender ne reçoit jamais de query string (PRERENDER_KEEP_PARAMS vide).
 *     Chaque paramètre conservé multiplie les renders facturés.
 *  2. Un 404 remonté par Prerender est le signal voulu par la méta
 *     prerender-status-code. Il est relayé. Le replier sur l'origine sert un
 *     shell React vide en 200, que Google dédoublonne.
 *  3. 403, 429 et 5xx sont des incidents de rendu, pas un verdict sur l'URL :
 *     repli sur l'origine, jamais de 404 dur.
 *  4. Le HTML prérendu n'entre jamais dans le cache edge Cloudflare : le
 *     pipeline seo_dirty_at ne sait pas le purger.
 *  5. Le compte Prerender est partagé avec onchercheunemaison.fr.
 *  6. Le HTML servi aux robots cite la feuille de style en ligne et ne porte
 *     aucun modulepreload : une copie Prerender vit jusqu'à 7 jours, l'origine
 *     retire les fichiers des anciennes mises en ligne (alignBotHtml).
 */

const PRERENDER_SERVICE = 'https://service.prerender.io/';
const CANONICAL_ORIGIN = 'guardiens.fr';
const LOVABLE_ORIGIN_HOST = 'guardiens.lovable.app';

// 20 s : au-dessus du rendu réel des pages les plus lourdes. Abandonner avant
// la fin ne fait pas économiser le render, le crawler réessaie et il est
// facturé deux fois.
const PRERENDER_TIMEOUT_MS = 20000;

// Les bots sociaux coupent entre 3 et 10 s. Leur imposer 20 s garantit le pire :
// aperçu de partage vide ET render facturé.
const PRERENDER_TIMEOUT_SOCIAL_MS = 8000;
const SOCIAL_REGEX = /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot|discordbot|pinterestbot|redditbot/i;

const IGNORED_EXTENSIONS = /\.(js|css|xml|less|png|jpg|jpeg|gif|pdf|doc|txt|ico|rss|zip|mp3|rar|exe|wmv|avi|ppt|mpg|mpeg|tif|wav|mov|psd|ai|xls|mp4|m4a|swf|dat|dmg|iso|flv|m4v|torrent|ttf|woff|woff2|svg|eot|webp|avif|webm|json)$/i;

/**
 * Paramètres conservés dans l'URL envoyée à Prerender. Liste vide : aucune URL
 * du sitemap ne porte de paramètre. N'ajouter une entrée que si elle change le
 * contenu indexable ET figure dans le sitemap.
 */
const PRERENDER_KEEP_PARAMS = [];

/**
 * Chemins jamais envoyés à Prerender. Aucune valeur d'indexation, mais un coût
 * de render à chaque visite de bot non conforme au robots.txt.
 *
 * ATTENTION. Les préfixes d'un seul segment court (/go, /dev, /test, /acces,
 * /review, /profil) bloquent définitivement ces URLs exactes. Créer un jour une
 * page publique /acces ou /review la désindexerait en silence, sans erreur.
 * Revérifier à chaque ajout de route publique.
 */
const NEVER_PRERENDER_PREFIXES = [
  '/admin',
  '/dashboard',
  '/login',
  '/connexion',
  '/se-connecter',
  '/inscription',
  '/register',
  '/auth',
  '/forgot-password',
  '/mot-de-passe-oublie',
  '/reset-password',
  '/messages',
  '/messagerie',
  '/settings',
  '/parametres',
  '/profile',
  '/profil',
  '/notifications',
  '/sits',
  '/mes-candidatures',
  '/mes-avis',
  '/favoris',
  '/mon-secteur',
  '/mon-abonnement',
  '/owner-profile',
  '/house-guide',
  '/review',
  '/onboarding',
  '/pros/inscription',
  '/pros/mon-espace',
  '/unsubscribe',
  '/go',
  '/acces',
  '/candidature',
  '/email-preferences',
  '/preferences-email',
  '/test',
  '/dev',
  '/planche-badges',
  '/test-accord',
];

const BOT_AGENTS = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'yandexbot',
  'baiduspider', 'applebot',
  'chatgpt-user', 'gptbot', 'oai-searchbot', 'google-extended', 'claudebot', 'claude-web', 'claude-searchbot',
  'anthropic-ai', 'perplexitybot', 'perplexity-user', 'meta-externalagent',
  'meta-externalfetcher', 'amazonbot', 'applebot-extended', 'mistralai-user',
  'duckassistbot', 'cohere-ai', 'youbot',
  'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
  'slackbot', 'whatsapp', 'telegrambot', 'discordbot',
  'pinterestbot', 'redditbot',
  // mj12bot et dotbot retirés définitivement : aucune contrepartie business.
];

const OPTIONAL_BOT_AGENTS = ['bytespider'];

// Coupés par défaut pour préserver le quota. Sans eux, Ahrefs et Semrush Site
// Audit ne voient qu'un shell vide et rapportent des centaines de faux
// « missing title ». Mettre PRERENDER_ALLOW_SEO_TOOLS = '1' le temps d'un
// audit, puis couper.
const SEO_TOOL_AGENTS = ['ahrefsbot', 'ahrefssiteaudit', 'semrushbot'];

// new RegExp([].join('|')) matche TOUTE chaîne : sur liste vide, tout le trafic
// humain serait traité comme du bot. Garde-fou obligatoire.
const safeRegex = (list) => (list.length ? new RegExp(list.join('|'), 'i') : /(?!)/);

const BOT_REGEX = safeRegex(BOT_AGENTS);
const OPTIONAL_BOT_REGEX = safeRegex(OPTIONAL_BOT_AGENTS);
const SEO_TOOL_REGEX = safeRegex(SEO_TOOL_AGENTS);

/** Effondre les slashs multiples et retire les slashs finaux. */
function canonicalPath(pathname) {
  const p = pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return p || '/';
}

// Comparaison segmentaire : /devenir-home-sitter survit à /dev,
// /departement/... aussi, /pros à /pros/inscription.
function isNeverPrerendered(pathname) {
  const p = canonicalPath(pathname).toLowerCase();
  return NEVER_PRERENDER_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
}

/**
 * URL canonique soumise à Prerender : https, hôte apex sans port, chemin sans
 * slash multiple ni slash final, query réduite à la whitelist et triée. Sans
 * cela, http et https, un port, un sous-domaine ou un paramètre de tracking
 * créent chacun une entrée de cache facturée pour la même page.
 */
function normalizePrerenderUrl(rawUrl) {
  const u = new URL(rawUrl);
  u.hash = '';
  u.protocol = 'https:';
  u.port = '';
  u.hostname = CANONICAL_ORIGIN;

  const kept = new URLSearchParams();
  if (PRERENDER_KEEP_PARAMS.length > 0) {
    const names = [...new Set([...u.searchParams.keys()].map((n) => n.toLowerCase()))]
      .filter((n) => PRERENDER_KEEP_PARAMS.includes(n))
      .sort();
    for (const n of names) {
      const values = [...u.searchParams.entries()]
        .filter(([k]) => k.toLowerCase() === n)
        .map(([, v]) => v)
        .sort();
      if (values.length) kept.set(n, values.join(','));
    }
  }
  u.search = kept.toString() ? `?${kept.toString()}` : '';
  u.pathname = canonicalPath(u.pathname);
  return u.toString();
}

function detectBot(request, env, normalizedPath) {
  const ua = request.headers.get('user-agent') || '';
  const reasons = [];

  // Test sur le chemin NORMALISÉ : sinon /assets/hero.png/ échappe à l'ancre $
  // du regex et un PNG part se faire rendre en navigateur headless.
  if (IGNORED_EXTENSIONS.test(normalizedPath)) reasons.push('static-asset');
  if (request.method !== 'GET' && request.method !== 'HEAD') reasons.push('non-get');
  // Prerender repasse par ce Worker pour charger la page. Sans cette garde,
  // boucle infinie.
  if (request.headers.get('x-prerender')) reasons.push('loop-guard');
  if (isNeverPrerendered(normalizedPath)) reasons.push('non-indexable-route');

  const seoToolsAllowed = Boolean(env && env.PRERENDER_ALLOW_SEO_TOOLS === '1');
  const bytespiderAllowed = Boolean(env && env.PRERENDER_ALLOW_BYTESPIDER === '1');

  const isBot =
    BOT_REGEX.test(ua) ||
    (SEO_TOOL_REGEX.test(ua) && seoToolsAllowed) ||
    (OPTIONAL_BOT_REGEX.test(ua) && bytespiderAllowed);

  if (!isBot) {
    if (SEO_TOOL_REGEX.test(ua)) reasons.push('seo-tool-disabled');
    else if (OPTIONAL_BOT_REGEX.test(ua)) reasons.push('optional-bot-disabled');
    else reasons.push('not-a-bot');
  }

  return { shouldPrerender: reasons.length === 0 && isBot, isBot, ua, reasons };
}

async function fetchPrerender(url, token, ua, clientIp) {
  const controller = new AbortController();
  const timeoutMs = SOCIAL_REGEX.test(ua) ? PRERENDER_TIMEOUT_SOCIAL_MS : PRERENDER_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { 'X-Prerender-Token': token };
    // Sans ces deux en-têtes, Prerender classe 100 % du trafic en « Others »
    // et les rapports Crawler Type sont inexploitables.
    if (ua) headers['User-Agent'] = ua;
    if (clientIp) headers['X-Forwarded-For'] = clientIp;

    const response = await fetch(PRERENDER_SERVICE + encodeURIComponent(url), {
      headers,
      signal: controller.signal,
      redirect: 'manual',
    });
    clearTimeout(timeout);
    return response;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/** Statuts sans corps : y attacher un body lève une TypeError, donc une 1101. */
const NO_BODY_STATUSES = new Set([204, 205, 304]);

function withDiagHeaders(response, diag, debug) {
  if (!debug) return response;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(diag)) {
    // Un UA hostile peut contenir des octets que Headers.set refuse, et cet
    // appel est hors de tout try.
    const safe = String(v).replace(/[^\x20-\x7E]/g, '?').slice(0, 200);
    try {
      headers.set(k, safe);
    } catch (_e) { /* en-tête invalide, on l'omet */ }
  }
  // fetchOrigin retransmet les en-têtes conditionnels, donc l'origine peut
  // répondre 304.
  return new Response(NO_BODY_STATUSES.has(response.status) ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// On tape le serveur Lovable avec le bon Host pour contourner la redirection
// guardiens.lovable.app vers guardiens.fr.
async function fetchOrigin(request) {
  const url = new URL(request.url);
  // L'origine reçoit l'URL COMPLÈTE, query comprise : la normalisation ne
  // concerne que Prerender, jamais ce que voit un humain.
  const originUrl = `https://${LOVABLE_ORIGIN_HOST}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('x-forwarded-host', CANONICAL_ORIGIN);
  headers.set('x-forwarded-proto', 'https');
  headers.set('x-lovable-skip-redirect', '1');

  return fetch(originUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  });
}

/**
 * Cache edge réservé aux fichiers dont le nom porte une empreinte de contenu
 * (hash Vite, UUID d'upload). Un contenu différent produit un nom différent,
 * donc ce cache ne peut pas devenir obsolète et n'a rien à purger. Le HTML
 * n'entre jamais ici, voir l'invariant 4.
 */
const IMMUTABLE_PREFIXES = ['/assets/', '/lovable-uploads/'];
const IMMUTABLE_TTL = 31536000;

function isImmutableAsset(pathname) {
  const p = canonicalPath(pathname);
  return IMMUTABLE_PREFIXES.some((prefix) => p.startsWith(prefix));
}

async function serveImmutableAsset(request, ctx) {
  const url = new URL(request.url);
  // Chemin effondré et query retirée : un nom haché ne change jamais de
  // contenu, donc ?v=123 ou un slash doublé ne doivent pas créer une seconde
  // entrée de cache.
  const originUrl = `https://${LOVABLE_ORIGIN_HOST}${canonicalPath(url.pathname)}`;
  const cacheKey = new Request(originUrl, { method: 'GET' });
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // La seule présence d'un cookie ou d'une autorisation suffit à faire basculer
  // Cloudflare en BYPASS.
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete('authorization');
  headers.delete('host');
  headers.delete('range');
  headers.set('x-forwarded-host', CANONICAL_ORIGIN);
  headers.set('x-forwarded-proto', 'https');
  headers.set('x-lovable-skip-redirect', '1');

  let originResponse;
  try {
    originResponse = await fetch(originUrl, { method: 'GET', headers, redirect: 'manual' });
  } catch (err) {
    // Jamais de page blanche sur un asset : le chemin normal reprend.
    return fetchOrigin(request);
  }

  // Seul un 200 franc est stocké : une 404 transitoire pendant un déploiement
  // ne doit pas être figée un an à la frontière.
  if (originResponse.status !== 200) return originResponse;

  const out = new Response(originResponse.body, originResponse);
  out.headers.set('cache-control', `public, max-age=${IMMUTABLE_TTL}, immutable`);
  out.headers.delete('set-cookie');
  out.headers.set('x-guardiens-asset-cache', 'stored');
  ctx.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}

const PROFILE_JSONLD_URL = 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/profile-jsonld';
const PROFILE_PATH_RE = /^\/gardiens\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

/**
 * Injecte le JSON-LD Person et Service dans le head, pour que les crawlers
 * voient le Schema.org sans exécuter le JS de la SPA.
 *
 * Le corps est lu UNE SEULE FOIS, avant tout appel réseau qui pourrait rejeter.
 * Tous les chemins d'échec repassent par passthrough(), qui reconstruit une
 * réponse depuis le texte en mémoire. Retourner originResponse après l'avoir
 * lue provoque une erreur 1101.
 */
async function injectProfileJsonLd(originResponse, profileId) {
  const ct = originResponse.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return originResponse;

  let html;
  try {
    html = await originResponse.text();
  } catch (_e) {
    return originResponse;
  }

  const headers = new Headers(originResponse.headers);
  headers.delete('content-length');
  const passthrough = () =>
    new Response(html, { status: originResponse.status, headers });

  let jsonldHtml = '';
  try {
    const r = await fetch(`${PROFILE_JSONLD_URL}?id=${encodeURIComponent(profileId)}`, {
      headers: { accept: 'text/html' },
    });
    if (!r.ok) return passthrough();
    jsonldHtml = await r.text();
  } catch (_e) {
    return passthrough();
  }
  if (!jsonldHtml) return passthrough();

  const marker = 'data-ssr-jsonld="profile"';
  if (html.includes(marker)) return passthrough();

  const tagged = jsonldHtml.replace(
    /<script type="application\/ld\+json">/g,
    `<script type="application/ld+json" ${marker}>`,
  );
  // Remplacement par FONCTION : sinon un $& ou une apostrophe dollar dans la
  // bio d'un gardien duplique une portion arbitraire du HTML dans le head.
  const patched = html.replace(/<\/head>/i, () => `${tagged}</head>`);

  const outHeaders = new Headers(headers);
  outHeaders.set('x-prerender-jsonld-injected', '1');
  return new Response(patched, { status: originResponse.status, headers: outHeaders });
}

// === v7.5 : HTML des robots aligné sur les fichiers en ligne ===
// Mesure du 12/11/2026 : 12 pages du sitemap sur 25 citaient une feuille de
// style d'une ancienne mise en ligne, en 404, et Googlebot recevait 23 % de
// réponses 4xx sur les 68 modulepreload de chaque page (scripts déjà retirés
// par Prerender). La feuille de style en ligne est lue sur l'index de
// l'origine, gardée 5 minutes en mémoire, en parallèle de l'appel Prerender :
// aucun rendu consommé, aucune attente ajoutée. Toute panne laisse la page
// telle que Prerender l'a rendue.
const LIVE_CSS_TTL_MS = 5 * 60 * 1000;
const LIVE_CSS_RETRY_MS = 60 * 1000;
const LIVE_CSS_TIMEOUT_MS = 1500;
const LIVE_CSS_IN_INDEX_RE = /href="(\/assets\/index-[A-Za-z0-9_-]+\.css)"/;
const BUILD_CSS_HREF_RE = /^\/assets\/index-[A-Za-z0-9_-]+\.css$/;
let liveCss = { href: null, expires: 0 };

/** Ne rejette jamais. Rend null tant qu'aucune lecture n'a abouti. */
async function currentCssHref(fetchImpl = fetch) {
  const now = Date.now();
  if (now < liveCss.expires) return liveCss.href;
  try {
    const r = await fetchImpl(`https://${LOVABLE_ORIGIN_HOST}/`, {
      method: 'GET',
      headers: {
        accept: 'text/html',
        'x-forwarded-host': CANONICAL_ORIGIN,
        'x-forwarded-proto': 'https',
        'x-lovable-skip-redirect': '1',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(LIVE_CSS_TIMEOUT_MS),
    });
    if (r.status !== 200) throw new Error('index-' + r.status);
    const match = (await r.text()).match(LIVE_CSS_IN_INDEX_RE);
    if (!match) throw new Error('no-stylesheet');
    liveCss = { href: match[1], expires: now + LIVE_CSS_TTL_MS };
  } catch (_e) {
    // Dernière valeur connue gardée, nouvel essai dans une minute.
    liveCss = { href: liveCss.href, expires: now + LIVE_CSS_RETRY_MS };
  }
  return liveCss.href;
}

/**
 * Retire les modulepreload et pose la feuille de style en ligne sur une réponse
 * HTML de Prerender. Le corps reste un flux. Toute autre réponse, et toute
 * erreur, repartent inchangées.
 */
function alignBotHtml(response, cssHref) {
  try {
    const ct = response.headers.get('content-type') || '';
    if (!response.body || !ct.includes('text/html')) return response;
    const rewriter = new HTMLRewriter().on('link[rel="modulepreload"]', {
      element(el) {
        el.remove();
      },
    });
    if (cssHref) {
      rewriter.on('link[rel="stylesheet"]', {
        element(el) {
          const href = el.getAttribute('href') || '';
          if (href !== cssHref && BUILD_CSS_HREF_RE.test(href)) el.setAttribute('href', cssHref);
        },
      });
    }
    const out = new Response(rewriter.transform(response).body, response);
    out.headers.delete('content-length');
    return out;
  } catch (_e) {
    return response;
  }
}

// robots.txt est servi par l'origine. Le Worker ne l'intercepte pas.

// === v7.4 : sitemap vivant sous le domaine principal ===
// /sitemap.xml relaie la fonction Supabase `sitemap`, qui lit les sources
// publiques à chaque appel (cache interne 60 s). Aucun repli vers le fichier
// statique du build : une panne de l'amont répond 503, le moteur réessaie.
// L'amont n'appelle jamais guardiens.fr/sitemap.xml : pas de boucle.
const LIVE_SITEMAP_URL = 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/sitemap';
const SITEMAP_TIMEOUT_MS = 15000;
const SITEMAP_MAX_BYTES = 5 * 1024 * 1024;
const SITEMAP_LOC_PREFIX = '<loc>https://guardiens.fr/';

async function serveLiveSitemap(request, fetchImpl = fetch) {
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } });
  }
  const fail = (reason) =>
    new Response(method === 'HEAD' ? null : 'Sitemap temporairement indisponible.\n', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'retry-after': '600',
        'x-sitemap-status': reason,
      },
    });

  let upstream;
  try {
    upstream = await fetchImpl(LIVE_SITEMAP_URL, {
      method: 'GET',
      headers: { accept: 'application/xml' },
      signal: AbortSignal.timeout(SITEMAP_TIMEOUT_MS),
    });
  } catch (_e) {
    return fail('upstream-unreachable');
  }
  if (upstream.status !== 200) return fail('upstream-' + upstream.status);
  const declared = Number(upstream.headers.get('content-length') || 0);
  if (declared > SITEMAP_MAX_BYTES) return fail('too-large');

  let body;
  try {
    body = await upstream.text();
  } catch (_e) {
    return fail('upstream-truncated');
  }
  if (body.length > SITEMAP_MAX_BYTES) return fail('too-large');
  const trimmed = body.trim();
  if (!trimmed.startsWith('<?xml') || !/<urlset[\s>]/.test(trimmed) || !trimmed.endsWith('</urlset>')) {
    return fail('invalid-xml');
  }
  const locs = trimmed.match(/<loc>[^<]*<\/loc>/g) || [];
  if (locs.length === 0) return fail('empty');
  if (locs.some((l) => !l.startsWith(SITEMAP_LOC_PREFIX))) return fail('foreign-host');

  return new Response(method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'no-store',
      'x-sitemap-status': 'live',
      'x-sitemap-urls': String(locs.length),
    },
  });
}

// === v7.4 : anciennes variantes ?lang= ===
// Guardiens est monolingue depuis le 17/08/2026 et l'application n'émet aucun
// lien ?lang=. Les variantes encore connues de Google reçoivent une vraie
// redirection permanente vers l'URL sans ce paramètre (les autres paramètres
// sont conservés), au lieu d'un 200 canonicalisé.
function langRedirect(urlObj, method) {
  if (method !== 'GET' && method !== 'HEAD') return null;
  if (!urlObj.searchParams.has('lang')) return null;
  const target = new URL(urlObj.toString());
  target.protocol = 'https:';
  target.hostname = CANONICAL_ORIGIN;
  target.port = '';
  target.searchParams.delete('lang');
  return new Response(null, {
    status: 301,
    headers: { location: target.toString(), 'cache-control': 'public, max-age=86400' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const urlObj = new URL(request.url);
    const pathname = urlObj.pathname;
    const debug = Boolean(env && env.PRERENDER_DEBUG === '1');

    // 308 et non 301 : préserve la méthode et le corps sur un POST.
    if (urlObj.hostname === 'www.guardiens.fr') {
      const target = `https://${CANONICAL_ORIGIN}${pathname}${urlObj.search}`;
      const headers = {
        location: target,
        'cache-control': 'public, max-age=3600',
      };
      if (debug) {
        headers['x-prerender-worker'] = 'guardiens-prerender-v7.5';
        headers['x-prerender-status'] = 'www-to-apex-308';
      }
      return new Response(null, { status: 308, headers });
    }

    // === v7.4 : sitemap vivant, puis redirection des variantes ?lang= ===
    if (pathname === '/sitemap.xml') return serveLiveSitemap(request);
    const langResponse = langRedirect(urlObj, request.method);
    if (langResponse) return langResponse;


    // Court-circuit assets, placé avant la détection de bot : ces fichiers
    // n'ont rien à y faire. GET sans Range uniquement, pour ne jamais stocker
    // une réponse partielle.
    if (
      request.method === 'GET' &&
      !request.headers.get('range') &&
      isImmutableAsset(pathname)
    ) {
      return serveImmutableAsset(request, ctx);
    }

    // C'est cette URL, et non request.url, qui devient la clé de cache
    // Prerender.
    const url = normalizePrerenderUrl(request.url);
    const normalizedPath = new URL(url).pathname;

    const { shouldPrerender, isBot, ua, reasons } = detectBot(request, env, normalizedPath);

    const baseDiag = debug
      ? {
          'X-Prerender-Worker': 'guardiens-prerender-v7.5',
          'X-Prerender-Bot-Detected': String(isBot),
          'X-Prerender-UA': ua || '(empty)',
          'X-Prerender-Skip-Reasons': reasons.join(',') || 'none',
          'X-Prerender-Normalized-Url': url,
        }
      : {};

    /**
     * Sortie unique vers l'origine. Le JSON-LD est posé sur les chemins de
     * secours, sans quoi, quand Prerender tombe, Googlebot reçoit une fiche
     * gardien sans le moindre Schema.org.
     *
     * Réservé aux bots : sur le chemin bypass, donc chaque visite humaine,
     * l'injection lisait tout le HTML en mémoire et ajoutait un aller-retour
     * vers Supabase pour un balisage qu'aucun navigateur n'exploite.
     */
    const serveOrigin = async (status, extra = {}) => {
      const originResp = await fetchOrigin(request);
      const profileMatch = isBot ? canonicalPath(pathname).match(PROFILE_PATH_RE) : null;
      const finalResp = profileMatch
        ? await injectProfileJsonLd(originResp, profileMatch[1])
        : originResp;
      return withDiagHeaders(
        finalResp,
        { ...baseDiag, 'X-Prerender-Status': status, ...extra },
        debug,
      );
    };

    if (!shouldPrerender) return serveOrigin('bypass');

    if (debug) console.log('[Prerender] Bot, UA: "' + ua + '", URL: ' + url);

    try {
      const token = env && env.PRERENDER_TOKEN;
      if (!token) {
        console.error('[Prerender] PRERENDER_TOKEN absent, repli sur l\'origine sans prerender');
        return serveOrigin('fallback-no-token');
      }

      const clientIp = request.headers.get('cf-connecting-ip') || '';
      // v7.5 : la feuille de style en ligne est lue pendant l'appel Prerender.
      const [prerenderResponse, cssHref] = await Promise.all([
        fetchPrerender(url, token, ua, clientIp),
        currentCssHref(),
      ]);

      if (prerenderResponse.ok) {
        return withDiagHeaders(
          alignBotHtml(prerenderResponse, cssHref),
          {
            ...baseDiag,
            'X-Prerender-Status': 'hit',
            'X-Prerender-Upstream-Status': prerenderResponse.status,
          },
          debug,
        );
      }

      // 3xx relayés tels quels. Le render est déjà facturé ; le jeter pour
      // servir un shell en 200 crée un soft-404 que le crawler ne consolide
      // jamais.
      if (prerenderResponse.status >= 300 && prerenderResponse.status < 400) {
        return withDiagHeaders(
          prerenderResponse,
          {
            ...baseDiag,
            'X-Prerender-Status': 'redirect-passthrough',
            'X-Prerender-Upstream-Status': prerenderResponse.status,
          },
          debug,
        );
      }

      // 404 relayé tel quel, voir l'invariant 2.
      if (prerenderResponse.status === 404) {
        return withDiagHeaders(
          alignBotHtml(prerenderResponse, cssHref),
          {
            ...baseDiag,
            'X-Prerender-Status': 'notfound-passthrough',
            'X-Prerender-Upstream-Status': 404,
          },
          debug,
        );
      }

      // 403, 429 et 5xx : repli sur l'origine, voir l'invariant 3.
      if (debug) console.log('[Prerender] Erreur ' + prerenderResponse.status + ' sur ' + url);
      return serveOrigin('fallback-upstream-error', {
        'X-Prerender-Upstream-Status': prerenderResponse.status,
      });
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      console.error('[Prerender] Échec sur ' + url + ' : ' + message);
      return serveOrigin('fallback-exception', { 'X-Prerender-Error': message });
    }
  },
};
