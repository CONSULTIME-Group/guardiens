/**
 * Ordonnancement du démarrage (lot P2).
 *
 * - runAfterFirstPaint : exécute un travail non essentiel quand le
 *   navigateur a du temps libre après le premier affichage.
 * - prefetchRouteChunk : demande le fichier du tableau de bord dès le
 *   démarrage, en parallèle de la vérification de session, si un jeton
 *   de session est présent. Le module est le même que celui de la route
 *   paresseuse, il n'est donc chargé qu'une fois.
 */
export function runAfterFirstPaint(task: () => void, timeout = 2000): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  const run = () => {
    try { task(); } catch { /* travail accessoire, jamais bloquant */ }
  };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(run, { timeout });
  else window.setTimeout(run, 200);
}

export function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i) ?? "";
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) return true;
    }
  } catch { /* stockage indisponible */ }
  return false;
}

export function prefetchRouteChunk(pathname: string): void {
  if (typeof window === "undefined") return;
  if (!(pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) return;
  if (!hasStoredSession()) return;
  void import("../pages/Dashboard").catch(() => {});
}
