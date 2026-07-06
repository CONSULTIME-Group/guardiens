/**
 * Alma Pass 4 — Trigger 10 (P0 conversation stagnante).
 *
 * Composant invisible monté dans Messages. Détecte une conversation active
 * remplissant les 3 conditions :
 *   - 5 messages ou plus échangés
 *   - dernier message > 24 h
 *   - aucune mention de rendez-vous / rencontre dans les 10 derniers messages
 * Réservé à l'audience owner (whisper type `owner_conversation_stagnant`).
 * L'action CTA appelle onProposeMeeting(template) pour pré-remplir le composer.
 */
import { useEffect, useRef } from "react";
import { useAlma } from "@/contexts/AlmaContext";
import { buildConversationStagnantWhisper } from "@/lib/alma/whisper-triggers";
import { detectMeetingMention } from "./meetingMentions";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Props {
  conversationId: string;
  audience: "owner" | "sitter";
  otherFirstName: string | null;
  messages: Message[];
  onProposeMeeting: (template: string) => void;
}

const STAGNANT_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const MIN_MESSAGES = 5;

export function AlmaStagnantConversationWhisper({
  conversationId,
  audience,
  otherFirstName,
  messages,
  onProposeMeeting,
}: Props) {
  const { queueWhisper, canEmit } = useAlma();
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (audience !== "owner") return;
    if (firedFor.current === conversationId) return;
    if (!canEmit("owner_conversation_stagnant")) return;
    if (messages.length < MIN_MESSAGES) return;

    const last = messages[messages.length - 1];
    if (!last) return;
    const lastTs = new Date(last.created_at).getTime();
    if (Date.now() - lastTs < STAGNANT_THRESHOLD_MS) return;

    const recent = messages.slice(-10).map((m) => m.content).join("\n");
    if (detectMeetingMention(recent)) return;

    firedFor.current = conversationId;
    const prenom = otherFirstName || "cette personne";
    const template = `Bonjour ${prenom}, je vous propose que l'on se rencontre pour discuter de vive voix. Êtes-vous disponible cette semaine ?`;

    queueWhisper(
      buildConversationStagnantWhisper({
        firstName: prenom,
        onProposeMeeting: () => onProposeMeeting(template),
      }),
    );
  }, [conversationId, audience, otherFirstName, messages, canEmit, queueWhisper, onProposeMeeting]);

  return null;
}

export default AlmaStagnantConversationWhisper;
