/**
 * Lot E18 (25/10/2026) : jours proposés dans la fenêtre « Je peux »
 * (« Quand êtes-vous libre ? », facultatif). Les jours du besoin encore à
 * venir, quatre au plus ; la personne peut aussi choisir un autre jour.
 * La valeur est une date AAAA-MM-JJ, enregistrée dans
 * small_mission_responses.exchange_date (colonne date existante).
 */
export interface CanHelpDayOption {
  value: string;
  label: string;
}

export const CAN_HELP_DAYS_MAX = 4;

const isoDay = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseDay = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function dayChipLabel(d: Date): string {
  const label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function canHelpDayOptions(
  dateNeeded: string | null | undefined,
  endDate: string | null | undefined,
  now: Date = new Date(),
): CanHelpDayOption[] {
  const start = parseDay(dateNeeded) ?? parseDay(endDate);
  if (!start) return [];
  const end = parseDay(endDate) ?? start;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const options: CanHelpDayOption[] = [];
  for (let d = new Date(start); d.getTime() <= end.getTime() && options.length < CAN_HELP_DAYS_MAX; d.setDate(d.getDate() + 1)) {
    if (d.getTime() < today.getTime()) continue;
    options.push({ value: isoDay(d), label: dayChipLabel(d) });
  }
  return options;
}
