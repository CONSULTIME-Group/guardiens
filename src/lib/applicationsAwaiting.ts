/**
 * Lot X3a (13/10/2026) : candidatures en attente de décision.
 *
 * Constat A-03 de l'audit du 13/10 : l'ouverture de la fiche passe les
 * candidatures pending en viewed, et pastilles, accueil et liste « À faire »
 * ne comptaient que pending. 23 candidatures vues ou en discussion sur
 * 9 annonces publiées affichaient une pastille à 0. Les compteurs suivent
 * désormais toute candidature qui attend une décision (pending, viewed,
 * discussing), « nouvelle » désignant celles jamais ouvertes (pending).
 *
 * Constats A-05 et B-08 : 26 candidatures ouvertes depuis plus de 7 jours.
 * Le propriétaire voit la plus ancienne et son ancienneté, le gardien voit
 * depuis quand il attend et ce qu'il peut faire. Aucun email de plus (lot R1).
 *
 * Logique pure, testée dans src/__tests__/x3a/.
 */

export const AWAITING_DECISION_STATUSES: readonly string[] = ["pending", "viewed", "discussing"];

/** Ancienneté (jours) au-delà de laquelle une candidature est signalée. */
export const STALE_AFTER_DAYS = 7;

/** Annonces dont les candidatures n'attendent plus aucune décision. */
const CLOSED_SIT_STATUSES: readonly string[] = ["expired", "cancelled", "archived", "completed"];

export function isAwaitingDecision(status: string | null | undefined): boolean {
  return AWAITING_DECISION_STATUSES.includes(String(status));
}

/** Jours entiers écoulés depuis une date ISO (0 si absente ou future). */
export function daysSince(iso: string | null | undefined, now: Date = new Date()): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

export interface AwaitingAppInput {
  id: string;
  sit_id: string;
  status: string;
  created_at?: string | null;
}

export interface AwaitingSummary {
  /** Candidatures qui attendent une décision (pending, viewed, discussing). */
  count: number;
  /** Dont jamais ouvertes par le propriétaire (pending). */
  fresh: number;
  /** Dont envoyées depuis plus de STALE_AFTER_DAYS jours. */
  staleCount: number;
  /** La plus ancienne en attente, avec son annonce et son ancienneté. */
  oldest: { appId: string; sitId: string; days: number } | null;
}

export const EMPTY_AWAITING: AwaitingSummary = { count: 0, fresh: 0, staleCount: 0, oldest: null };

/**
 * Résume les candidatures reçues. `sitStatusById` écarte celles d'annonces
 * closes (expirée, annulée, archivée, terminée) ; sans table, aucune n'est
 * écartée.
 */
export function summarizeAwaiting(
  apps: readonly AwaitingAppInput[] | null | undefined,
  sitStatusById?: Record<string, string> | null,
  now: Date = new Date(),
): AwaitingSummary {
  let count = 0;
  let fresh = 0;
  let staleCount = 0;
  let oldest: AwaitingSummary["oldest"] = null;
  let oldestTs = Number.POSITIVE_INFINITY;
  for (const a of apps ?? []) {
    if (!a || !isAwaitingDecision(a.status)) continue;
    if (sitStatusById) {
      const sitStatus = sitStatusById[a.sit_id];
      if (sitStatus && CLOSED_SIT_STATUSES.includes(sitStatus)) continue;
    }
    count++;
    if (a.status === "pending") fresh++;
    const days = daysSince(a.created_at, now);
    if (days >= STALE_AFTER_DAYS) staleCount++;
    const ts = a.created_at ? Date.parse(a.created_at) : Number.NaN;
    const sortTs = Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY;
    if (oldest === null || sortTs < oldestTs) {
      oldestTs = sortTs;
      oldest = { appId: a.id, sitId: a.sit_id, days };
    }
  }
  return { count, fresh, staleCount, oldest };
}

/** Table statut par annonce, à partir des annonces du membre. */
export function sitStatusMap(sits: ReadonlyArray<{ id: string; status: string }> | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of sits ?? []) if (s?.id) map[s.id] = s.status;
  return map;
}

/** Lien vers les candidatures de l'annonce concernée, sinon vers la liste. */
export function awaitingLink(summary: AwaitingSummary): string {
  return summary.oldest ? `/sits/${summary.oldest.sitId}#candidatures` : "/sits";
}

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

/** Phrase d'accueil propriétaire : nombre en attente, nouvelles, la plus ancienne. */
export function awaitingSentence(summary: AwaitingSummary): string | null {
  const { count, fresh, oldest } = summary;
  if (count <= 0) return null;
  let s = `${count} ${plural(count, "candidature attend", "candidatures attendent")} votre réponse`;
  if (fresh > 0 && fresh < count) s += `, dont ${fresh} ${plural(fresh, "nouvelle", "nouvelles")}`;
  s += ".";
  const stale = staleSuffix(oldest?.days ?? 0);
  return stale ? `${s} ${stale}` : s;
}

/** « La plus ancienne attend depuis N jours. » au-delà de 7 jours, sinon null. */
export function staleSuffix(days: number): string | null {
  if (days < STALE_AFTER_DAYS) return null;
  return `La plus ancienne attend depuis ${days} jours.`;
}

/**
 * Côté gardien (B-08) : jours d'attente d'une candidature sans réponse
 * (pending ou viewed) sur une annonce encore publiée, au-delà de 7 jours.
 */
export function sitterWaitingDays(
  appStatus: string | null | undefined,
  sitStatus: string | null | undefined,
  createdAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (appStatus !== "pending" && appStatus !== "viewed") return null;
  if (sitStatus !== "published") return null;
  const days = daysSince(createdAt, now);
  return days >= STALE_AFTER_DAYS ? days : null;
}

/** Note de la carte gardien : depuis quand, et ce qu'il peut faire. */
export function sitterWaitingNote(days: number): string {
  return `En attente de réponse depuis ${days} jours. Vous pouvez écrire au propriétaire ou retirer votre candidature pour en envoyer d'autres.`;
}
