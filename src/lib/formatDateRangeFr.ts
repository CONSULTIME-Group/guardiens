/**
 * Plages de dates des tableaux de bord, en français, avec l'année.
 *
 * Règle (lot D0, 27/09/2026) : une garde d'août 2027 affichée « 13 août au
 * 30 août » se lit comme passée. L'année figure donc TOUJOURS sur la date de
 * fin, et sur la date de début seulement si elle diffère de celle de fin.
 *   formatDateRangeFr("2026-10-09", "2026-11-01") => "du 9 octobre au 1er novembre 2026"
 *   formatDateRangeFr("2026-12-20", "2027-01-03") => "du 20 décembre 2026 au 3 janvier 2027"
 *
 * Date seule (début ou fin manquant) : « le 9 octobre 2026 ». `today` sert à
 * l'unique cas où l'année peut être omise, une date seule de l'année en
 * cours dans `formatDateFr` (missions d'entraide datées au jour près).
 *
 * Parsing sans fuseau : « AAAA-MM-JJ » est lu tel quel, jamais converti en
 * UTC puis en heure locale (évite le décalage d'un jour).
 */
const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

interface Ymd { y: number; m: number; d: number }

export function parseYmd(value: string | Date | null | undefined): Ymd | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return { y: value.getFullYear(), m: value.getMonth() + 1, d: value.getDate() };
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

const dayLabel = (d: number) => (d === 1 ? "1er" : String(d));
const dm = (x: Ymd) => `${dayLabel(x.d)} ${MONTHS[x.m - 1]}`;
const dmy = (x: Ymd) => `${dm(x)} ${x.y}`;

export function formatDateRangeFr(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  today: Date = new Date(),
): string | null {
  const s = parseYmd(start);
  const e = parseYmd(end);
  if (s && e) {
    // Lot D1 : même mois et même année, « du 13 au 30 août 2027 ».
    if (s.y === e.y && s.m === e.m) return `du ${dayLabel(s.d)} au ${dmy(e)}`;
    return `du ${s.y === e.y ? dm(s) : dmy(s)} au ${dmy(e)}`;
  }
  const one = s ?? e;
  if (!one) return null;
  void today;
  return `le ${dmy(one)}`;
}

/** Date seule : l'année est omise uniquement pour l'année en cours. */
export function formatDateFr(value: string | Date | null | undefined, today: Date = new Date()): string | null {
  const x = parseYmd(value);
  if (!x) return null;
  return x.y === today.getFullYear() ? dm(x) : dmy(x);
}
