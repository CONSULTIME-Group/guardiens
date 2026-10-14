/**
 * Lot A2 (audit Alma du 14/10/2026) : candidatures en attente de décision,
 * côté fonctions. Copie de la règle X3a de src/lib/applicationsAwaiting.ts
 * (summarizeAwaiting) : pending, viewed et discussing comptent, les
 * candidatures d'une annonce close (expirée, annulée, archivée, terminée)
 * sortent. Les fonctions n'importent jamais src ; l'égalité des deux règles
 * est verrouillée par src/__tests__/a2/.
 */

export const AWAITING_DECISION_STATUSES: readonly string[] = ["pending", "viewed", "discussing"];

const CLOSED_SIT_STATUSES: readonly string[] = ["expired", "cancelled", "archived", "completed"];

export interface AwaitingAppInput {
  id: string;
  sit_id: string;
  status: string;
  created_at?: string | null;
}

export interface AwaitingSummary {
  count: number;
  fresh: number;
  staleCount: number;
  oldest: { appId: string; sitId: string; days: number } | null;
}

const STALE_AFTER_DAYS = 7;

function daysSince(iso: string | null | undefined, now: Date): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

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
    if (!a || !AWAITING_DECISION_STATUSES.includes(String(a.status))) continue;
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

/** Lien vers les candidatures de l'annonce de la plus ancienne, sinon la liste. */
export function awaitingLink(summary: AwaitingSummary): string {
  return summary.oldest ? `/sits/${summary.oldest.sitId}#candidatures` : "/sits";
}
