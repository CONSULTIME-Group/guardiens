/**
 * Lot E21 (25/10/2026, maquette « grammaire visuelle du besoin ») : règles
 * pures de la fiche d'un besoin.
 * - Titre en Playfair dimensionné sur le titre lui-même, jamais sur la
 *   longueur de la description (avis 17 : un titre de 120 caractères prenait
 *   six lignes et repoussait l'image sous la ligne de flottaison).
 * - Bloc « Quand » : la date du besoin en clair, ou « À convenir ensemble ».
 */
export const NEED_TITLE_LONG = 60;
export const NEED_TITLE_VERY_LONG = 100;

export function needTitleSizeClass(title: string | null | undefined): string {
  const length = (title ?? "").trim().length;
  if (length > NEED_TITLE_VERY_LONG) return "text-[1.5rem] md:text-3xl";
  if (length > NEED_TITLE_LONG) return "text-[1.75rem] md:text-4xl";
  return "text-[2rem] md:text-[2.75rem]";
}

const parseDay = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dayLong = (d: Date) => {
  const s = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const dayShort = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export function needWhenLabel(dateNeeded: string | null | undefined, endDate: string | null | undefined): string {
  const start = parseDay(dateNeeded);
  const end = parseDay(endDate);
  if (start && end && end.getTime() !== start.getTime()) return `Du ${dayShort(start)} au ${dayShort(end)}`;
  if (start) return dayLong(start);
  if (end) return `Jusqu'au ${dayShort(end)}`;
  return "À convenir ensemble";
}
