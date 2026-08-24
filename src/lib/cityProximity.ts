// Proximité des pages villes SEO (23/08/2026).
//
// La formule de distance (haversine, rayon terrestre 6371 km) et le critère
// (distance <= geographic_radius déclaré par le gardien) reprennent exactement
// la fonction SQL recalc_seo_city_nearby_counts. Côté client, seules les
// coordonnées approximées sont lisibles (public_profiles.latitude_approx,
// volontairement arrondies) : la distance sert au tri, jamais à une mesure
// exacte.
//
// Sémantique figée : sitter_count = gardiens qui HABITENT la commune,
// nearby_sitter_count = gardiens qui INTERVIENNENT sans y habiter. Un gardien
// de proximité ne doit jamais être présenté comme habitant la commune.

import { postalMatchesDepartment } from "@/lib/postalDepartment";

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const rad = Math.PI / 180;
  const cos =
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lng2 - lng1) * rad) +
    Math.sin(lat1 * rad) * Math.sin(lat2 * rad);
  return 6371 * Math.acos(Math.min(1, Math.max(-1, cos)));
}

/**
 * Miroir exact de la regex SQL de recalc_seo_city_nearby_counts : nom de
 * commune en mot entier, insensible à la casse et aux accents. Les
 * ponctuations internes (trait d'union, espace) sont des frontières de mot
 * mais doivent être identiques des deux côtés, comme dans le SQL.
 */
export function cityNameMatches(
  profileCity: string | null | undefined,
  pageCity: string,
): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const name = norm(pageCity).trim();
  if (!name) return false;
  const escaped = name.replace(/[.^$*+?()[\]{}|\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(
    norm(profileCity ?? ""),
  );
}

/**
 * Construit le filtre `or` PostgREST ramenant les profils dont la ville
 * contient l'une quelconque des communes données (pages agrégées, ex :
 * Tahiti couvre Papeete, Faa'a, etc.). Chaque motif est mis entre
 * guillemets doubles : virgules et parenthèses éventuelles restent
 * littérales, et l'apostrophe d'un nom comme Faa'a traverse sans
 * échappement particulier car ce n'est pas un caractère réservé de la
 * syntaxe des filtres. L'astérisque est le joker ilike de PostgREST,
 * traduit en pourcent côté SQL même entre guillemets. Renvoie null si la
 * liste est vide ou blanche.
 */
export function buildCityIlikeOrFilter(communes: string[]): string | null {
  const parts = communes
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => `city.ilike."*${c.replace(/"/g, '\\"')}*"`);
  return parts.length ? parts.join(",") : null;
}

export interface NearbySitterCandidate {
  id: string;
  city: string | null;
  postal_code: string | null;
  latitude_approx: number | null;
  longitude_approx: number | null;
  geographic_radius: number | null;
}

export interface PickNearbyOptions {
  city: string;
  /**
   * Communes agrégées par la page (page île ou métropole). Chaque commune
   * est traitée comme résidente au même titre que `city` : un gardien qui
   * y habite est exclu du complément de proximité, il est déjà compté
   * dans les résidents.
   */
  aggregateCities?: string[] | null;
  departmentCode?: string | null;
  cityLat: number;
  cityLng: number;
  /** Ids déjà affichés comme résidents, exclus du complément. */
  excludeIds?: Set<string>;
  limit: number;
}

/**
 * Filtre et trie les gardiens de proximité : rayon déclaré couvrant la
 * commune, habitants de la commune exclus (même règle ville + département que
 * le SQL), distance croissante, plafonné à `limit`.
 */
export function pickNearbySitters<T extends NearbySitterCandidate>(
  candidates: T[],
  opts: PickNearbyOptions,
): Array<T & { distance_km: number }> {
  if (opts.limit <= 0) return [];
  const out: Array<T & { distance_km: number }> = [];
  for (const c of candidates) {
    if (opts.excludeIds?.has(c.id)) continue;
    if (c.latitude_approx == null || c.longitude_approx == null) continue;
    if (c.geographic_radius == null || c.geographic_radius <= 0) continue;
    // Habitant de la commune : déjà compté dans sitter_count, jamais en
    // proximité (évite le double comptage et la confusion d'affichage).
    if (
      cityNameMatches(c.city, opts.city) &&
      postalMatchesDepartment(c.postal_code, opts.departmentCode)
    ) {
      continue;
    }
    const distance = haversineKm(
      opts.cityLat,
      opts.cityLng,
      c.latitude_approx,
      c.longitude_approx,
    );
    if (distance > c.geographic_radius) continue;
    out.push({ ...c, distance_km: distance });
  }
  out.sort((a, b) => a.distance_km - b.distance_km || a.id.localeCompare(b.id));
  return out.slice(0, opts.limit);
}

/**
 * Mention sous le compteur de la page ville. Ne contient volontairement aucun
 * rayon chiffré : chaque gardien déclare son propre rayon, on écrit donc
 * "dans le secteur". Renvoie null quand il n'y a aucun gardien de proximité.
 */
export function buildNearbyMention(
  city: string,
  residents: number,
  nearby: number,
): string | null {
  if (nearby <= 0) return null;
  const verb = nearby > 1 ? "interviennent" : "intervient";
  if (residents <= 0) {
    return `Aucun gardien n'habite ${city}, mais ${nearby} ${verb} dans le secteur.`;
  }
  return `${residents} gardien${residents > 1 ? "s" : ""} habite${
    residents > 1 ? "nt" : ""
  } ${city}, ${nearby} autre${nearby > 1 ? "s" : ""} ${verb} aussi dans le secteur.`;
}
