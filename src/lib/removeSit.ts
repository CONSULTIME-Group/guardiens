/**
 * Lot SUPPR1 (29/10/2026, retour de Laurence : « supprimer mon annonce, je
 * n'ai pas pu trouver l'option ») : un seul geste « Supprimer l'annonce »,
 * dont l'effet dépend de l'état réel de l'annonce (décision de Jérémie du
 * 29/10/2026) :
 *  - aucune candidature : suppression réelle ;
 *  - des candidatures, aucun gardien retenu : l'annonce est retirée (statut
 *    cancelled, motif `deleted_by_owner`, jamais servie au public ni listée
 *    chez le propriétaire), chaque candidat ouvert est prévenu par le chemin du
 *    déclin groupé (message dans la conversation et email) ;
 *  - gardien confirmé : on annule d'abord la garde, pour que le gardien soit
 *    prévenu ;
 *  - garde en cours, terminée ou archivée : historique et avis conservés, pas
 *    de bouton.
 *
 * Le retrait n'écrit jamais `cancelled_by` : ni compteur d'annulations du
 * propriétaire, ni notification « Garde annulée » (triggers notify_sit_cancelled
 * et trigger_update_cancellations, conditionnés à cancelled_by).
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import {
  OPEN_APPLICATION_STATUSES,
  declineOpenApplications,
  type OpenApplication,
} from "@/lib/declineOpenApplications";

export const DELETED_BY_OWNER_REASON = "deleted_by_owner";

export type RemovalPlan = "delete" | "withdraw" | "cancel_first";

/** Statuts où le bouton n'apparaît pas : l'historique de la garde reste. */
const KEEP_HISTORY = new Set(["completed", "archived", "in_progress"]);
const CONFIRMED = new Set(["confirmed"]);

export function canShowRemoveSit(status: string | null | undefined): boolean {
  return !!status && !KEEP_HISTORY.has(status);
}

/** Décision pure, testée isolément. */
export function removalPlan(input: {
  status: string | null | undefined;
  applicationCount: number;
  hasAccepted: boolean;
}): RemovalPlan | null {
  const status = input.status || "";
  if (!canShowRemoveSit(status)) return null;
  if (CONFIRMED.has(status) || input.hasAccepted) return "cancel_first";
  return input.applicationCount > 0 ? "withdraw" : "delete";
}

/** Annonce retirée par son propriétaire : absente de ses listes. */
export function isDeletedByOwner(s: { status?: string | null; cancellation_reason?: string | null }): boolean {
  return s.status === "cancelled" && s.cancellation_reason === DELETED_BY_OWNER_REASON;
}

export interface SitApplicationsSnapshot {
  total: number;
  hasAccepted: boolean;
  open: OpenApplication[];
}

/** Lecture fraîche des candidatures, juste avant de décider. */
export async function loadSitApplications(sitId: string): Promise<SitApplicationsSnapshot> {
  const { data, error } = await supabase
    .from("applications")
    .select("id, sitter_id, status, created_at")
    .eq("sit_id", sitId);
  if (error) throw error;
  const rows = (data || []) as { id: string; sitter_id: string; status: string; created_at: string }[];
  const openStatuses = new Set<string>(OPEN_APPLICATION_STATUSES);
  return {
    total: rows.length,
    hasAccepted: rows.some((r) => r.status === "accepted"),
    open: rows
      .filter((r) => openStatuses.has(r.status))
      .map((r) => ({ id: r.id, sitter_id: r.sitter_id, created_at: r.created_at, status: r.status, first_name: "" })),
  };
}

export type RemoveSitOutcome =
  | { kind: "deleted" }
  | { kind: "withdrawn"; notified: number; failed: number }
  | { kind: "cancel_first" };

/**
 * Exécute le geste. Relit les candidatures au dernier moment : une
 * candidature arrivée entre l'ouverture de la fenêtre et le clic fait passer
 * de la suppression au retrait, jamais l'inverse.
 */
export async function removeSit(params: {
  sitId: string;
  sitTitle: string;
  status: string;
  ownerId: string;
}): Promise<RemoveSitOutcome> {
  const { sitId, sitTitle, status, ownerId } = params;
  const apps = await loadSitApplications(sitId);
  const plan = removalPlan({ status, applicationCount: apps.total, hasAccepted: apps.hasAccepted });
  if (plan === null) throw new Error("REMOVE_NOT_ALLOWED");
  if (plan === "cancel_first") return { kind: "cancel_first" };

  if (plan === "delete") {
    const { data, error } = await supabase
      .from("sits")
      .delete()
      .eq("id", sitId)
      .eq("user_id", ownerId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("SIT_NOT_FOUND");
    return { kind: "deleted" };
  }

  // Retrait : prévenir d'abord, retirer ensuite (même ordre que la dépublication).
  const result = apps.open.length > 0
    ? await declineOpenApplications({ applications: apps.open, sitId, sitTitle, ownerId })
    : { declined: 0, failed: 0, skipped: 0 };

  const { data, error } = await supabase
    .from("sits")
    .update({
      status: "cancelled",
      cancellation_reason: DELETED_BY_OWNER_REASON,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", sitId)
    .eq("user_id", ownerId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("SIT_NOT_FOUND");
  if (result.failed > 0) logger.warn("[removeSit] declines failed", { sitId, failed: result.failed });
  return { kind: "withdrawn", notified: result.declined, failed: result.failed };
}
