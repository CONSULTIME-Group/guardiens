/**
 * Lot ADM14 (lot 3 du plan de l'arène admin du 09/11/2026) : textes de la vue
 * d'ensemble calculés sur les données, sans liste figée.
 */
import { signalConfig, type SignalFamily } from "../../../supabase/functions/_shared/admin-signal-config.ts";

const FAMILY_WORDS: Record<SignalFamily, string> = {
  candidatures: "candidatures",
  annonces: "annonces",
  emails: "emails",
  editorial: "contenus",
  couverture: "couverture des villes",
  animation: "animation",
  identite: "identité",
  moderation: "modération",
  technique: "rendu et tâches du site",
  accueil: "accueil",
};

/** « emails, annonces » : familles réelles des signaux techniques ouverts, sans doublon, dans l'ordre d'arrivée. */
export function technicalFamiliesText(signals: { signal_type: string }[]): string {
  const words: string[] = [];
  for (const s of signals) {
    const fam = signalConfig(s.signal_type)?.family;
    const w = fam ? FAMILY_WORDS[fam] : "autres";
    if (!words.includes(w)) words.push(w);
  }
  return words.join(", ");
}

/** Lundi à Paris : la synthèse de la semaine ne s'affiche que ce jour-là (lot A V12). */
export function isMondayInParis(now: number = Date.now()): boolean {
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(new Date(now));
  return day === "Mon";
}

/** « 9 nov. à 14 h 05 » : date d'un repérage, sans secondes. */
export function shortDetectedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" }).format(d);
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "";
  const m = parts.find((p) => p.type === "minute")?.value ?? "";
  return `${date} à ${Number(h)} h ${m}`;
}
