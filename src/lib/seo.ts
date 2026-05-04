const SITE_URL = "https://guardiens.fr";

export const normalizePathname = (pathname: string) => {
  const basePath = (pathname || "/").split(/[?#]/)[0] || "/";
  const normalized = `/${basePath}`.replace(/\/+/g, "/");

  if (normalized === "/") {
    return "/";
  }

  return normalized.replace(/\/+$/g, "");
};

export const buildAbsoluteUrl = (pathname: string) => {
  const normalizedPath = normalizePathname(pathname);
  return `${SITE_URL}${normalizedPath}`;
};

/**
 * Normalize a canonical URL value coming from any source (DB, prop, hardcoded).
 * - Trims whitespace
 * - Returns null if empty/invalid
 * - Resolves relative paths against SITE_URL
 * - Collapses duplicate slashes (incl. right after the domain)
 * - Lowercases the path
 * - Strips trailing slash (except root)
 * - Drops query string and hash
 * - Forces the canonical origin (SITE_URL) when host matches ignoring
 *   protocol (http→https) and an optional `www.` prefix. Cross-origin
 *   URLs are preserved as-is.
 * - Idempotent
 */
const SITE_HOST = new URL(SITE_URL).hostname.replace(/^www\./i, "");

export const normalizeCanonical = (raw?: string | null): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const isAbsolute = /^https?:\/\//i.test(trimmed);
    const url = new URL(isAbsolute ? trimmed : trimmed, SITE_URL);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const hostNoWww = url.hostname.replace(/^www\./i, "").toLowerCase();
    const origin = hostNoWww === SITE_HOST ? SITE_URL : url.origin;
    const path = normalizePathname(url.pathname.toLowerCase());
    return `${origin}${path}`;
  } catch {
    return null;
  }
};

export { SITE_URL };