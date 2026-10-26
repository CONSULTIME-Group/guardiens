/**
 * Lot perf 9 : attendre un travail réseau au plus `ms` millisecondes.
 * Au-delà, la suite continue sans lui ; le travail n'est pas annulé et son
 * résultat reste lisible par la promesse d'origine.
 */
export type Settled<T> = { done: true; value: T } | { done: false };

export async function settleWithin<T>(work: Promise<T>, ms: number): Promise<Settled<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<Settled<T>>((resolve) => {
    timer = setTimeout(() => resolve({ done: false }), Math.max(0, ms));
  });
  try {
    return await Promise.race([work.then((value) => ({ done: true as const, value })), late]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Délai accordé au géocodage des lieux de garde avant d'afficher la liste
 * d'une recherche avec un point. Un lieu en cache (navigateur ou serveur)
 * répond bien avant ; un lieu à chercher arrive ensuite, par une seconde passe.
 */
export const LOCATE_BUDGET_MS = 1200;

/** Vrai quand `full` porte au moins une clé absente de `shown`. */
export function hasNewCoords<K, V>(full: Map<K, V>, shown: Map<K, V>): boolean {
  for (const k of full.keys()) if (!shown.has(k)) return true;
  return false;
}
