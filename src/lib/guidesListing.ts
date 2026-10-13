/**
 * Liste des guides locaux (lot GL4, 14/10/2026) : groupes et nombre de lieux
 * affichés, alignés sur la page de chaque guide (src/lib/guidePlaces.ts).
 */
import { countryLabel } from "../../supabase/functions/_shared/guide-places/source.ts";

export interface ListedGuide {
  id: string;
  department?: string | null;
  country?: string | null;
  places_sourced_at?: string | null;
}

/** Groupe : département en France, nom du pays ailleurs, vide sinon. */
export function guideGroupLabel(g: ListedGuide): string {
  const c = (g.country || "FR").toUpperCase();
  if (c !== "FR") return countryLabel(c);
  return (g.department ?? "").trim();
}

/** Lieux affichés par guide : les seuls lieux sourcés pour un guide sourcé ou à l'étranger. */
export function visiblePlaceCounts(
  guides: ListedGuide[],
  places: { city_guide_id: string; source_url: string | null }[],
): Record<string, number> {
  const sourcedOnly = new Set(
    guides.filter((g) => g.places_sourced_at || (g.country && g.country.toUpperCase() !== "FR")).map((g) => g.id),
  );
  const counts: Record<string, number> = {};
  for (const p of places) {
    if (sourcedOnly.has(p.city_guide_id) && !p.source_url) continue;
    counts[p.city_guide_id] = (counts[p.city_guide_id] ?? 0) + 1;
  }
  return counts;
}
