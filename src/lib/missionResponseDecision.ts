/**
 * Lot Z : chemin unique pour retenir ou décliner une proposition d'aide
 * depuis la messagerie (bandeau « Choisir », boutons « Accepter l'échange »
 * et « Décliner » de l'en-tête de conversation).
 *
 * - Retenir : RPC accept_mission_response (réponse acceptée, besoin en cours,
 *   autres propositions déclinées sauf pour un projet participatif,
 *   conversation et message système), puis notify-mission-event
 *   (mission_accepted pour la personne retenue, mission_declined pour les
 *   personnes écartées par la cascade).
 * - Décliner : la politique « Mission owner can update response status »
 *   autorise l'auteur à passer une proposition pending en declined, puis
 *   notify-mission-event (mission_declined).
 *
 * Le navigateur n'écrit jamais de notification pour une autre personne :
 * la RLS de notifications (auth.uid() = user_id) la refuserait sans bruit.
 * La fonction edge crée la notification, l'email et le push.
 */
import { supabase } from "@/integrations/supabase/client";

export interface MissionDecisionInput {
  responseId: string;
  missionId: string;
  actorId: string;
  responderId: string;
}

export type MissionDecisionResult =
  | { ok: true; conversationId: string | null; declinedIds: string[] }
  | { ok: false; reason: "not_pending" | "error"; message?: string };

const notify = (body: {
  event_type: "mission_accepted" | "mission_declined";
  mission_id: string;
  actor_id: string;
  target_ids: string[];
  metadata?: Record<string, unknown>;
}) => {
  supabase.functions.invoke("notify-mission-event", { body }).catch(() => {});
};

/** Les identifiants écartés renvoyés par accept_mission_response. */
export function declinedIdsFrom(result: unknown): string[] {
  const ids = (result as { declined_responder_ids?: unknown } | null)?.declined_responder_ids;
  return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
}

export async function chooseMissionResponse(
  input: MissionDecisionInput & { declineOthers: boolean },
): Promise<MissionDecisionResult> {
  const { data, error } = await supabase.rpc("accept_mission_response", {
    p_response_id: input.responseId,
    p_decline_others: input.declineOthers,
  });
  if (error) {
    return { ok: false, reason: /response_not_pending/.test(error.message ?? "") ? "not_pending" : "error", message: error.message };
  }
  const conversationId: string | null = ((data ?? {}) as { conversation_id?: string | null }).conversation_id ?? null;
  const declinedIds = declinedIdsFrom(data);
  notify({
    event_type: "mission_accepted",
    mission_id: input.missionId,
    actor_id: input.actorId,
    target_ids: [input.responderId],
    metadata: { conversation_id: conversationId },
  });
  if (declinedIds.length > 0) {
    notify({
      event_type: "mission_declined",
      mission_id: input.missionId,
      actor_id: input.actorId,
      target_ids: declinedIds,
    });
  }
  return { ok: true, conversationId, declinedIds };
}

export async function declineMissionResponse(input: MissionDecisionInput): Promise<MissionDecisionResult> {
  const { data, error } = await supabase
    .from("small_mission_responses")
    .update({ status: "declined" as any })
    .eq("id", input.responseId)
    .eq("status", "pending" as any)
    .select("id");
  if (error) return { ok: false, reason: "error", message: error.message };
  if (!data || data.length === 0) return { ok: false, reason: "not_pending" };
  notify({
    event_type: "mission_declined",
    mission_id: input.missionId,
    actor_id: input.actorId,
    target_ids: [input.responderId],
  });
  return { ok: true, conversationId: null, declinedIds: [input.responderId] };
}
