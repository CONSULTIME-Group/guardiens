/**
 * Lot ANN-1 (16/11/2026, maquette validée par Jérémie) : la page Annonces de
 * l'admin dit, pour chaque annonce en ligne, ce qui se passe en une phrase et
 * quel geste elle attend, puis la range par urgence.
 *
 * Seuils retenus : candidats en attente depuis plus de 7 jours, départ sous
 * 14 jours. « Sans candidature » reprend la règle partagée isListingToStaff
 * (48 heures en ligne), « commencée » celle d'isListingStartedWaiting.
 */
import { calendarDate } from "@/lib/calendarDate";
import { isListingToStaff } from "./listingToStaff";
import { isListingStartedWaiting } from "./listingStartedWaiting";

export const WAITING_LONG_DAYS = 7;
export const DEPARTURE_SOON_DAYS = 14;

export type UrgencyKey = "started" | "departure_soon" | "waiting_long" | "no_application" | "ok";
export type UrgencyGesture = "write_owner" | "broadcast" | "none";
export type UrgencyTone = "urgent" | "late" | "normal" | "good";

export interface UrgencyInput {
  status?: string | null;
  published_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  /** Candidatures actives (hors refusées et annulées), comme la règle « sans candidature ». */
  activeApplications: number | null | undefined;
  /** Candidatures qui attendent une réponse : envoyée, vue, en discussion. */
  waiting: number | null | undefined;
  oldestWaitingAt?: string | null;
}

export interface Urgency {
  key: UrgencyKey;
  phrase: string;
  /** Repère court affiché à droite de la phrase. */
  chip: string;
  tone: UrgencyTone;
  gesture: UrgencyGesture;
  /** Plus petit = plus urgent ; à rang égal, le départ le plus proche d'abord. */
  rank: number;
  daysToStart: number | null;
  waitingDays: number | null;
}

const DAY = 86_400_000;
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Jours calendaires entre aujourd'hui et la date (négatif si passée). */
export function daysUntil(day: string, now: Date = new Date()): number {
  const d = calendarDate(day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / DAY);
}

const daysSince = (iso: string, now: Date) => Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / DAY));
const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);
const dayWord = (n: number) => `${n} ${plural(n, "jour", "jours")}`;
const frDay = (day: string) => {
  const d = calendarDate(day);
  return `${d.getDate() === 1 ? "1er" : d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const departure = (n: number) => (n === 0 ? "départ aujourd'hui" : n === 1 ? "départ demain" : `départ dans ${dayWord(n)}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const waitingPhrase = (n: number, days: number) =>
  `${n} ${plural(n, "candidat attend", "candidats attendent")} ${days === 0 ? "depuis aujourd'hui" : `depuis ${dayWord(days)}`}`;

/** Phrase, geste et rang d'une annonce. Les annonces hors ligne n'ont pas d'urgence. */
export function listingUrgency(l: UrgencyInput, now: Date = new Date()): Urgency | null {
  if (l.status !== "published") return null;
  const waiting = Math.max(0, Number(l.waiting) || 0);
  const waitingDays = waiting > 0 && l.oldestWaitingAt ? daysSince(l.oldestWaitingAt, now) : null;
  const toStart = l.start_date ? daysUntil(l.start_date, now) : null;
  const base = { daysToStart: toStart, waitingDays };

  if (isListingStartedWaiting({ ...l, activeApplications: waiting }, now) && l.start_date) {
    return {
      ...base, key: "started", rank: 0, tone: "urgent", gesture: "write_owner", chip: "Garde commencée",
      phrase: `Garde commencée le ${frDay(l.start_date)}, ${waitingPhrase(waiting, waitingDays ?? 0)}`,
    };
  }
  if (toStart !== null && toStart >= 0 && toStart <= DEPARTURE_SOON_DAYS) {
    if (waiting === 0 && (Number(l.activeApplications) || 0) === 0) {
      return { ...base, key: "departure_soon", rank: 1, tone: "urgent", gesture: "broadcast", chip: cap(departure(toStart)), phrase: `${cap(departure(toStart))}, aucune candidature` };
    }
    if (waiting > 0) {
      return { ...base, key: "departure_soon", rank: 1, tone: "urgent", gesture: "write_owner", chip: cap(departure(toStart)), phrase: `${waitingPhrase(waiting, waitingDays ?? 0)}, ${departure(toStart)}` };
    }
  }
  if (waiting > 0 && (waitingDays ?? 0) > WAITING_LONG_DAYS && (toStart === null || toStart >= 0)) {
    return { ...base, key: "waiting_long", rank: 2, tone: "late", gesture: "write_owner", chip: `Attente de ${dayWord(waitingDays ?? 0)}`, phrase: waitingPhrase(waiting, waitingDays ?? 0) };
  }
  if (isListingToStaff(l, now)) {
    const online = l.published_at ? daysSince(l.published_at, now) : 0;
    return { ...base, key: "no_application", rank: 3, tone: "late", gesture: "broadcast", chip: toStart !== null ? cap(departure(toStart)) : "Sans candidature", phrase: `Aucune candidature après ${dayWord(online)} en ligne` };
  }
  const phrase = waiting > 0
    ? `${waiting} ${plural(waiting, "candidature", "candidatures")} en cours, la plus ancienne ${waitingDays ? `il y a ${dayWord(waitingDays)}` : "aujourd'hui"}`
    : (Number(l.activeApplications) || 0) > 0
      ? "Gardien en cours de confirmation"
      : "Publiée récemment, premières candidatures à venir";
  return { ...base, key: "ok", rank: 4, tone: "good", gesture: "none", chip: toStart !== null && toStart >= 0 ? cap(departure(toStart)) : "", phrase };
}

/** Tri par urgence : rang, puis départ le plus proche, puis attente la plus longue. */
export function compareUrgency(a: Urgency | null, b: Urgency | null): number {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  if (a.rank !== b.rank) return a.rank - b.rank;
  const da = a.daysToStart ?? 9999, db = b.daysToStart ?? 9999;
  if (da !== db) return da - db;
  return (b.waitingDays ?? 0) - (a.waitingDays ?? 0);
}

/** Filtres par compteur, en tête de la page. */
export const URGENCY_COUNTERS = [
  { filter: "published", label: "Toutes les annonces en ligne, les plus urgentes d'abord" },
  { filter: "waiting_long", label: `Candidats en attente depuis plus de ${WAITING_LONG_DAYS} jours` },
  { filter: "departure_soon", label: `Départ sous ${DEPARTURE_SOON_DAYS} jours, gardien à confirmer` },
  { filter: "to_staff", label: "Aucune candidature après 48 heures" },
  { filter: "started_waiting", label: "Garde commencée, annonce encore en ligne" },
] as const;

/** Une annonce compte-t-elle dans le compteur ? Mêmes règles que les phrases. */
export function matchesCounter(filter: string, u: Urgency | null, input: UrgencyInput, now: Date = new Date()): boolean {
  if (!u) return false;
  switch (filter) {
    case "published": return true;
    case "waiting_long": return (Number(input.waiting) || 0) > 0 && (u.waitingDays ?? 0) > WAITING_LONG_DAYS && (u.daysToStart === null || u.daysToStart >= 0);
    case "departure_soon": return u.key === "departure_soon";
    case "to_staff": return isListingToStaff(input, now);
    case "started_waiting": return u.key === "started";
    default: return false;
  }
}
