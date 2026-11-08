/**
 * Dates du calendrier (lot DATE1, 08/11/2026).
 *
 * Les colonnes `date` de la base (sits.start_date, sits.end_date,
 * small_missions.date_needed, small_missions.end_date, …) sont des jours du
 * calendrier, sans heure. new Date("2026-12-20") les lit à minuit UTC : à
 * l'ouest de Greenwich (Antilles, Guyane, Polynésie, Amériques), le navigateur
 * affichait la veille et les écarts « dans N jours » glissaient d'un jour.
 *
 * Règle : une date du calendrier passe par calendarDate() (minuit local) ou
 * par les écarts en jours ci-dessous, calculés sur le jour, sans heure.
 * Verrou : src/__tests__/date1/.
 */
import { parseYmd } from "./formatDateRangeFr";

const DAY_MS = 86_400_000;

/**
 * Minuit local du jour indiqué. « AAAA-MM-JJ » (ou un horodatage qui commence
 * ainsi) est lu comme un jour du calendrier ; une Date est rendue telle quelle.
 * Une valeur illisible donne une Date invalide, comme new Date().
 */
export function calendarDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** Numéro de jour indépendant du fuseau et des changements d'heure. */
function dayNumber(value: string | Date | null | undefined): number | null {
  const x = parseYmd(value);
  if (!x) return null;
  return Math.round(Date.UTC(x.y, x.m - 1, x.d) / DAY_MS);
}

/** Jours de `from` à `to` (to - from), null si l'une est illisible. */
export function daysBetween(
  from: string | Date | null | undefined,
  to: string | Date | null | undefined,
): number | null {
  const a = dayNumber(from);
  const b = dayNumber(to);
  return a === null || b === null ? null : b - a;
}

/** Jours d'aujourd'hui (calendrier de l'appareil) jusqu'au jour indiqué. */
export function daysFromToday(value: string | Date | null | undefined, now: Date = new Date()): number | null {
  return daysBetween(now, value);
}

/** Le jour indiqué est antérieur à aujourd'hui (calendrier de l'appareil). */
export function isPastDay(value: string | Date | null | undefined, now: Date = new Date()): boolean {
  const n = daysFromToday(value, now);
  return n !== null && n < 0;
}

/** Garde en cours : aujourd'hui (calendrier de l'appareil) est entre le premier et le dernier jour, inclus. */
export function isOngoingDay(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  const s = daysFromToday(start, now);
  const e = daysFromToday(end, now);
  return s !== null && e !== null && s <= 0 && e >= 0;
}

/** Tri croissant de dates du calendrier, les dates absentes en dernier. */
export function compareCalendarDates(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.slice(0, 10) < b.slice(0, 10) ? -1 : a.slice(0, 10) > b.slice(0, 10) ? 1 : 0;
}
