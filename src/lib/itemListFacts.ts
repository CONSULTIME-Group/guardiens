/**
 * Lot RCH7 (14/11/2026) : faits d'une garde repris dans l'ItemList de
 * /annonces (« 2 chats · Chazay-d'Azergues »). Seulement ce que la carte affiche.
 */
import { petSpeciesCountLabel } from "@/lib/petLabels";

export function itemListPlace(sit: any): string | null {
  const city = String(sit?.locationCity ?? sit?.city ?? "").trim();
  return city || null;
}

export function itemListSpecies(sit: any): string | null {
  const groups: Record<string, number> = {};
  (sit?.pets || []).forEach((p: any) => { if (p?.species) groups[p.species] = (groups[p.species] || 0) + 1; });
  const text = Object.entries(groups).map(([sp, n]) => petSpeciesCountLabel(sp, n)).filter(Boolean).join(", ");
  return text || null;
}

export function itemListDescription(item: { place?: string | null; species?: string | null }): string | null {
  const parts = [item.species, item.place].filter((v): v is string => !!v && v.trim().length > 0);
  return parts.length > 0 ? parts.join(" · ") : null;
}
