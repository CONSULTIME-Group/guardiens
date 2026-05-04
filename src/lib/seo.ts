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
 * - Lowercases the path (origin is already lowercased by URL)
 * - Strips trailing slash (except root)
 * - Drops query string and hash
 * - Idempotent: normalizeCanonical(normalizeCanonical(x)) === normalizeCanonical(x)
 */
export const normalizeCanonical = (raw?: string | null): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const isAbsolute = /^https?:\/\//i.test(trimmed);
    const url = new URL(isAbsolute ? trimmed : trimmed, SITE_URL);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // Lowercase the path; normalizePathname collapses dup slashes and trims trailing.
    const path = normalizePathname(url.pathname.toLowerCase());
    return `${url.origin}${path}`;
  } catch {
    return null;
  }
};

export { SITE_URL };