/**
 * Lot M2 (12/10/2026) : page précédente dans l'application, pour savoir d'où
 * l'on arrive sur un formulaire. Tenue par PageViewTracker, en mémoire de
 * session, jamais envoyée ailleurs que dans les événements de mesure.
 */
const KEY = "guardiens_nav_history";

export function recordPath(path: string): void {
  try {
    const raw = sessionStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (list[list.length - 1] === path) return;
    sessionStorage.setItem(KEY, JSON.stringify([...list.slice(-1), path]));
  } catch { /* stockage indisponible */ }
}

/** Page vue juste avant `current` (ou la dernière vue si `current` est absent). */
export function previousPath(current: string): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const last = list[list.length - 1];
    if (last === current) return list.length > 1 ? list[list.length - 2] : null;
    return last ?? null;
  } catch {
    return null;
  }
}
