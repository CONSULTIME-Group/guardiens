/**
 * Construit la « Trust Timeline » d'un gardien : suite d'évènements publics
 * prouvant son sérieux dans le temps (inscription, 1er avis, 1er 5★, badges
 * majeurs, jalons de gardes). Plus une heatmap d'activité mensuelle.
 *
 * Aucune donnée privée : tout est déduit de champs déjà publics côté profil.
 */

import { format, differenceInMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export type TimelineEventKind =
  | "join"
  | "first_review"
  | "first_five_star"
  | "badge"
  | "milestone_sits"
  | "last_activity";

export interface TimelineEvent {
  kind: TimelineEventKind;
  date: string; // ISO
  label: string;
  detail?: string;
}

export interface ActivityMonth {
  /** YYYY-MM */
  ym: string;
  /** Mois affiché */
  label: string;
  count: number;
}

interface ReviewLike {
  created_at: string;
  overall_rating: number | null;
}

interface BadgeLike {
  badge_id: string;
  created_at: string;
  count: number;
}

interface Input {
  memberSince?: string | null;
  reviews: ReviewLike[];
  badges: BadgeLike[];
  completedSits: number;
  lastActivity?: string | null;
}

// Badges qui méritent une mention timeline (les autres restent dans BadgeRow).
const MAJOR_BADGES = new Set([
  "super_sitter",
  "verified",
  "super_voisin",
  "founder",
  "pro_verified",
]);

const BADGE_LABELS: Record<string, string> = {
  super_sitter: "Devient Super Sitter",
  verified: "Identité vérifiée",
  super_voisin: "Reconnu de confiance",
  founder: "Membre fondateur",
  pro_verified: "Pro vérifié",
};

const SIT_MILESTONES = [1, 5, 10, 25, 50, 100];

export function buildTrustTimeline(input: Input): TimelineEvent[] {
  const out: TimelineEvent[] = [];

  if (input.memberSince) {
    out.push({
      kind: "join",
      date: input.memberSince,
      label: "Inscription",
      detail: format(new Date(input.memberSince), "MMMM yyyy", { locale: fr }),
    });
  }

  const ratedSorted = [...input.reviews]
    .filter((r) => r.created_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (ratedSorted.length > 0) {
    out.push({
      kind: "first_review",
      date: ratedSorted[0].created_at,
      label: "Premier avis reçu",
    });
    const firstFive = ratedSorted.find((r) => (r.overall_rating ?? 0) >= 5);
    if (firstFive) {
      out.push({
        kind: "first_five_star",
        date: firstFive.created_at,
        label: "Premier avis 5 étoiles",
      });
    }
  }

  for (const b of input.badges) {
    if (MAJOR_BADGES.has(b.badge_id)) {
      out.push({
        kind: "badge",
        date: b.created_at,
        label: BADGE_LABELS[b.badge_id] ?? "Badge obtenu",
      });
    }
  }

  // Jalons de gardes : on les positionne à la date du dernier avis si dispo,
  // sinon date aujourd'hui (le gardien a vraiment atteint le palier).
  const lastReviewDate = ratedSorted.length > 0
    ? ratedSorted[ratedSorted.length - 1].created_at
    : input.lastActivity ?? input.memberSince ?? null;

  for (const m of SIT_MILESTONES) {
    if (input.completedSits >= m && lastReviewDate) {
      out.push({
        kind: "milestone_sits",
        date: lastReviewDate,
        label: `${m} garde${m > 1 ? "s" : ""} réalisée${m > 1 ? "s" : ""}`,
      });
    }
  }

  if (input.lastActivity) {
    out.push({
      kind: "last_activity",
      date: input.lastActivity,
      label: "Dernière activité",
    });
  }

  // Tri chronologique ascendant
  return out.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

/** Heatmap des 12 derniers mois : nb d'évènements publics (avis + badges) par mois. */
export function buildActivityHeatmap(
  reviews: ReviewLike[],
  badges: BadgeLike[],
): ActivityMonth[] {
  const now = new Date();
  const months: ActivityMonth[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1));
    months.push({
      ym: format(d, "yyyy-MM"),
      label: format(d, "MMM", { locale: fr }),
      count: 0,
    });
  }
  const bump = (iso: string) => {
    const ym = format(new Date(iso), "yyyy-MM");
    const slot = months.find((m) => m.ym === ym);
    if (slot) slot.count++;
  };
  reviews.forEach((r) => r.created_at && bump(r.created_at));
  badges.forEach((b) => b.created_at && bump(b.created_at));
  return months;
}

export function maxActivity(months: ActivityMonth[]): number {
  return months.reduce((m, x) => Math.max(m, x.count), 0);
}

/** Évènements Schema.org pour enrichir le bloc Person. */
export function timelineToSchemaEvents(events: TimelineEvent[]) {
  return events.map((e) => ({
    "@type": "Event",
    name: e.label,
    startDate: e.date.slice(0, 10),
  }));
}

export function monthsSince(iso: string): number {
  return Math.max(0, differenceInMonths(new Date(), new Date(iso)));
}
