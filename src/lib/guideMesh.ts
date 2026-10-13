/**
 * Guides locaux : maillage et faits citables (lot GL4, 14/10/2026).
 *
 * - Guides voisins par distance réelle (coordonnées vérifiées à l'étape 1 du
 *   protocole), au lieu du seul département : utile aux frontières de
 *   départements et indispensable à l'étranger, où le département est vide.
 * - Faits citables par les moteurs (vétérinaire le plus proche, balades à
 *   moins de 15 km, date de vérification), tirés des seuls lieux sourcés.
 */
import { countryLabel, formatDistance, haversineM } from "../../supabase/functions/_shared/guide-places/source.ts";

export interface MeshGuide {
  id: string;
  slug: string;
  city: string;
  department?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface NearbyGuide extends MeshGuide {
  distanceKm: number | null;
}

/** Guides voisins : les plus proches dans `maxKm`, sinon ceux du même département. */
export function nearestGuides(current: MeshGuide, all: MeshGuide[], max = 6, maxKm = 150): NearbyGuide[] {
  const others = (Array.isArray(all) ? all : []).filter((g) => g.id !== current.id);
  if (current.latitude != null && current.longitude != null) {
    const near = others
      .filter((g) => g.latitude != null && g.longitude != null)
      .map((g) => ({
        ...g,
        distanceKm: Math.round(haversineM(current.latitude!, current.longitude!, g.latitude!, g.longitude!) / 1000),
      }))
      .filter((g) => g.distanceKm <= maxKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, max);
    if (near.length) return near;
  }
  if (!current.department) return [];
  return others
    .filter((g) => g.department && g.department === current.department)
    .slice(0, max)
    .map((g) => ({ ...g, distanceKm: null }));
}

/** Nom affiché : la ville seule en France, avec le pays ailleurs (« Saint Ludger, Canada »). */
export function guidePlaceName(g: { city: string; country?: string | null }): string {
  const c = (g.country || "FR").toUpperCase();
  return c === "FR" ? g.city : `${g.city}, ${countryLabel(c)}`;
}

export interface FactPlace {
  category: string;
  name: string;
  distance_km?: number | string | null;
  source_url?: string | null;
}

const dist = (p: FactPlace) => {
  if (p.distance_km === null || p.distance_km === undefined || p.distance_km === "") return null;
  const d = Number(p.distance_km);
  return Number.isFinite(d) ? d : null;
};

/** Faits courts et vérifiables, chacun avec sa question (FAQ affichée et balisée). */
export function guideFacts(
  city: string,
  places: FactPlace[],
  verifiedAt: string | null | undefined,
): { question: string; answer: string }[] {
  const sourced = places.filter((p) => p.source_url);
  const out: { question: string; answer: string }[] = [];
  const vets = sourced
    .filter((p) => p.category === "vet" && dist(p) != null)
    .sort((a, b) => dist(a)! - dist(b)!);
  if (vets[0]) {
    out.push({
      question: `Où est le vétérinaire le plus proche de ${city} ?`,
      answer: `${vets[0].name}, à ${formatDistance(dist(vets[0])! * 1000)} du centre de ${city}.`,
    });
  }
  const nature = sourced.filter((p) => ["general_park", "walk_trail", "dog_park"].includes(p.category) && dist(p) != null && dist(p)! <= 15);
  if (nature.length) {
    out.push({
      question: `Combien de lieux de promenade pour chien à moins de 15 km de ${city} ?`,
      answer: `${nature.length} lieu${nature.length > 1 ? "x" : ""} de promenade référencé${nature.length > 1 ? "s" : ""} à moins de 15 km, dont ${nature
        .slice(0, 3)
        .map((p) => p.name)
        .join(", ")}.`,
    });
  }
  if (verifiedAt && sourced.length) {
    const d = new Date(verifiedAt);
    if (!Number.isNaN(d.getTime())) {
      out.push({
        question: `D'où viennent les adresses de ce guide ?`,
        answer: `Des données OpenStreetMap, vérifiées le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} : chaque lieu renvoie à sa fiche source.`,
      });
    }
  }
  return out;
}
