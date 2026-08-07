// Heure de Paris, robuste au changement heure d'été / heure d'hiver.
//
// Piège évité : en locale fr-FR, `format()` avec seulement `hour` renvoie
// "12 h" (suffixe CLDR), ce qui produisait "12 h:00" et ne matchait plus
// aucun `heure_envoi`. `formatToParts` en locale neutre renvoie "12".
export function parisHourSlot(now: Date): string {
  const parisHour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hour12: false,
  })
    .formatToParts(now)
    .find((p) => p.type === "hour")!.value;
  return `${parisHour.padStart(2, "0")}:00`;
}

export function parisDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

// Heure de Paris, en nombre, pour les décisions de passage.
export function parisHourNumber(now: Date): number {
  return Number(parisHourSlot(now).slice(0, 2));
}

// Plage calme, alignée sur QUIET_START_HOUR / QUIET_END_HOUR de email-cap.
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 8;

export function isParisQuietHour(now: Date): boolean {
  const h = parisHourNumber(now);
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

export interface ParisWindowVerdict {
  run: boolean;
  parisHour: number;
  reason?: "quiet_hours" | "outside_target_hour";
}

/**
 * Décide si le passage courant est le bon, sans dépendre de la saison.
 * Le cron est planifié sur une fenêtre d'heures UTC, la fonction ne travaille
 * qu'au passage dont l'heure de Paris correspond à l'heure visée, et jamais
 * pendant la plage calme. Les autres passages sortent sans rien faire, le
 * suivant reprend la main le jour même.
 */
export function parisWindowVerdict(now: Date, targetParisHour: number): ParisWindowVerdict {
  const parisHour = parisHourNumber(now);
  if (isParisQuietHour(now)) return { run: false, parisHour, reason: "quiet_hours" };
  if (parisHour !== targetParisHour) return { run: false, parisHour, reason: "outside_target_hour" };
  return { run: true, parisHour };
}
