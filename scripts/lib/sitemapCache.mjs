/**
 * Cache incrémental du générateur de sitemap.
 *
 * Doctrine posée le 12/08/2026, après un sitemap de production figé sur un état
 * intermédiaire : une clé d'invalidation nulle ne prouve rien. Elle signifie
 * « je ne sais pas si les données ont bougé », pas « rien n'a changé ». La
 * traiter comme une preuve d'immobilité fige l'entrée de cache pour toujours.
 * Donc : clé nulle, rechargement forcé, et log explicite au build.
 */

export function shouldRefresh({ head, cached, hasEntries, force = false }) {
  if (force) return true;
  if (head == null) return true;
  if (!cached || !hasEntries) return true;
  return cached.head !== head;
}

export async function fetchOrCache(key, cache, headProbe, fetcher, builder, force = false) {
  const head = await headProbe();
  const cached = cache.sources[key];
  const hasEntries = Boolean(cache.entries[key]);
  if (head == null) {
    console.warn(`  ⚠️ ${key}: clé d'invalidation absente, rechargement forcé`);
  }
  if (!shouldRefresh({ head, cached, hasEntries, force })) {
    console.log(`  ↳ ${key}: cached (${cache.entries[key].length} URLs)`);
    return cache.entries[key];
  }
  const rows = await fetcher();
  const entries = builder(rows || []);
  cache.sources[key] = { head, fetchedAt: new Date().toISOString() };
  cache.entries[key] = entries;
  console.log(`  ↳ ${key}: refreshed (${entries.length} URLs)`);
  return entries;
}
