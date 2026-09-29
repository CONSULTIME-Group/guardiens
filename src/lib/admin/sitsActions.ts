// Lot A9 : règles des actions admin sur les gardes après acceptation.

/** Statuts d'après acceptation proposés par le filtre de la page Gardes. */
export const POST_ACCEPTANCE_STATUSES = ["confirmed", "in_progress", "completed", "cancelled"] as const;

/** Garde active : confirmée ou en cours. */
export function isActiveGarde(status: string | null | undefined): boolean {
  return status === "confirmed" || status === "in_progress";
}

/** Garde active dont la date de fin est passée. */
export function isOverdueGarde(sit: { status?: string | null; end_date?: string | null }, now = new Date()): boolean {
  if (!isActiveGarde(sit.status) || !sit.end_date) return false;
  return new Date(sit.end_date).getTime() < now.getTime();
}

export const canForceEnd = (sit: { status?: string | null; end_date?: string | null }, now = new Date()) => isOverdueGarde(sit, now);
export const canCancelGarde = (sit: { status?: string | null }) => isActiveGarde(sit.status);

/** Annulations des 7 derniers jours, lues sur cancelled_at. */
export function countCancelledThisWeek(sits: { status?: string | null; cancelled_at?: string | null }[], now = new Date()): number {
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  return sits.filter((s) => s.status === "cancelled" && s.cancelled_at && new Date(s.cancelled_at).getTime() >= weekAgo).length;
}

export function cancelGardeUpdate(adminId: string, reason: string, now: string) {
  return { status: "cancelled", cancellation_reason: reason.trim(), cancelled_at: now, cancelled_by: adminId };
}

export function cancelRecipientsLabel(hasSitter: boolean): string {
  return hasSitter
    ? "Le propriétaire et le gardien confirmé reçoivent chacun une notification avec le motif."
    : "Le propriétaire reçoit une notification avec le motif.";
}

export function reviewReceivedLabel(side: "owner" | "sitter", received: boolean): string {
  const who = side === "owner" ? "du propriétaire" : "du gardien";
  return received ? `Avis ${who} reçu` : `Avis ${who} en attente`;
}
