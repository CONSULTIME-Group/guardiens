/**
 * Lot A10 : libellés français des changements de statut d'annonce dans
 * l'activité récente. Une confirmation ou une expiration n'est pas une
 * dépublication.
 */
export type StatusActivityKind = "publication" | "confirmation" | "expiration" | "brouillon" | "depublication";

export interface StatusActivity {
  kind: StatusActivityKind;
  /** Verbe au passé composé, sujet = propriétaire. */
  verb: string;
}

export const SIT_STATUS_FR: Record<string, string> = {
  draft: "brouillon",
  published: "publiée",
  confirmed: "confirmée",
  in_progress: "en cours",
  completed: "terminée",
  cancelled: "annulée",
  archived: "archivée",
  expired: "expirée",
};

export function statusChangeActivity(oldStatus: string | null, newStatus: string): StatusActivity | null {
  if (newStatus === "published") return { kind: "publication", verb: "a publié" };
  if (oldStatus !== "published") return null;
  if (newStatus === "confirmed") return { kind: "confirmation", verb: "a confirmé la garde" };
  if (newStatus === "expired") return { kind: "expiration", verb: "a vu expirer l'annonce" };
  if (newStatus === "draft") return { kind: "brouillon", verb: "a remis en brouillon" };
  return { kind: "depublication", verb: `a retiré l'annonce (${SIT_STATUS_FR[newStatus] ?? "autre statut"})` };
}
