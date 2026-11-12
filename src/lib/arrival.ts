/**
 * Lot 1, parcours d'arrivée v2 : logique pure partagée par les écrans
 * C1 à C4 et P1 à P4. Aucune lecture réseau ici, tout est testable.
 */
import { finishUrl, type DeparturePeriod } from "../../supabase/functions/_shared/owner-departure-logic.ts";
import { PRESENCE_EXPECTED_OPTIONS, PRESENCE_EXPECTED_LABELS } from "./profileMatchingOptions";

export type ArrivalStep = "C1" | "C2" | "C3" | "C4" | "P1" | "P2" | "P3" | "P4" | "G1" | "G2" | "G3" | "G4" | "G5" | "N1" | "E1";

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
export const ARRIVAL_PRESENCE_OPTIONS: { value: string; label: string }[] = PRESENCE_EXPECTED_OPTIONS.map(
  (value) => ({ value, label: PRESENCE_EXPECTED_LABELS[value] }),
);

export const ARRIVAL_MAIN_LANGUAGES = ["Français", "Anglais", "Espagnol"];

// ── C4 : ordre des usages ────────────────────────────────────────────────
export type WelcomeUse = "gardes" | "entraide" | "projets";
export const welcomeUsesOrder = (entraideFirst: boolean): WelcomeUse[] =>
  entraideFirst ? ["entraide", "gardes", "projets"] : ["gardes", "entraide", "projets"];

/** P1 sautée si prénom, commune et logement existent déjà. */
export const canSkipP1 = (o: { firstName?: string | null; city?: string | null; hasProperty: boolean }) =>
  (o.firstName ?? "").trim().length >= 2 && (o.city ?? "").trim().length > 0 && o.hasProperty;

// ── Lot 2 : parcours gardien, entraide, application ──────────────────────
export type ArrivalIntent = "owner" | "sitter" | "entraide";
export type ArrivalFlow = "owner" | "sitter" | "entraide";

/**
 * Intention écrite en C4 : entraide si choisie en C1, sinon le rôle.
 * Lot INS1 étape 1 (12/11/2026) : un double rôle suit le parcours
 * propriétaire d'abord (priorité aux annonces de garde), l'autre parcours lui
 * est proposé ensuite. Avant, il partait sans intention droit vers /sits/create.
 */
export function arrivalIntentFor(role: string | null | undefined, entraide: boolean): ArrivalIntent | null {
  if (entraide) return "entraide";
  return role === "owner" || role === "both" ? "owner" : role === "sitter" ? "sitter" : null;
}

const DEFAULT_NEXTS = ["/dashboard", "/sits/create?source=signup", "/"];
/** Vrai si `next` est une redirection d'origine (ex. /annonces/<id>), pas une destination par défaut. */
export function isExplicitNext(next: string | null | undefined): boolean {
  if (!next) return false;
  return !DEFAULT_NEXTS.includes(next) && !/^\/(bienvenue|arrivee|onboarding)(\/|\?|$)/.test(next);
}

/** Paramètres transportés d'un écran à l'autre. */
export interface ArrivalCarry { flow: ArrivalFlow; next?: string | null; sit?: string | null; aide?: boolean }
export function arrivalUrl(path: string, c: ArrivalCarry): string {
  const q = new URLSearchParams({ flow: c.flow });
  if (c.next) q.set("next", c.next);
  if (c.sit) q.set("sit", c.sit);
  if (c.aide) q.set("aide", "1");
  return `${path}?${q.toString()}`;
}
export function readCarry(p: URLSearchParams, fallbackFlow: ArrivalFlow = "sitter"): ArrivalCarry {
  const f = p.get("flow");
  const flow: ArrivalFlow = f === "owner" || f === "entraide" || f === "sitter" ? f : fallbackFlow;
  const rawNext = p.get("next");
  return { flow, next: rawNext ? safeNext(rawNext) : null, sit: p.get("sit"), aide: p.get("aide") === "1" };
}

/** C4 « Faisons connaissance » : destination selon l'intention. */
export function afterWelcome(intent: ArrivalIntent | null, next: string): string {
  if (!intent) return next;
  if (intent === "owner") return `/arrivee/vous?next=${encodeURIComponent(next)}`;
  return arrivalUrl("/arrivee/vous", { flow: intent, next: isExplicitNext(next) ? next : null });
}

/** G1 sautée si prénom et commune existent déjà. */
export const canSkipG1 = (o: { firstName?: string | null; city?: string | null }) =>
  (o.firstName ?? "").trim().length >= 2 && (o.city ?? "").trim().length > 0;

/** Après G1 : G2 pour un gardien, redirection d'origine ou E1 pour l'entraide. */
export function afterG1(c: ArrivalCarry): string {
  if (c.flow === "entraide") return c.next ?? "/arrivee/entraide";
  return arrivalUrl("/arrivee/garder", c);
}
/** Après G3 : redirection d'origine pour un gardien, G4 sinon ; propriétaire : G4 si coup de main, sinon N1. */
export function afterG3(c: ArrivalCarry): string {
  if (c.flow === "owner") return c.aide ? arrivalUrl("/arrivee/savoir-faire", c) : arrivalUrl("/arrivee/application", c);
  if (c.next) return c.next;
  return arrivalUrl("/arrivee/savoir-faire", c);
}
export const afterG4 = (c: ArrivalCarry) => arrivalUrl("/arrivee/application", c);
/** Après N1 : premier pas pour un gardien, l'annonce ou le tableau de bord pour un propriétaire. */
export function afterN1(c: ArrivalCarry): string {
  if (c.flow === "owner") return c.sit ? `/sits/${c.sit}` : "/dashboard";
  if (c.flow === "entraide") return c.next ?? "/arrivee/entraide";
  return c.next ?? "/arrivee/premier-pas";
}

/** P4 du lot 1 : « Garder » vers G2 puis G3, « Coup de main » vers G4. */
export function alsoNextSteps(o: { garder: boolean; coupDeMain: boolean; sit: string | null }): string {
  const c: ArrivalCarry = { flow: "owner", sit: o.sit, aide: o.coupDeMain };
  if (o.garder) return arrivalUrl("/arrivee/garder", c);
  return arrivalUrl("/arrivee/savoir-faire", c);
}

// ── G2 ───────────────────────────────────────────────────────────────────
export const ARRIVAL_ANIMALS = ["Tous", "Chiens", "Chats", "Chevaux", "Oiseaux", "Animaux de ferme", "NAC"];
/** « Tous » coche l'ensemble ; décocher une espèce retire « Tous ». */
export function toggleAnimals(current: string[], next: string[]): string[] {
  const addedAll = next.includes("Tous") && !current.includes("Tous");
  const removedAll = !next.includes("Tous") && current.includes("Tous");
  if (addedAll) return [...ARRIVAL_ANIMALS];
  if (removedAll) return [];
  const species = ARRIVAL_ANIMALS.filter((a) => a !== "Tous");
  if (current.includes("Tous") && next.length < current.length) return next.filter((a) => a !== "Tous");
  return species.every((s) => next.includes(s)) ? [...ARRIVAL_ANIMALS] : next;
}
export const ARRIVAL_WORK_OPTIONS: { value: string; label: string }[] = [
  { value: "full_remote", label: "Sur place, en télétravail toute la journée" },
  { value: "partial_remote", label: "En télétravail une partie de la journée" },
  { value: "on_site", label: "Sur place et disponible toute la journée" },
  { value: "out_daytime", label: "Dehors la journée, là le soir et la nuit" },
  { value: "flexible", label: "Je m'adapte au rythme de la maison" },
];
export const ARRIVAL_SITTER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "Solo", label: "Seul·e" },
  { value: "Couple", label: "En couple" },
  { value: "Famille", label: "En famille" },
  { value: "Retraité", label: "À la retraite" },
];
export const ARRIVAL_SITTER_LANGUAGES = ["Français", "Anglais", "Espagnol", "Italien", "Allemand"];

// ── N1 ───────────────────────────────────────────────────────────────────
export const N1_PENDING_KEY = "guardiens_arrival_n1_pending";
export type N1Mode = "skip" | "ios-install" | "activate";
export function n1Mode(o: { support: "supported" | "ios-install" | "unsupported"; subscribed: boolean }): N1Mode {
  if (o.support === "unsupported" || o.subscribed) return "skip";
  return o.support === "ios-install" ? "ios-install" : "activate";
}

// ── G5 ───────────────────────────────────────────────────────────────────
export const FIRST_STEP_RADIUS_KM = 30;
export interface FirstStepSit { id: string; distanceKm: number | null }
/** Trie par distance (sans coordonnée en dernier), n'élimine jamais. */
export function pickFirstSteps<T extends FirstStepSit>(sits: T[], radiusKm = FIRST_STEP_RADIUS_KM) {
  const sorted = [...sits].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  const near = sorted.filter((s) => s.distanceKm != null && s.distanceKm <= radiusKm);
  return { hasNear: near.length > 0, best: near[0] ?? null, nearCount: near.length, total: sits.length, closest: sorted.slice(0, 2) };
}

/** Nombre d'étapes pour atteindre le seuil de candidature (les plus lourdes d'abord). */
export function stepsToReach(score: number, missingPoints: number[], threshold: number): number {
  if (score >= threshold) return 0;
  let s = score;
  let n = 0;
  for (const p of [...missingPoints].sort((a, b) => b - a)) {
    s += p; n++;
    if (s >= threshold) return n;
  }
  return n;
}

// ── G5, entraide (lot G-ENT2, 01/11/2026) ────────────────────────────────
/** Rayon des besoins montrés au premier pas : celui des gardes. */
export const FIRST_STEP_NEEDS_RADIUS_KM = 30;
export const FIRST_STEP_NEEDS_MAX = 3;

/** Catégories de besoin servies par chaque famille de savoir-faire du profil. */
const SKILL_TO_MISSION: Record<string, string[]> = {
  animaux: ["animals"],
  jardin: ["garden"],
  coups_de_main: ["house", "errand", "transport"],
  competences: ["skills", "company"],
};

export function missionCategoriesFor(skillCategories: string[]): Set<string> {
  return new Set(skillCategories.flatMap((k) => SKILL_TO_MISSION[k] ?? []));
}

export interface FirstStepNeed { id: string; distanceKm: number | null; category: string | null }

/**
 * Besoins ouverts dans le rayon : ceux qui correspondent aux choix de la
 * personne d'abord, puis les plus proches. On trie, on n'élimine que la distance.
 */
export function pickNearbyNeeds<T extends FirstStepNeed>(needs: T[], skillCategories: string[],
  radiusKm = FIRST_STEP_NEEDS_RADIUS_KM, max = FIRST_STEP_NEEDS_MAX): T[] {
  const wanted = missionCategoriesFor(skillCategories);
  const match = (n: T) => (n.category && wanted.has(n.category) ? 0 : 1);
  return needs
    .filter((n) => n.distanceKm != null && n.distanceKm <= radiusKm)
    .sort((a, b) => match(a) - match(b) || (a.distanceKm as number) - (b.distanceKm as number))
    .slice(0, max);
}

/** Phrase de proposition écrite d'après les savoir-faire choisis (200 caractères au plus). */
export function helpOfferPhrase(competences: string[], max = 200): string {
  const lead = "Je donne volontiers un coup de main près de chez moi";
  const items: string[] = [];
  for (const c of competences.map((x) => x.trim()).filter(Boolean)) {
    const item = c.charAt(0).toLowerCase() + c.slice(1);
    const next = [...items, item];
    const text = `${lead} : ${next.length > 1 ? `${next.slice(0, -1).join(", ")} et ${next[next.length - 1]}` : next[0]}.`;
    if (text.length > max) break;
    items.push(item);
  }
  if (!items.length) return `${lead}.`;
  const list = items.length > 1 ? `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}` : items[0];
  return `${lead} : ${list}.`;
}
