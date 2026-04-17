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
  if (request.method !== 'GET') reasons.push('non-get');
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

export default {
  async fetch(request, env, ctx) {
    const { shouldPrerender, isBot, ua, reasons } = detectBot(request);
    const url = request.url;

    const baseDiag = {
      'X-Prerender-Worker': 'guardiens-prerender-v2',
      'X-Prerender-Bot-Detected': String(isBot),
      'X-Prerender-UA': ua || '(empty)',
      'X-Prerender-Skip-Reasons': reasons.join(',') || 'none',
    };

    if (!shouldPrerender) {
      const originResp = await fetch(request);
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
      const originResp = await fetch(request);
      return withDiagHeaders(originResp, {
        ...baseDiag,
        'X-Prerender-Status': 'fallback-upstream-error',
        'X-Prerender-Upstream-Status': prerenderResponse.status,
      });
    } catch (err) {
      console.log('[Prerender] Failed for ' + url + ': ' + err.message);
      const originResp = await fetch(request);
      return withDiagHeaders(originResp, {
        ...baseDiag,
        'X-Prerender-Status': 'fallback-exception',
        'X-Prerender-Error': err.message,
      });
    }
  },
};
