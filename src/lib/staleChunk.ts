/**
 * Fichiers de version obsolètes après publication (lot F1).
 * Un onglet resté ouvert demande un chunk dont le hash n'existe plus :
 * on recharge la page une seule fois, jamais deux fois en 60 secondes.
 */
const KEY = "stale-chunk-reload-at";
const WINDOW_MS = 60_000;

const STALE_RE =
  /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|Unable to preload CSS/i;

export const isStaleChunkError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return STALE_RE.test(message);
};

/** Recharge la page si aucun rechargement n'a eu lieu dans les 60 s. Renvoie true si rechargée. */
export const reloadOnceForStaleChunk = (): boolean => {
  try {
    const last = Number(sessionStorage.getItem(KEY));
    if (last && Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false; // sans stockage, aucun garde-fou anti-boucle : on ne recharge pas
  }
  window.location.reload();
  return true;
};
