/**
 * Lot ONB1 (point 4) : remplissage du profil par semaine d'inscription,
 * par rôle, sur les seuls comptes inscrits depuis au moins 7 jours.
 *
 * Pourquoi : la moyenne globale baissait surtout par effet de composition
 * (part des propriétaires passée de 14 % à 30 à 40 %, barème propriétaire
 * plus exigeant) et les semaines récentes, encore jeunes, tiraient la
 * courbe vers le bas. Score lu : profiles.profile_completion actuel.
 */
import { startOfWeek, addDays, format } from "date-fns";

export const MATURE_AFTER_DAYS = 7;
export const COMPLETION_THRESHOLD = 40;
export const COHORT_WEEKS = 8;

export type CohortGroup = "sitter" | "owner";

export interface CompletionRow {
  role: string | null;
  profile_completion: number | null;
  created_at: string;
}

export interface GroupStats {
  /** Comptes de la semaine inscrits depuis au moins 7 jours. */
  mature: number;
  /** Part de ces comptes à 40 % ou plus, en pour cent entier, null sans compte. */
  shareAbove: number | null;
  median: number | null;
}

export interface CohortWeek {
  weekStart: string; // AAAA-MM-JJ, lundi
  label: string; // « 02/11 »
  signups: number;
  /** Une partie de la semaine a moins de 7 jours : chiffres provisoires. */
  partial: boolean;
  /** Jour où tous les comptes de la semaine ont 7 jours (« 16/11 »). */
  completeFrom: string;
  ownerShare: number | null;
  sitter: GroupStats;
  owner: GroupStats;
}

/** Gardiens seuls d'un côté, propriétaires et double rôle de l'autre. */
export function cohortGroupOf(role: string | null | undefined): CohortGroup | null {
  if (role === "sitter") return "sitter";
  if (role === "owner" || role === "both") return "owner";
  return null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function stats(scores: number[]): GroupStats {
  return {
    mature: scores.length,
    shareAbove: scores.length ? Math.round((scores.filter((v) => v >= COMPLETION_THRESHOLD).length / scores.length) * 100) : null,
    median: median(scores),
  };
}

/** Début de la plus ancienne semaine affichée, pour borner la lecture. */
export function cohortsSince(now: Date, weeks = COHORT_WEEKS): Date {
  return addDays(startOfWeek(now, { weekStartsOn: 1 }), -7 * (weeks - 1));
}

export function computeCompletionCohorts(rows: CompletionRow[], now: Date, weeks = COHORT_WEEKS): CohortWeek[] {
  const matureBefore = now.getTime() - MATURE_AFTER_DAYS * 86_400_000;
  const first = cohortsSince(now, weeks);
  const out: CohortWeek[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = addDays(first, 7 * i);
    const end = addDays(start, 7);
    const inWeek = rows.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= start.getTime() && t < end.getTime() && cohortGroupOf(r.role) !== null;
    });
    const mature = inWeek.filter((r) => new Date(r.created_at).getTime() <= matureBefore);
    const scores = (g: CohortGroup) => mature.filter((r) => cohortGroupOf(r.role) === g).map((r) => Number(r.profile_completion) || 0);
    const owners = inWeek.filter((r) => cohortGroupOf(r.role) === "owner").length;
    out.push({
      weekStart: format(start, "yyyy-MM-dd"),
      label: format(start, "dd/MM"),
      signups: inWeek.length,
      partial: end.getTime() - 1 > matureBefore,
      completeFrom: format(addDays(end, MATURE_AFTER_DAYS), "dd/MM"),
      ownerShare: inWeek.length ? Math.round((owners / inWeek.length) * 100) : null,
      sitter: stats(scores("sitter")),
      owner: stats(scores("owner")),
    });
  }
  return out.reverse();
}
