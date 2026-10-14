/**
 * Lot J2d (14/10/2026) : dates d'un avis, CGU 9.7.
 *
 * « Les avis d'un profil sont présentés du plus récent au plus ancien, quelle
 * que soit leur note. Chaque avis indique sa date et la période de la garde
 * concernée. » Logique pure, testée par src/__tests__/j2d/.
 *
 * Les dates de la garde viennent toujours d'une lecture déjà faite
 * (public_profile_reviews renvoie sit_start_date et sit_end_date) ou d'une
 * seule lecture groupée par liste (review_sit_periods), jamais d'une lecture
 * par avis.
 */
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface DatedReview {
  created_at: string;
  sit_start_date?: string | null;
  sit_end_date?: string | null;
}

const parseDay = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const day = String(value).slice(0, 10);
  const d = new Date(`${day}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** « Garde du 3 au 10 août 2026 », « Garde du 28 juillet au 4 août 2026 », « Garde du 3 août 2026 ». */
export function reviewSitPeriodLabel(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const s = parseDay(start);
  const e = parseDay(end) ?? s;
  if (!s || !e) return null;
  const endLabel = format(e, "d MMMM yyyy", { locale: fr });
  if (s.getTime() === e.getTime()) return `Garde du ${endLabel}`;
  const startLabel =
    s.getFullYear() !== e.getFullYear()
      ? format(s, "d MMMM yyyy", { locale: fr })
      : s.getMonth() !== e.getMonth()
        ? format(s, "d MMMM", { locale: fr })
        : format(s, "d", { locale: fr });
  return `Garde du ${startLabel} au ${endLabel}`;
}

/** « Avis du 12 août 2026 » (date de dépôt, created_at). */
export function reviewDepositLabel(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return `Avis du ${format(d, "d MMMM yyyy", { locale: fr })}`;
}

/** Les deux mentions d'un avis : période de la garde (si l'avis porte sur une garde) et date de dépôt. */
export function reviewDateParts(review: DatedReview): { period: string | null; deposit: string } {
  return {
    period: reviewSitPeriodLabel(review.sit_start_date, review.sit_end_date),
    deposit: reviewDepositLabel(review.created_at),
  };
}

/** Une ligne : « Garde du 3 au 10 août 2026 · Avis du 12 août 2026 ». */
export function reviewDatesLine(review: DatedReview): string {
  const { period, deposit } = reviewDateParts(review);
  return [period, deposit].filter(Boolean).join(" · ");
}

/** Du plus récent au plus ancien, quelle que soit la note (copie, entrée intacte). */
export function sortReviewsNewestFirst<T extends { created_at: string }>(reviews: readonly T[]): T[] {
  return [...reviews].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export interface ReviewSitPeriodRow {
  review_id: string;
  sit_start_date: string | null;
  sit_end_date: string | null;
}

/** Pose sit_start_date et sit_end_date sur chaque avis à partir d'une lecture groupée. */
export function attachSitPeriods<T extends { id: string }>(
  reviews: readonly T[],
  rows: readonly ReviewSitPeriodRow[] | null | undefined,
): (T & { sit_start_date: string | null; sit_end_date: string | null })[] {
  const byId = new Map<string, ReviewSitPeriodRow>();
  for (const row of rows ?? []) if (row?.review_id) byId.set(row.review_id, row);
  return reviews.map((r) => {
    const row = byId.get(r.id);
    const own = r as T & { sit_start_date?: string | null; sit_end_date?: string | null };
    return {
      ...r,
      sit_start_date: row?.sit_start_date ?? own.sit_start_date ?? null,
      sit_end_date: row?.sit_end_date ?? own.sit_end_date ?? null,
    };
  });
}
