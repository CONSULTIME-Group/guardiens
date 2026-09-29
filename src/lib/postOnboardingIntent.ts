/**
 * Lot J1 : intention de publication conservée à travers la confirmation
 * d'email, l'onboarding affinité et l'onboarding profil.
 *
 * Une intention est une route de publication (demande d'entraide, garde,
 * projet). Elle est stockée en localStorage 24 h et consommée à la fin de
 * l'onboarding. Aucune autre route n'est retenue.
 */
const KEY = "guardiens_publish_intent";
const TTL_MS = 24 * 3600 * 1000;

const PUBLISH_PREFIXES = ["/petites-missions/creer", "/sits/create", "/projets/publier"];

export function isPublishPath(path: string | null | undefined): boolean {
  if (!path || !/^\/(?!\/)/.test(path)) return false;
  return PUBLISH_PREFIXES.some((p) => path === p || path.startsWith(p + "?") || path.startsWith(p + "/") || path.startsWith(p + "#"));
}

export function rememberPublishIntent(path: string | null | undefined, now = Date.now()): void {
  if (!isPublishPath(path)) return;
  try { localStorage.setItem(KEY, JSON.stringify({ path, at: now })); } catch { /* stockage indisponible */ }
}

export function readPublishIntent(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { path?: string; at?: number };
    if (!v.path || !isPublishPath(v.path) || typeof v.at !== "number" || now - v.at > TTL_MS) return null;
    return v.path;
  } catch { return null; }
}

export function clearPublishIntent(): void {
  try { localStorage.removeItem(KEY); } catch { /* rien */ }
}

/**
 * Destination de fin d'onboarding : `next` explicite, sinon intention de
 * publication connue, sinon repli fourni par l'appelant.
 */
export function resolvePostOnboardingTarget(next: string | null | undefined, fallback: string, now = Date.now()): string {
  if (next && /^\/(?!\/)/.test(next)) return next;
  return readPublishIntent(now) ?? fallback;
}
