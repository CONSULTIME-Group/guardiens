/**
 * Lot X2 : date d'un besoin publié, règles pures.
 *
 * - La date de référence d'un besoin est la fin de période quand elle existe,
 *   sinon la date souhaitée : même règle que la page Entraide
 *   (EntraideHub, `end_date || date_needed`) et que la clôture automatique
 *   (auto-close-small-missions, end_date puis date_needed).
 * - Une date est « passée » quand son jour calendaire est antérieur à
 *   aujourd'hui : le jour même reste valable.
 * - « Reporter » écrit date_needed (et end_date quand le besoin a une période),
 *   jamais une date antérieure à aujourd'hui ni une fin avant le début.
 */

export type MissionDates = {
  date_needed?: string | null;
  end_date?: string | null;
};

/** Jour calendaire local au format yyyy-MM-dd. */
export function localIsoDay(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const day = (value?: string | null): string | null => {
  if (!value) return null;
  const v = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

/** Date qui décide si un besoin est encore d'actualité. */
export function missionReferenceDate(m: MissionDates | null | undefined): string | null {
  if (!m) return null;
  return day(m.end_date) || day(m.date_needed);
}

/** Vrai quand la période du besoin est terminée (jour antérieur à aujourd'hui). */
export function isMissionDatePassed(m: MissionDates | null | undefined, now: Date = new Date()): boolean {
  const ref = missionReferenceDate(m);
  return ref !== null && ref < localIsoDay(now);
}

/** Nombre de jours entiers entre deux jours yyyy-MM-dd (b moins a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Ajoute n jours à un jour yyyy-MM-dd. */
export function addDaysIso(isoDay: string, n: number): string {
  const [y, m, d] = isoDay.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

/** Vrai quand le besoin a une période (une date de fin) à reporter avec lui. */
export function hasMissionPeriod(m: MissionDates | null | undefined): boolean {
  return Boolean(day(m?.end_date));
}

/**
 * Fin proposée pour un nouveau début : même durée que la période d'origine
 * (fin moins début), ou le nouveau début si le besoin n'avait qu'une fin.
 * Null quand le besoin n'a pas de période.
 */
export function suggestedEndDate(m: MissionDates | null | undefined, newStart: string): string | null {
  const start = day(newStart);
  const end = day(m?.end_date);
  if (!start || !end) return null;
  const from = day(m?.date_needed);
  const span = from ? Math.max(0, daysBetween(from, end)) : 0;
  return addDaysIso(start, span);
}

export type ReschedulePatch = { date_needed: string; end_date: string | null };

export type RescheduleResult =
  | { ok: true; patch: ReschedulePatch }
  | { ok: false; reason: "start_missing" | "start_past" | "end_before_start" };

/** Messages affichés sous le champ, phrases simples. */
export const RESCHEDULE_ERRORS: Record<Exclude<RescheduleResult, { ok: true }>["reason"], string> = {
  start_missing: "Choisissez la nouvelle date.",
  start_past: "Choisissez une date à partir d'aujourd'hui.",
  end_before_start: "La fin de période se place le jour de la nouvelle date ou après.",
};

/**
 * Valide la saisie et construit la mise à jour de small_missions.
 * Un besoin sans période garde end_date vide ; un besoin avec période reçoit
 * la fin saisie, ou à défaut la fin proposée (même durée).
 */
export function buildReschedulePatch(
  m: MissionDates | null | undefined,
  input: { start: string; end?: string | null },
  now: Date = new Date(),
): RescheduleResult {
  const start = day(input.start);
  if (!start) return { ok: false, reason: "start_missing" };
  if (start < localIsoDay(now)) return { ok: false, reason: "start_past" };
  if (!hasMissionPeriod(m)) return { ok: true, patch: { date_needed: start, end_date: null } };
  const end = day(input.end) || suggestedEndDate(m, start) || start;
  if (end < start) return { ok: false, reason: "end_before_start" };
  return { ok: true, patch: { date_needed: start, end_date: end } };
}
