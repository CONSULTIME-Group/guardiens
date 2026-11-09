/**
 * Lot L7 (09/11/2026, arène tableau de bord v2) : entrée du récit gardien à
 * partir des données déjà lues par le tableau de bord. Aucune lecture de plus.
 *
 * Garde mise en avant : la première des gardes classées pour le gardien
 * (zone d'alerte, distance, affinité), à laquelle il n'a pas encore candidaté
 * et dont les dates ne chevauchent pas une garde où il est déjà retenu.
 */
import type { SitterOpening, SitterStoryInput } from "@/lib/dashboardStory";
import { formatCityLabel } from "@/lib/cityLabel";

type Pet = { name?: string | null };

export interface SitterGuardLike {
  id: string;
  start_date?: string | null;
  end_date?: string | null;
  city?: string | null;
  property_id?: string | null;
  ownerName?: string | null;
  pets?: Pet[] | null;
}

export interface SitterOpeningSource {
  id: string;
  city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  owner_first_name?: string | null;
  distance_km?: number | null;
  pet_names?: string[] | null;
}

export interface SitterStorySource {
  today: string;
  ongoingGuard?: SitterGuardLike | null;
  nextGuard?: SitterGuardLike | null;
  reviewDue?: { sitId: string; ownerFirstName?: string | null } | null;
  pendingApplication?: { sitId: string; ownerFirstName?: string | null; created_at?: string | null } | null;
  /** Gardes classées pour le gardien (useSitterTopAffinitySits). */
  rankedSits: SitterOpeningSource[];
  appliedSitIds: string[];
  openCount: number;
}

const firstWord = (s: string | null | undefined): string | null => {
  const t = (s ?? "").trim();
  return t ? t.split(/\s+/)[0] : null;
};

const petNames = (pets: Pet[] | null | undefined): string[] =>
  (pets ?? []).map((p) => (p?.name ?? "").trim()).filter(Boolean);

/** Deux périodes AAAA-MM-JJ se chevauchent (bornes incluses, dates absentes : aucun chevauchement). */
export function datesOverlap(
  a: { start_date?: string | null; end_date?: string | null },
  b: { start_date?: string | null; end_date?: string | null },
): boolean {
  if (!a.start_date || !a.end_date || !b.start_date || !b.end_date) return false;
  return a.start_date.slice(0, 10) <= b.end_date.slice(0, 10) && b.start_date.slice(0, 10) <= a.end_date.slice(0, 10);
}

export function pickSitterOpening(s: Pick<SitterStorySource, "rankedSits" | "appliedSitIds" | "ongoingGuard" | "nextGuard">): SitterOpening | null {
  const applied = new Set(s.appliedSitIds);
  const busy = [s.ongoingGuard, s.nextGuard].filter(Boolean) as SitterGuardLike[];
  const o = s.rankedSits.find((x) => !applied.has(x.id) && !busy.some((g) => datesOverlap(g, x))) ?? null;
  if (!o) return null;
  return {
    id: o.id,
    ownerFirstName: firstWord(o.owner_first_name),
    city: formatCityLabel(o.city) || null,
    distanceKm: typeof o.distance_km === "number" ? o.distance_km : null,
    start_date: o.start_date ?? null,
    end_date: o.end_date ?? null,
    petNames: o.pet_names ?? [],
  };
}

export function buildSitterStoryInput(s: SitterStorySource): SitterStoryInput {
  const ongoing = s.ongoingGuard ?? null;
  const next = s.nextGuard ?? null;
  return {
    today: s.today,
    ongoingSit: ongoing
      ? { id: ongoing.id, end_date: ongoing.end_date ?? null, ownerFirstName: firstWord(ongoing.ownerName), petNames: petNames(ongoing.pets) }
      : null,
    confirmedSit: next
      ? {
          id: next.id,
          propertyId: next.property_id ?? null,
          start_date: next.start_date ?? null,
          city: formatCityLabel(next.city) || null,
          ownerFirstName: firstWord(next.ownerName),
          petNames: petNames(next.pets),
        }
      : null,
    reviewDue: s.reviewDue ? { sitId: s.reviewDue.sitId, ownerFirstName: firstWord(s.reviewDue.ownerFirstName) } : null,
    pendingApplication: s.pendingApplication
      ? {
          sitId: s.pendingApplication.sitId,
          ownerFirstName: firstWord(s.pendingApplication.ownerFirstName),
          created_at: s.pendingApplication.created_at ?? null,
        }
      : null,
    opening: pickSitterOpening(s),
    openCount: s.openCount,
  };
}
