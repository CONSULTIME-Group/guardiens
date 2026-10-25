/**
 * Lot ERRFIX du 25/10/2026 : prerender-recache-pending refuse plus de
 * PRERENDER_BATCH_MAX adresses par appel (queue-prerender-refresh.ts, limite 200).
 * /admin/prerender découpe donc la sélection en paquets envoyés l'un après l'autre.
 */
export const PRERENDER_BATCH_MAX = 200;

export function chunkPrerenderUrls(urls: readonly string[], size = PRERENDER_BATCH_MAX): string[][] {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const step = Math.max(1, Math.floor(size));
  const out: string[][] = [];
  for (let i = 0; i < unique.length; i += step) out.push(unique.slice(i, i + step));
  return out;
}
