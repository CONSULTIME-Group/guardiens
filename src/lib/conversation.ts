/**
 * Helper centralisé pour créer/récupérer une conversation de manière atomique.
 * Utilise la RPC `get_or_create_conversation` (server-side) qui :
 *  - bloque l'auto-discussion (owner = sitter)
 *  - déduplique selon le contexte
 *  - vérifie les permissions (ex: pitch spontané sur owner_pitch)
 *
 * URL standard : `/messages?c=<id>` (les anciens params restent supportés en lecture).
 */

import { supabase } from "@/integrations/supabase/client";
import type { NavigateFunction } from "react-router-dom";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

export type ConversationContext =
  | "sit_application"   // candidature à une annonce de garde (sit_id requis)
  | "sitter_inquiry"    // proprio sonde un gardien (pas d'annonce)
  | "mission_help"      // gardien/voisin se propose sur une mission précise (small_mission_id requis)
  | "helper_inquiry"    // proprio sonde un aidant entraide hors mission précise
  | "owner_pitch";      // gardien démarche un proprio (pitch spontané — bloqué par défaut)

interface StartConversationOptions {
  otherUserId: string;
  context: ConversationContext;
  sitId?: string | null;
  smallMissionId?: string | null;
}

interface StartConversationResult {
  conversationId: string | null;
  error?: string;
}

/**
 * Crée ou récupère une conversation. NE crée PAS de message —
 * c'est l'envoi du premier message qui marquera la conv comme "active".
 */
export async function startConversation(
  opts: StartConversationOptions,
): Promise<StartConversationResult> {
  try {
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      p_other_user_id: opts.otherUserId,
      p_context_type: opts.context,
      p_sit_id: opts.sitId ?? null,
      p_small_mission_id: opts.smallMissionId ?? null,
      p_long_stay_id: null,
    });

    if (error) {
      logger.error("startConversation rpc error", { error: error.message, opts });
      return { conversationId: null, error: error.message };
    }

    return { conversationId: data as string };
  } catch (err: any) {
    logger.error("startConversation exception", { err: String(err), opts });
    return { conversationId: null, error: String(err?.message ?? err) };
  }
}

/**
 * Helper UI : démarre une conversation et navigue vers /messages?c=<id>.
 * Affiche un toast d'erreur en cas de problème (notamment pitch refusé).
 */
export async function startConversationAndNavigate(
  opts: StartConversationOptions,
  navigate: NavigateFunction,
): Promise<string | null> {
  const { conversationId, error } = await startConversation(opts);
  if (!conversationId) {
    if (error?.includes("propositions spontanées")) {
      toast.error("Ce membre ne reçoit pas de propositions spontanées. Consultez plutôt ses annonces.");
    } else if (error?.includes("soi-même")) {
      toast.error("Vous ne pouvez pas vous contacter vous-même.");
    } else {
      toast.error("Impossible d'ouvrir la conversation. Réessayez dans un instant.");
    }
    return null;
  }
  navigate(`/messages?c=${conversationId}`);
  return conversationId;
}

/**
 * Pré-remplit un brouillon de premier message selon le contexte.
 * Sert à réduire la friction du 1er échange.
 */
export function buildFirstMessageDraft(args: {
  context: ConversationContext;
  recipientFirstName?: string | null;
  city?: string | null;
  sitTitle?: string | null;
  sitDates?: string | null;
  missionTitle?: string | null;
  missionDate?: string | null;
}): string {
  const name = args.recipientFirstName?.trim() || "";
  const greet = name ? `Bonjour ${name},` : "Bonjour,";

  switch (args.context) {
    case "sit_application":
      return `${greet}\n\nJe suis intéressé(e) par votre garde${
        args.sitTitle ? ` « ${args.sitTitle} »` : ""
      }${args.sitDates ? ` du ${args.sitDates}` : ""}${
        args.city ? ` à ${args.city}` : ""
      }. Je serais ravi(e) d'échanger avec vous pour vous présenter mon profil.\n\nÀ très vite !`;

    case "sitter_inquiry":
      return `${greet}\n\nJ'aurai prochainement besoin d'un(e) gardien(ne)${
        args.city ? ` à ${args.city}` : ""
      }. Votre profil m'a beaucoup plu — seriez-vous disponible pour en discuter ?\n\nMerci d'avance.`;

    case "mission_help":
      return `${greet}\n\nJe peux vous aider pour${
        args.missionTitle ? ` « ${args.missionTitle} »` : " votre mission d'entraide"
      }${args.missionDate ? ` le ${args.missionDate}` : ""}. N'hésitez pas à me dire comment je peux être utile.`;

    case "helper_inquiry":
      return `${greet}\n\nJ'ai vu que vous étiez disponible pour donner un coup de main${
        args.city ? ` à ${args.city}` : ""
      }. J'aurais peut-être besoin de votre aide bientôt — pourrait-on en discuter ?\n\nMerci !`;

    case "owner_pitch":
      return `${greet}\n\nJe suis gardien(ne)${
        args.city ? ` à ${args.city}` : ""
      } et je vous contacte pour vous proposer mes services pour vos prochaines absences. N'hésitez pas à consulter mon profil.\n\nÀ bientôt !`;
  }
}

/**
 * Décide si un brouillon de premier message doit être pré-rempli.
 *
 * Règles (toutes doivent être vraies) :
 *  1. La conversation n'a AUCUN message non-système (peu importe l'expéditeur).
 *     → si l'autre partie a déjà écrit, on ne colle pas un brouillon par-dessus.
 *  2. Le champ de saisie est vide (trim).
 *     → on n'écrase jamais ce que l'utilisateur tape.
 *
 * Retourne aussi un `reason` pour que l'UI puisse afficher un toast informatif
 * quand aucun brouillon n'est proposé alors que la conversation est déjà entamée.
 */
export type PrefillDecision =
  | { shouldPrefill: true; reason: "empty_conversation_and_input" }
  | { shouldPrefill: false; reason: "conversation_already_started" }
  | { shouldPrefill: false; reason: "input_not_empty" };

export function shouldPrefillDraft(args: {
  messages: ReadonlyArray<{ is_system: boolean }>;
  currentInput: string;
}): PrefillDecision {
  const realMsgs = args.messages.filter(m => !m.is_system);
  const inputIsEmpty = args.currentInput.trim() === "";

  if (realMsgs.length > 0) {
    return { shouldPrefill: false, reason: "conversation_already_started" };
  }
  if (!inputIsEmpty) {
    return { shouldPrefill: false, reason: "input_not_empty" };
  }
  return { shouldPrefill: true, reason: "empty_conversation_and_input" };
}
