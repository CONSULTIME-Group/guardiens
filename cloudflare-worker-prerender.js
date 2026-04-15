/**
 * Cloudflare Worker — Prerender.io proxy for guardiens.fr
 * ========================================================
 * Deploy: Cloudflare Dashboard > Workers & Pages > Create Worker > paste this code
 * Route:  *guardiens.fr/*
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

function shouldPrerender(request) {
  const url = new URL(request.url);
  if (IGNORED_EXTENSIONS.test(url.pathname)) return false;
  if (request.method !== 'GET') return false;
  if (request.headers.get('x-prerender')) return false;
  return BOT_REGEX.test(request.headers.get('user-agent') || '');
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

export default {
  async fetch(request, env, ctx) {
    if (!shouldPrerender(request)) {
      return fetch(request);
    }

    const ua = request.headers.get('user-agent') || '';
    const url = request.url;
    console.log('[Prerender] Bot detected — UA: "' + ua + '" — URL: ' + url);

    try {
      const prerenderResponse = await fetchPrerender(url);

      if (prerenderResponse.ok) {
        const headers = new Headers(prerenderResponse.headers);
        headers.set('X-Prerender-Status', 'hit');
        return new Response(prerenderResponse.body, {
          status: prerenderResponse.status,
          headers,
        });
      }

      console.log('[Prerender] Error ' + prerenderResponse.status + ' for ' + url + ' — fallback to origin');
      return fetch(request);
    } catch (err) {
      console.log('[Prerender] Failed for ' + url + ': ' + err.message + ' — fallback to origin');
      return fetch(request);
    }
  },
};
