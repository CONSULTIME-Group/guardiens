/**
 * Cloudflare Worker — Prerender.io proxy for guardiens.fr
 * ========================================================
 * Deploy: Cloudflare Dashboard > Workers & Pages > guardiens-prerender > Edit code
 * Route:  guardiens.fr/* + *guardiens.fr/*
 *
 * DIAGNOSTIC VERSION — adds X-Prerender-* headers on every response
 * so you can curl and see exactly what the Worker decided.
 */

const PRERENDER_TOKEN = 'P7riC8MFdBNYlNYGa8oz';
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

async function fetchPrerender(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PRERENDER_TIMEOUT_MS);
  try {
    const response = await fetch(PRERENDER_SERVICE + encodeURIComponent(url), {
      headers: { 'X-Prerender-Token': PRERENDER_TOKEN },
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

// Origine Lovable réelle (bypass de la boucle de redirection 302)
const ORIGIN_HOST = 'guardiens.lovable.app';

async function fetchOrigin(request) {
  const originUrl = new URL(request.url);
  originUrl.hostname = ORIGIN_HOST;
  // Override Host header pour que Lovable ne redirige pas vers guardiens.fr
  const originRequest = new Request(originUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'manual',
  });
  originRequest.headers.set('Host', ORIGIN_HOST);
  originRequest.headers.set('X-Forwarded-Host', new URL(request.url).hostname);
  return fetch(originRequest);
}

// URL de la fonction sitemap Supabase
const SITEMAP_URL = 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/sitemap';

// robots.txt servi en dur (rapide, fiable)
const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: https://guardiens.fr/sitemap.xml
`;

export default {
  async fetch(request, env, ctx) {
    const urlObj = new URL(request.url);
    const pathname = urlObj.pathname;

    // === Routes spéciales servies par le Worker ===
    if (pathname === '/robots.txt') {
      return new Response(ROBOTS_TXT, {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'public, max-age=3600',
          'x-prerender-worker': 'guardiens-prerender-v3',
          'x-prerender-status': 'worker-served',
        },
      });
    }

    if (pathname === '/sitemap.xml') {
      try {
        const sitemapResp = await fetch(SITEMAP_URL, {
          headers: { 'accept': 'application/xml' },
        });
        const body = await sitemapResp.text();
        return new Response(body, {
          status: sitemapResp.status,
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
            'x-prerender-worker': 'guardiens-prerender-v3',
            'x-prerender-status': 'sitemap-proxy',
          },
        });
      } catch (err) {
        return new Response('Sitemap unavailable', { status: 503 });
      }
    }

    const { shouldPrerender, isBot, ua, reasons } = detectBot(request);
    const url = request.url;

    const baseDiag = {
      'X-Prerender-Worker': 'guardiens-prerender-v3',
      'X-Prerender-Bot-Detected': String(isBot),
      'X-Prerender-UA': ua || '(empty)',
      'X-Prerender-Skip-Reasons': reasons.join(',') || 'none',
    };

    if (!shouldPrerender) {
      const originResp = await fetchOrigin(request);
      return withDiagHeaders(originResp, {
        ...baseDiag,
        'X-Prerender-Status': 'bypass',
      });
    }

    console.log('[Prerender] Bot — UA: "' + ua + '" — URL: ' + url);

    try {
      const prerenderResponse = await fetchPrerender(url);

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
