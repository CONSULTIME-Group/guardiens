/**
 * Rend la main au navigateur pendant un long calcul (lot P1b).
 * Utilisé par les boucles de scoring : mêmes résultats, même ordre, le
 * calcul est seulement découpé en tranches d'environ 8 ms pour ne jamais
 * former une tâche longue.
 */
export function yieldToMain(): Promise<void> {
  const s = (globalThis as any).scheduler;
  if (s && typeof s.yield === "function") return s.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Crée un point de contrôle : `await tick()` cède la main si la tranche dépasse `budgetMs`. */
export function createYieldBudget(budgetMs = 8) {
  let start = now();
  return async function tick(): Promise<void> {
    if (now() - start < budgetMs) return;
    await yieldToMain();
    start = now();
  };
}
