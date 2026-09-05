// MIROIR DE DOCUMENTATION, CE FICHIER NE DÉPLOIE RIEN.
// La source de vérité est l'éditeur Cloudflare (Workers & Pages >
// guardiens-prerender > Edit code). Ce fichier reflète la version active
// 415a7bc4 (v7.2 du 05/09/2026), capturée le 05/09/2026 et vérifiée identique
// au déployé par empreinte SHA-256. Toute modification faite ici reste sans
// effet sur la production tant qu'elle n'est pas reportée dans l'éditeur
// Cloudflare, ou déployée par `npx wrangler deploy`.

/**
 * Cloudflare Worker — Prerender.io proxy for guardiens.fr
 * ========================================================
 * Deploy: Cloudflare Dashboard > Workers & Pages > guardiens-prerender > Edit code
 *         ou `npx wrangler deploy`
 * Route:  guardiens.fr/* + *guardiens.fr/*
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
 *      NON CORRIGÉ VOLONTAIREMENT pour les 4xx : tant que la règle Ignored URL
 *      `/gardiens/` existe côté Prerender, relayer les 404 transformerait les
 *      261 fiches gardien du sitemap en 404 durs pour les crawlers. À rouvrir
 *      une fois cette règle tranchée.
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

// PRERENDER_TOKEN est lu exclusivement depuis env.PRERENDER_TOKEN
// (variable chiffrée Cloudflare Worker Secrets). Aucun fallback en clair.
const PRERENDER_SERVICE = 'https://service.prerender.io/';

// Hôte canonique. Toute autre forme (www, http, port, sous-domaine) est
// ramenée à celle-ci AVANT d'atteindre Prerender, sinon chaque variante est
// une entrée de cache distincte et facturée.
const CANONICAL_ORIGIN = 'guardiens.fr';

// 20 s : au-dessus du temps de rendu réel des pages les plus lourdes. Abandonner
// avant la fin ne fait pas économiser le render, il le fait payer deux fois car
// le crawler réessaie.
const PRERENDER_TIMEOUT_MS = 20000;

// Les bots sociaux coupent entre 3 et 10 s. Leur imposer 20 s garantit le pire
// scénario : aperçu de partage vide ET render facturé.
const PRERENDER_TIMEOUT_SOCIAL_MS = 8000;
const SOCIAL_REGEX = /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot|discordbot|pinterestbot|redditbot/i;

const IGNORED_EXTENSIONS = /\.(js|css|xml|less|png|jpg|jpeg|gif|pdf|doc|txt|ico|rss|zip|mp3|rar|exe|wmv|avi|ppt|mpg|mpeg|tif|wav|mov|psd|ai|xls|mp4|m4a|swf|dat|dmg|iso|flv|m4v|torrent|ttf|woff|woff2|svg|eot|webp|avif|webm|json)$/i;

/**
 * Paramètres de query string conservés dans l'URL envoyée à Prerender.
 * TOUT le reste est retiré, donc `?a=1&b=2` et `?a=9` produisent le même
 * render que l'URL nue.
 *
 * Règle d'ajout : un paramètre n'entre ici que s'il change le contenu indexable
 * de la page ET que la variante correspondante figure dans le sitemap. Aucune
 * URL du sitemap guardiens.fr ne porte de paramètre, donc cette liste est vide.
 * Chaque entrée ajoutée multiplie mécaniquement le nombre de renders facturés.
 */
const PRERENDER_KEEP_PARAMS = [];

/**
 * Chemins jamais envoyés à Prerender : parcours authentifié, formulaires,
 * redirections techniques et pages de test. Aucune valeur d'indexation, mais
 * un coût de render à chaque visite de bot non conforme au robots.txt.
 *
 * ATTENTION AVANT D'AJOUTER OU DE CRÉER UNE ROUTE. Les préfixes d'un seul
 * segment court (`/go`, `/dev`, `/test`, `/acces`, `/review`, `/profil`)
 * bloquent définitivement ces URLs exactes. Créer un jour une page publique
 * `/acces` (plan d'accès) ou `/review` la désindexerait en silence, sans
 * message d'erreur. Vérifié le 11/08/2026 sur les 713 URLs du sitemap :
 * aucune collision. À revérifier à chaque ajout de route publique.
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
  // SEO crawlers
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'yandexbot',
  'baiduspider', 'applebot',
  // Generative AI bots
  'chatgpt-user', 'gptbot', 'oai-searchbot', 'google-extended', 'claudebot', 'claude-web', 'claude-searchbot',
  'anthropic-ai', 'perplexitybot', 'perplexity-user', 'meta-externalagent',
  'meta-externalfetcher', 'amazonbot', 'applebot-extended', 'mistralai-user',
  'duckassistbot', 'cohere-ai', 'youbot',
  // Social sharing bots
  'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
  'slackbot', 'whatsapp', 'telegrambot', 'discordbot',
  'pinterestbot', 'redditbot',
  // mj12bot et dotbot retirés définitivement : aucune contrepartie business.
];

const OPTIONAL_BOT_AGENTS = ['bytespider'];

/**
 * Outils SEO commerciaux. Coupés par défaut pour préserver le quota, mais
 * rendus activables : sans eux, Ahrefs Site Audit et Semrush Site Audit ne
 * voient qu'un shell React vide et rapportent des centaines de faux « missing
 * title » et « thin content ». C'est la seule mesure externe du rendu.
 * Mettre `PRERENDER_ALLOW_SEO_TOOLS = '1'` le temps d'un audit, puis couper.
 */
const SEO_TOOL_AGENTS = ['ahrefsbot', 'ahrefssiteaudit', 'semrushbot'];

/** `new RegExp([].join('|'))` matche TOUTE chaîne. Garde-fou obligatoire. */
const safeRegex = (list) => (list.length ? new RegExp(list.join('|'), 'i') : /(?!)/);

const BOT_REGEX = safeRegex(BOT_AGENTS);
const OPTIONAL_BOT_REGEX = safeRegex(OPTIONAL_BOT_AGENTS);
const SEO_TOOL_REGEX = safeRegex(SEO_TOOL_AGENTS);

/** Effondre les slashs multiples et retire les slashs finaux. */
function canonicalPath(pathname) {
  const p = pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return p || '/';
}

function isNeverPrerendered(pathname) {
  const p = canonicalPath(pathname).toLowerCase();
  return NEVER_PRERENDER_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + '/'));
}

/**
 * Retourne l'URL canonique à soumettre à Prerender : https, hôte apex sans
 * port, pathname sans slash multiple ni slash final, query string réduite à la
 * whitelist et triée pour que l'ordre des paramètres ne crée pas deux entrées
 * de cache. Le fragment est ignoré, il n'est jamais transmis au serveur.
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
      // getAll sur le nom d'origine, toutes casses confondues.
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

  // Test sur le pathname NORMALISÉ : sinon `/assets/hero.png/` échappe à
  // l'ancre `$` du regex, puis la normalisation retire le slash et envoie
  // un PNG se faire rendre en navigateur headless.
  if (IGNORED_EXTENSIONS.test(normalizedPath)) reasons.push('static-asset');
  if (request.method !== 'GET' && request.method !== 'HEAD') reasons.push('non-get');
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
    // et les rapports Crawler Type / AI Insights sont inexploitables.
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

function withDiagHeaders(response, diag, debug) {
  if (!debug) return response;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(diag)) {
    // Un UA hostile peut contenir des octets que Headers.set refuse, et cet
    // appel est hors de tout try. On assainit plutôt que de risquer un 1101.
    const safe = String(v).replace(/[^\x20-\x7E]/g, '?').slice(0, 200);
    try {
      headers.set(k, safe);
    } catch (_e) { /* en-tête invalide, on l'omet */ }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Origine réelle Lovable. On tape directement le serveur Lovable avec le bon
// Host header pour contourner la redirection guardiens.lovable.app vers
// guardiens.fr.
const LOVABLE_ORIGIN_HOST = 'guardiens.lovable.app';

async function fetchOrigin(request) {
  const url = new URL(request.url);
  // L'origine reçoit l'URL COMPLÈTE, query comprise : la normalisation ne
  // concerne que Prerender, jamais ce que voit un humain.
  const originUrl = `https://${LOVABLE_ORIGIN_HOST}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  // Note : Workers dérive de toute façon le Host de l'URL de la sous-requête,
  // ce delete est un no-op conservé pour ne pas dérouter à la relecture.
  headers.delete('host');
  headers.set('x-forwarded-host', 'guardiens.fr');
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
 * Cache edge des fichiers dont le nom porte une empreinte de contenu.
 * Voir l'entrée v7.2 de l'en-tête pour le motif et pour la raison qui rend
 * cette dérogation compatible avec le « NON RETENU » du v7.1.
 */
const IMMUTABLE_PREFIXES = ['/assets/', '/lovable-uploads/'];
const IMMUTABLE_TTL = 31536000; // 1 an

function isImmutableAsset(pathname) {
  return IMMUTABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Sert un fichier immuable depuis le cache edge, en le remplissant au premier
 * passage. Seul un 200 franc est stocké : une 404 transitoire pendant un
 * déploiement ne doit pas être figée un an à la frontière.
 */
async function serveImmutableAsset(request, ctx) {
  const url = new URL(request.url);
  // Nom haché : la query string ne change jamais le contenu. On la retire pour
  // qu'un `?v=123` ne crée pas une entrée de cache distincte.
  const originUrl = `https://${LOVABLE_ORIGIN_HOST}${url.pathname}`;
  const cacheKey = new Request(originUrl, { method: 'GET' });
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // Cookies et autorisation retirés : leur simple présence suffit à faire
  // basculer Cloudflare en BYPASS.
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
    // Jamais de page blanche sur un asset : on laisse le chemin normal reprendre.
    return fetchOrigin(request);
  }

  if (originResponse.status !== 200) return originResponse;

  const out = new Response(originResponse.body, originResponse);
  out.headers.set('cache-control', `public, max-age=${IMMUTABLE_TTL}, immutable`);
  out.headers.delete('set-cookie');
  out.headers.set('x-guardiens-asset-cache', 'stored');
  ctx.waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}

// Fonction profile-jsonld (SSR du Schema.org pour Rich Results)
const PROFILE_JSONLD_URL = 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/profile-jsonld';
const PROFILE_PATH_RE = /^\/gardiens\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

/**
 * Injecte le JSON-LD (Person + Service) dans le <head>. Garantit que Google et
 * les crawlers IA voient le Schema.org même sans exécuter le JS de la SPA.
 *
 * Le corps de `originResponse` est lu UNE SEULE FOIS, avant tout appel réseau
 * qui pourrait rejeter. Tous les chemins d'échec repassent par `passthrough()`,
 * qui reconstruit une réponse à partir du texte déjà en mémoire. Retourner
 * `originResponse` après l'avoir lue provoquait une erreur 1101.
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
  // Remplacement par FONCTION : sinon `$&` ou une apostrophe dollar dans la
  // bio d'un gardien duplique une portion arbitraire du HTML dans le <head>.
  const patched = html.replace(/<\/head>/i, () => `${tagged}</head>`);

  const outHeaders = new Headers(headers);
  outHeaders.set('x-prerender-jsonld-injected', '1');
  return new Response(patched, { status: originResponse.status, headers: outHeaders });
}

// robots.txt : servi par l'origine (public/robots.txt généré par
// scripts/generate-robots.mjs). Le Worker ne l'intercepte pas.

export default {
  async fetch(request, env, ctx) {
    const urlObj = new URL(request.url);
    const pathname = urlObj.pathname;
    const debug = Boolean(env && env.PRERENDER_DEBUG === '1');

    // === 308 www vers apex ===
    // 308 et non 301 : préserve la méthode et le corps sur un POST.
    if (urlObj.hostname === 'www.guardiens.fr') {
      const target = `https://${CANONICAL_ORIGIN}${pathname}${urlObj.search}`;
      const headers = {
        location: target,
        'cache-control': 'public, max-age=3600',
      };
      if (debug) {
        headers['x-prerender-worker'] = 'guardiens-prerender-v7.2';
        headers['x-prerender-status'] = 'www-to-apex-308';
      }
      return new Response(null, { status: 308, headers });
    }

    // === Cache edge des fichiers à nom haché (v7.2) ===
    // Court-circuit placé le plus tôt possible : ces fichiers n'ont rien à
    // faire dans la détection de bot ni dans la normalisation d'URL. Limité au
    // GET sans Range, pour ne jamais stocker de réponse partielle.
    if (
      request.method === 'GET' &&
      !request.headers.get('range') &&
      isImmutableAsset(pathname)
    ) {
      return serveImmutableAsset(request, ctx);
    }

    // URL normalisée : c'est ELLE, et non `request.url`, qui devient la clé de
    // cache Prerender. Deux requêtes ne différant que par leurs paramètres de
    // tracking, leur protocole ou leurs slashs coûtent un seul render.
    const url = normalizePrerenderUrl(request.url);
    const normalizedPath = new URL(url).pathname;

    const { shouldPrerender, isBot, ua, reasons } = detectBot(request, env, normalizedPath);

    const baseDiag = debug
      ? {
          'X-Prerender-Worker': 'guardiens-prerender-v7.2',
          'X-Prerender-Bot-Detected': String(isBot),
          'X-Prerender-UA': ua || '(empty)',
          'X-Prerender-Skip-Reasons': reasons.join(',') || 'none',
          'X-Prerender-Normalized-Url': url,
        }
      : {};

    /**
     * Sortie unique vers l'origine. Pose le JSON-LD profil sur TOUS les
     * chemins, y compris les secours : sans cela, quand Prerender tombe,
     * Googlebot recevait un `/gardiens/:uuid` sans le moindre Schema.org.
     */
    const serveOrigin = async (status, extra = {}) => {
      const originResp = await fetchOrigin(request);
      const profileMatch = pathname.match(PROFILE_PATH_RE);
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
      const prerenderResponse = await fetchPrerender(url, token, ua, clientIp);

      if (prerenderResponse.ok) {
        return withDiagHeaders(
          prerenderResponse,
          {
            ...baseDiag,
            'X-Prerender-Status': 'hit',
            'X-Prerender-Upstream-Status': prerenderResponse.status,
          },
          debug,
        );
      }

      // 3xx : relayer tel quel. Le render est déjà facturé ; le jeter pour
      // servir un shell React en 200 crée un soft-404 et une redirection que
      // le crawler ne consolidera jamais.
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

      // 4xx et 5xx : repli sur l'origine, comportement du v6 conservé
      // volontairement. Relayer les 404 transformerait les 261 fiches gardien
      // du sitemap en 404 durs tant que la règle Ignored URL `/gardiens/`
      // existe côté Prerender. À rouvrir une fois cette règle tranchée.
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
