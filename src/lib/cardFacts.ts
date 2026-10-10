/**
 * Faits affichés sur les cartes (lot L4). Logique pure, aucune donnée inventée :
 * un fait absent est omis, jamais remplacé par une formulation générique.
 */
import { normalizeAnimalTypes } from "@/lib/sitterDistinctLine";
import { groupSitterSkills, type SkillGroup } from "@/lib/sitterSkillGroups";
import { travelZoneLabels } from "@/lib/travelZones";
import { getCountryName } from "@/lib/countries";

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

/** Note /5 sur le nombre d'AVIS publiés, gardes réalisées à part. */
export function ratingSummary(avg: number | null | undefined, reviewCount: number, sits: number): string | null {
  const parts: string[] = [];
  if (avg != null && Number.isFinite(avg) && reviewCount > 0) {
    parts.push(`${fmt(avg)}/5 sur ${reviewCount} avis`);
  }
  if (sits > 0) parts.push(`${sits} garde${sits > 1 ? "s réalisées" : " réalisée"}`);
  return parts.length ? parts.join(" · ") : null;
}

/** Citation réelle de la bio, coupée proprement sur un mot. */
export function cardQuote(bio: string | null | undefined, max = 120): string | null {
  const t = (bio ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const m = t.match(/^[^.!?…]+[.!?…]/);
  const first = (m ? m[0] : t).trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max + 1);
  const sp = cut.lastIndexOf(" ");
  const base = (sp > max * 0.5 ? cut.slice(0, sp) : first.slice(0, max)).replace(/[\s,;:.]+$/, "");
  return `${base}…`;
}

/** Animaux en libellés français, dédoublonnés. */
export function cardAnimals(types: string[] | null | undefined): string[] {
  return [...new Set(normalizeAnimalTypes(types))];
}

/** 1 ou 2 savoir-faire réels (gouaches existantes), jamais une offre d'entraide. */
export function cardSkillGroups(input: {
  animalTypes?: string[] | null;
  competences?: string[] | null;
  specialSkills?: string[] | null;
  /** Libellés déjà affichés (pastilles animaux), en minuscules. */
  exclude?: Set<string>;
}): SkillGroup[] {
  const { groups } = groupSitterSkills({
    animalTypes: input.animalTypes ?? [],
    competences: input.competences ?? [],
    specialSkills: input.specialSkills ?? [],
  } as any);
  return groups.filter((g) => !input.exclude?.has(g.label.toLowerCase())).slice(0, 2);
}

/** Mobilité déclarée, et pays affiché hors France. */
export function cardPlaceFacts(country: string | null | undefined, zones: string[] | null | undefined): {
  countryLabel: string | null;
  mobility: string | null;
} {
  const cc = (country ?? "").toUpperCase();
  const labels = travelZoneLabels(zones, cc || null);
  return {
    countryLabel: cc && cc !== "FR" ? getCountryName(cc) : null,
    mobility: labels.length ? `Se déplace : ${labels.slice(0, 2).join(", ")}` : null,
  };
}

/** Une annonce a une photo publique : couverture de l'annonce, du logement ou galerie. */
export function sitHasPhotos(s: any): boolean {
  return !!(
    s?.cover_photo_url ||
    s?.property?.cover_photo_url ||
    (Array.isArray(s?.property?.photos) && s.property.photos.length > 0) ||
    s?.ownerGalleryFirstPhoto
  );
}
