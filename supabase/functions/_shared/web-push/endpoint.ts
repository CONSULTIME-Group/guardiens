// Validation stricte des endpoints push. Aucune URL arbitraire, pas de SSRF.
// Helper pur, sans dependance, teste directement.

export const PUSH_ENDPOINT_MAX_LENGTH = 512;

const EXACT_HOSTS = new Set([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
]);

const APPLE_SUFFIX = '.push.apple.com';

export type EndpointCheck =
  | { ok: true; host: string }
  | { ok: false; reason: string };

export function isAllowedPushHost(host: string): boolean {
  const h = host.toLowerCase();
  if (EXACT_HOSTS.has(h)) return true;
  // Suffixe strict avec le point : 'evilpush.apple.com' est refuse,
  // 'api.push.apple.com' est accepte.
  return h === 'push.apple.com' || h.endsWith(APPLE_SUFFIX);
}

export function validatePushEndpoint(raw: unknown): EndpointCheck {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { ok: false, reason: 'endpoint_missing' };
  }
  if (raw.length > PUSH_ENDPOINT_MAX_LENGTH) {
    return { ok: false, reason: 'endpoint_too_long' };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'endpoint_not_a_url' };
  }

  if (url.protocol !== 'https:') return { ok: false, reason: 'endpoint_not_https' };
  if (url.username || url.password) return { ok: false, reason: 'endpoint_has_credentials' };
  if (url.port) return { ok: false, reason: 'endpoint_has_port' };
  if (url.search) return { ok: false, reason: 'endpoint_has_query' };
  if (url.hash) return { ok: false, reason: 'endpoint_has_fragment' };
  if (!isAllowedPushHost(url.hostname)) return { ok: false, reason: 'endpoint_host_not_allowed' };

  return { ok: true, host: url.hostname.toLowerCase() };
}
