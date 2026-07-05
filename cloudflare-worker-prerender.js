/**
 * Cloudflare Worker — Prerender.io proxy for guardiens.fr
 * ========================================================
 * Deploy: Cloudflare Dashboard > Workers & Pages > guardiens-prerender > Edit code
 * Route:  guardiens.fr/* + *guardiens.fr/*
 *
 * DIAGNOSTIC VERSION — adds X-Prerender-* headers on every response
 * so you can curl and see exactly what the Worker decided.
 */

// PRERENDER_TOKEN est lu exclusivement depuis env.PRERENDER_TOKEN
// (variable chiffrée Cloudflare Worker Secrets). Aucun fallback en clair.
// Si absent, le Worker log un warning et sert l'origine sans prerender.
const PRERENDER_SERVICE = 'https://service.prerender.io/';
const PRERENDER_TIMEOUT_MS = 10000;

const IGNORED_EXTENSIONS = /\.(js|css|xml|less|png|jpg|jpeg|gif|pdf|doc|txt|ico|rss|zip|mp3|rar|exe|wmv|avi|ppt|mpg|mpeg|tif|wav|mov|psd|ai|xls|mp4|m4a|swf|dat|dmg|iso|flv|m4v|torrent|ttf|woff|woff2|svg|eot|webp|avif|webm|json)$/i;

const BOT_AGENTS = [
  // SEO crawlers
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'yandexbot',
  'baiduspider', 'applebot',
  // Generative AI bots
  'chatgpt-user', 'gptbot', 'claudebot', 'claude-web',
  'anthropic-ai', 'perplexitybot', 'perplexity-user', 'bytespider',
  // Social sharing bots
  'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
  'slackbot', 'whatsapp', 'telegrambot', 'discordbot',
  'pinterestbot', 'redditbot',
  // Third-party SEO crawlers
  'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot',
];

const BOT_REGEX = new RegExp(BOT_AGENTS.join('|'), 'i');

function detectBot(request) {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';
  const reasons = [];

  if (IGNORED_EXTENSIONS.test(url.pathname)) reasons.push('static-asset');
  if (request.method !== 'GET' && request.method !== 'HEAD') reasons.push('non-get');
  if (request.headers.get('x-prerender')) reasons.push('loop-guard');

  const isBot = BOT_REGEX.test(ua);
  if (!isBot) reasons.push('not-a-bot');

  return { shouldPrerender: reasons.length === 0 && isBot, isBot, ua, reasons };
}

async function fetchPrerender(url, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PRERENDER_TIMEOUT_MS);
  try {
    const response = await fetch(PRERENDER_SERVICE + encodeURIComponent(url), {
      headers: { 'X-Prerender-Token': token },
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

function withDiagHeaders(response, diag) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(diag)) {
    headers.set(k, String(v).slice(0, 200));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Origine réelle Lovable (IP directe via Cloudflare resolveOverride)
// On contourne la redirection guardiens.lovable.app → guardiens.fr
// en tapant directement le serveur Lovable avec le bon Host header.
const LOVABLE_ORIGIN_HOST = 'guardiens.lovable.app';

async function fetchOrigin(request) {
  const url = new URL(request.url);
  // Réécrit l'URL vers l'origine Lovable publiée, en gardant path + query
  const originUrl = `https://${LOVABLE_ORIGIN_HOST}${url.pathname}${url.search}`;

  // Clone les headers MAIS retire le Host (sinon Lovable redirige)
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('x-forwarded-host', 'guardiens.fr');
  headers.set('x-forwarded-proto', 'https');
  // Indique à Lovable que la requête vient déjà du domaine final
  headers.set('x-lovable-skip-redirect', '1');

  return fetch(originUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  });
}

// URL de la fonction profile-jsonld (SSR du Schema.org pour Rich Results)
const PROFILE_JSONLD_URL = 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/profile-jsonld';
// Match /gardiens/:uuid (et tolère un slash final)
const PROFILE_PATH_RE = /^\/gardiens\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

/**
 * Injecte le JSON-LD (Person + Service) dans le <head> du HTML servi aux
 * humains. Garantit que Google + crawlers IA voient le Schema.org même sans
 * exécuter le JS de la SPA. Les bots SEO passent déjà par Prerender.io qui
 * exécute Helmet — ce chemin couvre les humains et les crawlers light.
 */
async function injectProfileJsonLd(originResponse, profileId) {
  const ct = originResponse.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return originResponse;
  try {
    const [html, jsonldResp] = await Promise.all([
      originResponse.text(),
      fetch(`${PROFILE_JSONLD_URL}?id=${profileId}`, {
        headers: { 'accept': 'text/html' },
      }),
    ]);
    if (!jsonldResp.ok) {
      return new Response(html, {
        status: originResponse.status,
        headers: originResponse.headers,
      });
    }
    const jsonldHtml = await jsonldResp.text();
    if (!jsonldHtml) {
      return new Response(html, {
        status: originResponse.status,
        headers: originResponse.headers,
      });
    }
    // Évite la double-injection si le HTML d'origine contient déjà notre marqueur.
    const marker = 'data-ssr-jsonld="profile"';
    const tagged = jsonldHtml.replace(
      /<script type="application\/ld\+json">/g,
      `<script type="application/ld+json" ${marker}>`,
    );
    const patched = html.includes(marker)
      ? html
      : html.replace(/<\/head>/i, `${tagged}</head>`);
    const headers = new Headers(originResponse.headers);
    headers.delete('content-length');
    headers.set('x-prerender-jsonld-injected', '1');
    return new Response(patched, {
      status: originResponse.status,
      headers,
    });
  } catch (err) {
    return originResponse;
  }
}

// robots.txt : servi par l'origine (public/robots.txt généré par scripts/generate-robots.mjs)
// pour garantir que les Disallow des routes privées (/admin, /dashboard, /messages, /sits...)
// soient bien exposés aux crawlers. Le Worker ne l'intercepte plus.

export default {
  async fetch(request, env, ctx) {
    const urlObj = new URL(request.url);
    const pathname = urlObj.pathname;

    // === 301 www → apex (canonical hostname) ===
    // Évite le duplicate content SEO : guardiens.fr est la seule version canonique.
    if (urlObj.hostname === 'www.guardiens.fr') {
      const target = `https://guardiens.fr${pathname}${urlObj.search}`;
      return new Response(null, {
        status: 301,
        headers: {
          'location': target,
          'cache-control': 'public, max-age=3600',
          'x-prerender-worker': 'guardiens-prerender-v5',
          'x-prerender-status': 'www-to-apex-301',
        },
      });
    }

    // /robots.txt : plus intercepté — laissé passer vers l'origine
    // (public/robots.txt généré liste toutes les routes privées à Disallow).

    const { shouldPrerender, isBot, ua, reasons } = detectBot(request);
    const url = request.url;

    const baseDiag = {
      'X-Prerender-Worker': 'guardiens-prerender-v5',
      'X-Prerender-Bot-Detected': String(isBot),
      'X-Prerender-UA': ua || '(empty)',
      'X-Prerender-Skip-Reasons': reasons.join(',') || 'none',
    };

    if (!shouldPrerender) {
      const originResp = await fetchOrigin(request);
      const profileMatch = pathname.match(PROFILE_PATH_RE);
      const finalResp = profileMatch
        ? await injectProfileJsonLd(originResp, profileMatch[1])
        : originResp;
      return withDiagHeaders(finalResp, {
        ...baseDiag,
        'X-Prerender-Status': 'bypass',
      });
    }

    console.log('[Prerender] Bot — UA: "' + ua + '" — URL: ' + url);

    try {
    try {
      const token = env && env.PRERENDER_TOKEN;
      if (!token) {
        console.log('[Prerender] PRERENDER_TOKEN missing, falling back to origin without prerender');
        const originResp = await fetchOrigin(request);
        return withDiagHeaders(originResp, {
          ...baseDiag,
          'X-Prerender-Status': 'fallback-no-token',
        });
      }
      const prerenderResponse = await fetchPrerender(url, token);

      if (prerenderResponse.ok) {
        return withDiagHeaders(prerenderResponse, {
          ...baseDiag,
          'X-Prerender-Status': 'hit',
          'X-Prerender-Upstream-Status': prerenderResponse.status,
        });
      }

      console.log('[Prerender] Error ' + prerenderResponse.status + ' for ' + url);
      const originResp = await fetchOrigin(request);
      return withDiagHeaders(originResp, {
        ...baseDiag,
        'X-Prerender-Status': 'fallback-upstream-error',
        'X-Prerender-Upstream-Status': prerenderResponse.status,
      });
    } catch (err) {
      console.log('[Prerender] Failed for ' + url + ': ' + err.message);
      const originResp = await fetchOrigin(request);
      return withDiagHeaders(originResp, {
        ...baseDiag,
        'X-Prerender-Status': 'fallback-exception',
        'X-Prerender-Error': err.message,
      });
    }
  },
};
