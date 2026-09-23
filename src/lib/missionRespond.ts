/**
 * Réponse « Je peux » à un besoin d'entraide, fonction partagée.
 *
 * Extraite de la page détail (`SmallMissionDetail`) pour que la liste du hub
 * Entraide emprunte exactement le même chemin : même relecture d'état, mêmes
 * contrôles, mêmes erreurs métier. Les toasts, la mesure et l'affichage
 * restent à la charge de chaque surface appelante.
 */
import { supabase } from "@/integrations/supabase/client";

export const MIN_MISSION_MESSAGE_LEN = 10;
export const MAX_MISSION_MESSAGE_LEN = 500;
/** Message posé par le bouton « Je peux », identique sur toutes les surfaces. */
export const QUICK_CAN_HELP_MESSAGE = "Je peux vous aider.";

export type MissionRespondOutcome =
  | { kind: "empty" }
  | { kind: "too_short"; min: number }
  | { kind: "missing" }
  | { kind: "closed" }
  | { kind: "own_mission" }
  | { kind: "duplicate" }
  | { kind: "account_not_active" }
  | { kind: "cap_reached" }
  | { kind: "failed"; message: string }
  | { kind: "sent"; inserted: Record<string, unknown> | null };

export const respondToMission = async ({ missionId, userId, message }: {
  missionId: string;
  userId: string;
  message: string;
}): Promise<MissionRespondOutcome> => {
  const msg = (message ?? "").trim();
  if (!msg) return { kind: "empty" };
  if (msg.length < MIN_MISSION_MESSAGE_LEN) return { kind: "too_short", min: MIN_MISSION_MESSAGE_LEN };

  try {
    const { data: fresh } = await supabase
      .from("small_missions")
      .select("status, user_id, title")
      .eq("id", missionId)
      .single();
    if (!fresh) return { kind: "missing" };
    if (fresh.status !== "open") return { kind: "closed" };
    if (fresh.user_id === userId) return { kind: "own_mission" };

    const { data: inserted, error } = await supabase
      .from("small_mission_responses")
      .insert({ mission_id: missionId, responder_id: userId, message: msg })
      .select("*")
      .single();

    if (error) {
      const hint = (error as { hint?: string }).hint || "";
      const text = String(error.message || "");
      if (error.code === "23505") return { kind: "duplicate" };
      if (hint === "account_not_active" || text.includes("account_not_active")) return { kind: "account_not_active" };
      if (hint === "mission_response_cap_reached" || text.includes("mission_response_cap_reached")) return { kind: "cap_reached" };
      return { kind: "failed", message: text || "Impossible d'envoyer votre réponse." };
    }

    return { kind: "sent", inserted: (inserted as Record<string, unknown>) ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Impossible d'envoyer votre réponse.";
    return { kind: "failed", message };
  }
};
