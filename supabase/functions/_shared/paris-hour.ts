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
