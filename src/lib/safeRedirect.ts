/**
 * Sanitize a `redirect` query param so it can be safely used as an in-app
 * navigation target after login/signup. Prevents open-redirect attacks by
 * rejecting absolute URLs, protocol-relative URLs (`//evil.com`) and any
 * value that doesn't start with a single `/`.
 *
 * Returns the path (with optional query/hash) or `null` if invalid.
 */
export function sanitizeRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value: string;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (typeof value !== "string") return null;
  // Must be a same-origin path
  if (!value.startsWith("/")) return null;
  // Block protocol-relative (//evil.com) and backslash tricks (/\evil.com)
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  // Block auth pages to avoid loops
  const lower = value.toLowerCase();
  if (
    lower.startsWith("/login") ||
    lower.startsWith("/inscription") ||
    lower.startsWith("/register") ||
    lower.startsWith("/forgot-password") ||
    lower.startsWith("/reset-password") ||
    lower.startsWith("/auth/")
  ) {
    return null;
  }
  return value;
}

/** Build a `?redirect=<encoded>` suffix (or empty string). */
export function buildRedirectQuery(target: string | null | undefined): string {
  const safe = sanitizeRedirect(target ?? null);
  return safe ? `?redirect=${encodeURIComponent(safe)}` : "";
}
