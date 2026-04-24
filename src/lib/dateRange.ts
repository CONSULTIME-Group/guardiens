import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Formate une période avec dates pleines + durée en jours.
 * Exemples :
 *  - "21 juin → 5 juillet 2026 · 15 jours"
 *  - "21 juin 2026 (1 jour)"
 */
export function formatSitPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  options?: { withDuration?: boolean }
): string | null {
  if (!start) return null;
  const startDate = new Date(start);
  if (isNaN(startDate.getTime())) return null;

  const sameYear = end
    ? new Date(end).getFullYear() === startDate.getFullYear()
    : true;

  const startStr = format(startDate, sameYear ? "d MMM" : "d MMM yyyy", {
    locale: fr,
  });

  if (!end) {
    return `À partir du ${format(startDate, "d MMM yyyy", { locale: fr })}`;
  }

  const endDate = new Date(end);
  if (isNaN(endDate.getTime())) return startStr;

  const endStr = format(endDate, "d MMM yyyy", { locale: fr });
  const days = differenceInCalendarDays(endDate, startDate) + 1;

  if (options?.withDuration === false) {
    return `${startStr} → ${endStr}`;
  }

  return `${startStr} → ${endStr} · ${days} jour${days > 1 ? "s" : ""}`;
}
