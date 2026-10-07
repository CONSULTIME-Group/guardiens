/**
 * Lot 1, parcours d'arrivée v2 : logique pure partagée par les écrans
 * C1 à C4 et P1 à P4. Aucune lecture réseau ici, tout est testable.
 */
import { finishUrl, type DeparturePeriod } from "../../supabase/functions/_shared/owner-departure-logic.ts";

export type ArrivalStep = "C1" | "C2" | "C3" | "C4" | "P1" | "P2" | "P3" | "P4";

export { isArrivalV2Account, ARRIVAL_FLAG, arrivalAppliesToNewSignup } from "./arrivalFlag";


export const welcomeTarget = (next: string) => `/bienvenue?next=${encodeURIComponent(next)}`;

/** Destination `next` assainie (chemin interne seulement). */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard"): string {
  return raw && /^\/(?!\/|\\)/.test(raw) ? raw : fallback;
}

// ── C3 : bouton « Ouvrir ma messagerie » ─────────────────────────────────
export interface MailboxProvider { provider: string; label: string; url: string }

export function mailboxFor(email: string): MailboxProvider | null {
  const domain = (email.split("@")[1] ?? "").trim().toLowerCase();
  if (!domain) return null;
  const root = domain.split(".")[0];
  if (domain === "gmail.com" || domain === "googlemail.com") return { provider: "gmail", label: "Ouvrir Gmail", url: "https://mail.google.com" };
  if (["outlook", "hotmail", "live"].includes(root) || domain === "msn.com") return { provider: "outlook", label: "Ouvrir Outlook", url: "https://outlook.live.com/mail" };
  if (root === "yahoo") return { provider: "yahoo", label: "Ouvrir Yahoo Mail", url: "https://mail.yahoo.com" };
  if (domain === "orange.fr" || domain === "wanadoo.fr") return { provider: "orange", label: "Ouvrir ma messagerie Orange", url: "https://mail.orange.fr" };
  if (domain === "free.fr") return { provider: "free", label: "Ouvrir ma messagerie Free", url: "https://zimbra.free.fr" };
  if (domain === "sfr.fr" || domain === "neuf.fr") return { provider: "sfr", label: "Ouvrir ma messagerie SFR", url: "https://webmail.sfr.fr" };
  if (domain === "laposte.net") return { provider: "laposte", label: "Ouvrir ma messagerie La Poste", url: "https://www.laposte.net/accueil" };
  if (domain === "icloud.com" || domain === "me.com") return { provider: "icloud", label: "Ouvrir iCloud Mail", url: "https://www.icloud.com/mail" };
  return null;
}

// ── P2 : périodes de départ ──────────────────────────────────────────────
export type ArrivalPeriod = Exclude<DeparturePeriod, "plus_tard">;

/** Fin de chaque période (dernier jour utile), pour masquer celles déjà passées. */
export const PERIOD_END: Record<ArrivalPeriod, string> = {
  noel: "2027-01-03",
  hiver: "2027-03-08",
  printemps: "2027-05-09",
  ete: "2027-08-31",
};

export const PERIOD_LABEL: Record<ArrivalPeriod, string> = {
  noel: "Noël et jour de l'an",
  hiver: "Vacances d'hiver",
  printemps: "Printemps",
  ete: "Été",
};

/** Les trois prochaines périodes encore à venir, dans l'ordre de l'année. */
export function upcomingPeriods(today: string): ArrivalPeriod[] {
  return (["noel", "hiver", "printemps", "ete"] as ArrivalPeriod[]).filter((p) => PERIOD_END[p] >= today).slice(0, 3);
}

/** Lien de P2 : mêmes valeurs et mêmes dates que finishUrl, plus source=signup. */
export function arrivalCreateUrl(period: DeparturePeriod | null): string {
  if (!period) return "/sits/create?express=1&source=signup";
  return `${finishUrl(period)}&source=signup`;
}

// ── P2 : encart de proximité ─────────────────────────────────────────────
export const PROXIMITY_RADII = [20, 30, 50] as const;

/** 20 km, élargi à 30 puis 50 si moins de 5 gardiens ; null si 0 à 50 km. */
export async function resolveProximity(
  count: (radiusKm: number) => Promise<number>,
): Promise<{ count: number; radius: number } | null> {
  let last = { count: 0, radius: 50 };
  for (const r of PROXIMITY_RADII) {
    const n = await count(r);
    last = { count: n, radius: r };
    if (n >= 5) return last;
  }
  return last.count > 0 ? last : null;
}

// ── P3 : présence attendue ───────────────────────────────────────────────
/** Libellés de la maquette → valeurs existantes de PRESENCE_EXPECTED_OPTIONS. */
export const ARRIVAL_PRESENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "100% sur place", label: "Sur place toute la journée" },
  { value: "Télétravail OK", label: "En télétravail chez vous" },
  { value: "Absences courtes OK", label: "Libre de s'absenter quelques heures" },
];

export const ARRIVAL_MAIN_LANGUAGES = ["Français", "Anglais", "Espagnol"];

// ── C4 : ordre des usages ────────────────────────────────────────────────
export type WelcomeUse = "gardes" | "entraide" | "projets";
export const welcomeUsesOrder = (entraideFirst: boolean): WelcomeUse[] =>
  entraideFirst ? ["entraide", "gardes", "projets"] : ["gardes", "entraide", "projets"];

/** P1 sautée si prénom, commune et logement existent déjà. */
export const canSkipP1 = (o: { firstName?: string | null; city?: string | null; hasProperty: boolean }) =>
  (o.firstName ?? "").trim().length >= 2 && (o.city ?? "").trim().length > 0 && o.hasProperty;

/** Enchaînement P4 : garder d'abord, coup de main ensuite, puis l'annonce. */
export function alsoNextSteps(o: { garder: boolean; coupDeMain: boolean; sitPath: string }): string {
  const after = o.coupDeMain ? `/profile?section=competences` : o.sitPath;
  if (o.garder) return `/onboarding/affinity?redirect=${encodeURIComponent(after)}`;
  return after;
}
