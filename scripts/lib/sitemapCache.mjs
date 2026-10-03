/**
 * Cache incrémental du générateur de sitemap.
 *
 * Doctrine posée le 12/08/2026, après un sitemap de production figé sur un état
 * intermédiaire : une clé d'invalidation nulle ne prouve rien. Elle signifie
 * « je ne sais pas si les données ont bougé », pas « rien n'a changé ». La
 * traiter comme une preuve d'immobilité fige l'entrée de cache pour toujours.
 * Donc : clé nulle, rechargement forcé, et log explicite au build.
 *
 * SEO-3 (03/10/2026) :
 * - le format du cache est versionné (SITEMAP_CACHE_VERSION). Un cache d'une
 *   autre version est ignoré en entier, ses anciennes entrées et dates ne
 *   peuvent plus revenir ;
 * - une sonde qui échoue (exception) vaut une clé inconnue : relecture
 *   complète, avertissement explicite ;
 * - une lecture qui échoue fait échouer la génération : jamais de liste vide
 *   mise en cache à la place d'une panne ;
 * - les sources sans clé de contenu complète passent `headProbe = null` et
 *   sont relues à chaque build, sans être écrites dans le cache.
 */

export const SITEMAP_CACHE_VERSION = 3;

export function emptyCache() {
  return { version: SITEMAP_CACHE_VERSION, sources: {}, entries: {} };
}

/** Accepte seulement un cache de la version courante, sinon cache vide. */
export function normalizeCache(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== SITEMAP_CACHE_VERSION) return emptyCache();
  if (!raw.sources || typeof raw.sources !== "object" || !raw.entries || typeof raw.entries !== "object") {
    return emptyCache();
  }
  return raw;
}

export function shouldRefresh({ head, cached, hasEntries, force = false }) {
  if (force) return true;
  if (head == null) return true;
  if (!cached || !hasEntries) return true;
  return cached.head !== head;
}

/**
 * @param headProbe fonction async renvoyant une clé, ou null pour une source
 *   toujours relue (aucune clé de contenu fiable).
 */
export async function fetchOrCache(key, cache, headProbe, fetcher, builder, force = false) {
  let head = null;
  const cacheable = typeof headProbe === "function";
  if (cacheable) {
    try {
      head = await headProbe();
    } catch (e) {
      head = null;
      console.warn(`  ⚠️ ${key}: sonde en échec (${e instanceof Error ? e.message : String(e)}), relecture complète`);
    }
  }
  const cached = cache.sources[key];
  const hasEntries = Array.isArray(cache.entries[key]);
  if (cacheable && head == null) {
    console.warn(`  ⚠️ ${key}: clé d'invalidation absente, rechargement forcé`);
  }
  if (cacheable && !shouldRefresh({ head, cached, hasEntries, force })) {
    console.log(`  ↳ ${key}: cached (${cache.entries[key].length} URLs)`);
    return cache.entries[key];
  }
  const rows = await fetcher();
  if (!Array.isArray(rows)) {
    throw new Error(`${key}: lecture invalide (résultat non tableau)`);
  }
  const entries = builder(rows);
  if (cacheable && head != null) {
    cache.sources[key] = { head, fetchedAt: new Date().toISOString() };
    cache.entries[key] = entries;
  } else {
    delete cache.sources[key];
    delete cache.entries[key];
  }
  console.log(`  ↳ ${key}: ${cacheable ? "refreshed" : "relue (sans cache)"} (${entries.length} URLs)`);
  return entries;
}
