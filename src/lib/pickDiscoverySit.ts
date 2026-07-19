/**
 * pickDiscoverySit (vague 17) — logique pure d'extraction de la carte
 * « découverte » d'un pool d'annonces déjà scoré.
 *
 * Extraite de `useSitterTopAffinitySits` pour être testable en isolation
 * (les I/O réseau restent dans le hook). L'annonce retenue doit apporter
 * de l'altérité au gardien :
 *   (a) au moins une espèce absente de son expérience `animal_types`, OU
 *   (b) une ville différente de celles présentes dans le top.
 *
 * Contraintes :
 *   - jamais un id déjà présent dans le top,
 *   - jamais un critère faux si le gardien est déclaré « universel »
 *     (`all`/`tous`) sur les espèces,
 *   - retourne `null` si aucun candidat honnête n'apparaît.
 */

export interface DiscoveryCandidate {
  id: string;
  city: string | null;
  pet_species: string[];
}

export interface DiscoveryContext {
  /** Ids déjà présents dans le top (à exclure). */
  topIds: Iterable<string>;
  /** Villes du top, normalisées ou brutes (on normalise ici). */
  topCities: Iterable<string | null | undefined>;
  /** Espèces déjà expérimentées par le gardien. */
  sitterSpecies: Iterable<string | null | undefined>;
}

const norm = (v: string | null | undefined): string =>
  (v ?? "").trim().toLowerCase();

export function pickDiscoverySit<T extends DiscoveryCandidate>(
  pool: readonly T[],
  ctx: DiscoveryContext,
): T | null {
  const topIds = new Set<string>(ctx.topIds);
  const topCities = new Set<string>();
  for (const c of ctx.topCities) {
    const k = norm(c);
    if (k) topCities.add(k);
  }
  const sitterSpecies = new Set<string>();
  for (const s of ctx.sitterSpecies) {
    const k = norm(s);
    if (k) sitterSpecies.add(k);
  }
  const isUniversal = sitterSpecies.has("all") || sitterSpecies.has("tous");
  const hasSitterSpecies = sitterSpecies.size > 0;

  for (const card of pool) {
    if (topIds.has(card.id)) continue;
    const cityKey = norm(card.city);
    const cityIsNovel = cityKey ? !topCities.has(cityKey) : false;
    const speciesIsNovel =
      hasSitterSpecies && !isUniversal
        ? card.pet_species.some((sp) => {
            const k = norm(sp);
            return !!k && !sitterSpecies.has(k);
          })
        : false;
    if (cityIsNovel || speciesIsNovel) return card;
  }
  return null;
}
