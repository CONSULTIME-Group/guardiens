// Plafond et lissage des relances « gardien dormant ».
//
// Constat du 22/09/2026 : 247 envois pour 47 personnes, jusqu'à 9 au même
// membre, pour 0 candidature sur 60 jours. Le cron hebdomadaire renvoyait
// indéfiniment tant que le gardien restait sans candidature.
//
// Lot N2, 23/09/2026 : la règle des jalons J+30 / J+45 / J+75 laissait de côté
// les gardiens inscrits depuis longtemps. Nouvelle règle, plus simple :
//   inscrit depuis 30 jours ou plus, aucune candidature déposée,
//   3 envois au maximum sur la vie du compte,
//   14 jours au moins entre deux envois,
//   comptes administrateurs exclus.
//
// Lissage : 946 gardiens deviennent éligibles d'un coup, juste après la
// campagne Entraide. Les envois démarrent le lundi 5 octobre 2026 et sont
// plafonnés à 150 par passage du cron, les suivants attendent le passage
// d'après. Ce report est un état normal, jamais une erreur.

export const DORMANT_MIN_DAYS_SINCE_SIGNUP = 30;
export const DORMANT_MAX_SENDS = 3;
export const DORMANT_MIN_DAYS_BETWEEN_SENDS = 14;
export const DORMANT_MAX_SENDS_PER_RUN = 150;
/** Premier envoi autorisé : lundi 5 octobre 2026, 00h00 UTC. */
export const DORMANT_START_AT_MS = Date.UTC(2026, 9, 5, 0, 0, 0);

export type DormantSkipReason =
  | "admin_account"
  | "cap_reached"
  | "too_recent_signup"
  | "too_soon_since_last_send"
  | "before_start_date"
  | "run_quota_reached";

export interface DormantDecision {
  send: boolean;
  reason: DormantSkipReason | null;
}

/** Le lissage ouvre-t-il les envois à cet instant ? */
export function dormantWindowOpen(nowMs: number): boolean {
  return nowMs >= DORMANT_START_AT_MS;
}

export function dormantSendDecision(input: {
  daysSinceSignup: number;
  alreadySentCount: number;
  isAdmin: boolean;
  /** Jours écoulés depuis le dernier envoi dormant, null si aucun envoi. */
  daysSinceLastSend?: number | null;
  /** Instant courant, pour la date de démarrage. Défaut : maintenant. */
  nowMs?: number;
}): DormantDecision {
  const now = input.nowMs ?? Date.now();
  if (!dormantWindowOpen(now)) return { send: false, reason: "before_start_date" };
  if (input.isAdmin) return { send: false, reason: "admin_account" };
  if (input.alreadySentCount >= DORMANT_MAX_SENDS) {
    return { send: false, reason: "cap_reached" };
  }
  if (input.daysSinceSignup < DORMANT_MIN_DAYS_SINCE_SIGNUP) {
    return { send: false, reason: "too_recent_signup" };
  }
  const since = input.daysSinceLastSend;
  if (typeof since === "number" && since < DORMANT_MIN_DAYS_BETWEEN_SENDS) {
    return { send: false, reason: "too_soon_since_last_send" };
  }
  return { send: true, reason: null };
}

export interface DormantCandidate {
  /** Distance de l'annonce ouverte la plus proche, null si inconnue. */
  nearestSitKm: number | null;
  /** Dernière visite, ISO. null si inconnue. */
  lastSeenAt: string | null;
}

/**
 * Ordre d'envoi : annonce ouverte la plus proche d'abord, puis gardiens vus le
 * plus récemment. Une distance inconnue passe après les distances connues, une
 * dernière visite inconnue passe après les visites connues.
 */
export function dormantRunOrder<T extends DormantCandidate>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = a.nearestSitKm ?? Number.POSITIVE_INFINITY;
    const db = b.nearestSitKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    const sa = a.lastSeenAt ? Date.parse(a.lastSeenAt) : Number.NEGATIVE_INFINITY;
    const sb = b.lastSeenAt ? Date.parse(b.lastSeenAt) : Number.NEGATIVE_INFINITY;
    return sb - sa;
  });
}

/** Tri puis plafond du passage. Le reste attend le passage suivant. */
export function dormantRunBatch<T extends DormantCandidate>(
  rows: T[],
  limit: number = DORMANT_MAX_SENDS_PER_RUN,
): { batch: T[]; deferred: T[] } {
  const ordered = dormantRunOrder(rows);
  return { batch: ordered.slice(0, limit), deferred: ordered.slice(limit) };
}
