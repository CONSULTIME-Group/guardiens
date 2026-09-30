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

// Remplacés au build par la liste JSON des fichiers (scripts/vite-plugin-member-preload.mjs).
const PRELOAD_APPLAYOUT = "__P2B_PRELOAD_APPLAYOUT__";
const PRELOAD_DASHBOARD = "__P2B_PRELOAD_DASHBOARD__";

/** Fichiers à précharger, [] si le repère n'a pas été remplacé (développement, tests). */
export function preloadList(raw: string): string[] {
  if (raw.startsWith("__P2B_")) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

function addModulePreload(files: string[]): void {
  for (const f of files) {
    const href = `/${f}`;
    if (document.head.querySelector(`link[rel="modulepreload"][href="${href}"]`)) continue;
    const l = document.createElement("link");
    l.rel = "modulepreload";
    l.href = href;
    l.crossOrigin = "";
    document.head.appendChild(l);
  }
}

/**
 * Lot P2b : quand un jeton de session existe, la coquille membre (et, sur
 * /dashboard, le tableau de bord) est téléchargée et compilée dès le
 * démarrage, en parallèle de la vérification de session, sans être
 * exécutée. P2 l'importait (téléchargement + exécution), ce qui ajoutait
 * une tâche longue au démarrage.
 */
export function prefetchRouteChunk(pathname: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!hasStoredSession()) return;
  const files = [...preloadList(PRELOAD_APPLAYOUT)];
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) files.push(...preloadList(PRELOAD_DASHBOARD));
  addModulePreload([...new Set(files)]);
}
