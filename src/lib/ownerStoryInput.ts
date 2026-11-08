/**
 * Lot L4 (08/11/2026) : entrée du récit propriétaire à partir des données
 * déjà lues par le tableau de bord. Aucune lecture de plus.
 */
import type { DeparturePeriod } from "@/lib/ownerDeparture";
import type { OwnerStoryInput } from "@/lib/dashboardStory";

type Row = Record<string, any>;

export interface OwnerStorySource {
  today: string;
  sits: Row[];
  pets: Row[];
  /** Candidatures en attente sur les annonces ouvertes, nouvelles d'abord. */
  awaitingApps: Row[];
  sitterProfiles: Record<string, { first_name?: string | null } | undefined>;
  pendingReviews: Array<{ sitId: string; sitterName?: string | null }>;
  latestDraft?: Row | null;
  ongoingSit?: Row | null;
  period?: DeparturePeriod | null;
  city?: string | null;
  nearbySittersCount?: number;
}

const firstName = (profiles: OwnerStorySource["sitterProfiles"], id: string | null | undefined): string | null => {
  if (!id) return null;
  const n = profiles[id]?.first_name;
  return typeof n === "string" && n.trim() ? n.trim().split(/\s+/)[0] : null;
};

const acceptedSitterId = (sit: Row): string | null =>
  ((sit.applications ?? []) as Row[]).find((a) => a.status === "accepted")?.sitter_id ?? null;

const byStart = (a: Row, b: Row) => String(a.start_date ?? "9999").localeCompare(String(b.start_date ?? "9999"));

export function buildOwnerStoryInput(s: OwnerStorySource): OwnerStoryInput {
  const { today } = s;

  const ongoing = s.ongoingSit ?? null;
  const confirmed = s.sits
    .filter((x) => x.status === "confirmed" && x.id !== ongoing?.id && (!x.end_date || x.end_date >= today))
    .sort(byStart)[0] ?? null;
  const active = s.sits.filter((x) => x.status === "published").sort(byStart)[0] ?? null;

  const unread = s.awaitingApps.filter((a) => a.status === "pending");
  const first = unread[0] ?? s.awaitingApps[0] ?? null;

  const review = s.pendingReviews[0] ?? null;

  return {
    today,
    period: s.period ?? null,
    city: s.city ?? null,
    petNames: s.pets.map((p) => p.name),
    ongoingSit: ongoing
      ? { id: ongoing.id, end_date: ongoing.end_date ?? null, sitterFirstName: firstName(s.sitterProfiles, acceptedSitterId(ongoing)) }
      : null,
    confirmedSit: confirmed
      ? {
          id: confirmed.id,
          start_date: confirmed.start_date ?? null,
          end_date: confirmed.end_date ?? null,
          sitterFirstName: firstName(s.sitterProfiles, acceptedSitterId(confirmed)),
        }
      : null,
    awaiting: {
      total: s.awaitingApps.length,
      unread: unread.length,
      first: first
        ? { sitId: first.sit_id, applicationId: first.id ?? null, sitterFirstName: firstName(s.sitterProfiles, first.sitter_id) }
        : null,
    },
    activeSit: active ? { id: active.id, start_date: active.start_date ?? null, end_date: active.end_date ?? null } : null,
    latestDraft: s.latestDraft
      ? { id: s.latestDraft.id, end_date: s.latestDraft.end_date ?? null, cancellation_reason: s.latestDraft.cancellation_reason ?? null }
      : null,
    reviewDue: review ? { sitId: review.sitId, sitterFirstName: review.sitterName ? String(review.sitterName).split(/\s+/)[0] : null } : null,
    nearbySittersCount: s.nearbySittersCount ?? 0,
  };
}
