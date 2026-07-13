import { useState } from "react";
import { Check, CheckCheck, Info } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface MessageBubbleProps {
  msg: {
    id: string;
    sender_id: string;
    content: string;
    photo_url: string | null;
    is_system: boolean;
    read_at: string | null;
    created_at: string;
    metadata?: { action?: string; actor?: string; actor_id?: string; actor_name?: string; dates?: string } | null;
  };
  isMe: boolean;
  readerRole?: "proprio" | "gardien";
  /** N'afficher le timestamp que sur la dernière bulle d'une séquence consécutive */
  isLastInGroup?: boolean;
}

const systemMessageText = (
  metadata: { action?: string; actor?: string; actor_name?: string; dates?: string } | null | undefined,
  readerRole: "proprio" | "gardien",
  fallback: string,
): string => {
  // Fallback : détection par motif du contenu brut (messages legacy sans metadata).
  // On synthétise une action pour retomber sur le mapping ci-dessous.
  let action = metadata?.action;
  let name = metadata?.actor_name || "";
  const dates = metadata?.dates || "";
  if (!action && fallback) {
    const raw = fallback.trim();
    if (/vous invite.*reconsid[ée]rer/i.test(raw)) action = "reinvited";
    else if (/^la garde est confirm[ée]e/i.test(raw) || /^vous avez [ée]t[ée] choisi/i.test(raw)) action = "candidature_acceptee";
    else if (/le guide de la maison est disponible/i.test(raw)) action = "guide_available";
    else if (/le propri[ée]taire a choisi un autre gardien/i.test(raw)) action = "other_sitter_chosen";
    else if (/votre candidature a [ée]t[ée] d[ée]clin[ée]e/i.test(raw)) action = "candidature_declinee_owner";
    else if (/^la garde.*a [ée]t[ée] annul[ée]e par/i.test(raw)) action = "garde_annulee_generique";
    else if (/un avis a [ée]t[ée] laiss[ée]/i.test(raw)) action = "review_left";
  }
  if (!action) return fallback;
  const map: Record<string, Record<string, string>> = {
    candidature_declinee: {
      proprio: metadata?.actor === "proprio" ? "Vous avez décliné cette candidature." : "Le gardien a retiré sa candidature.",
      gardien: metadata?.actor === "proprio" ? "Votre candidature a été déclinée." : "Vous avez retiré votre candidature.",
    },
    candidature_declinee_owner: {
      proprio: "Vous avez décliné cette candidature.",
      gardien: "Votre candidature a été déclinée pour cette garde.",
    },
    candidature_acceptee: {
      proprio: `Vous avez confirmé ${name || "ce gardien"} pour cette garde.`,
      gardien: "Votre candidature a été acceptée. La garde est confirmée.",
    },
    garde_confirmee: {
      proprio: `Garde confirmée avec ${name}${dates ? ", " + dates : ""}.`,
      gardien: `Garde confirmée avec ${name}${dates ? ", " + dates : ""}.`,
    },
    garde_annulee_proprio: {
      proprio: "Vous avez annulé cette garde.",
      gardien: "Le propriétaire a annulé la garde.",
    },
    garde_annulee_gardien: {
      proprio: "Le gardien a annulé la garde.",
      gardien: "Vous avez annulé cette garde.",
    },
    garde_annulee_generique: {
      proprio: "La garde a été annulée.",
      gardien: "La garde a été annulée.",
    },
    candidature_expiree: {
      proprio: "Candidature expirée, sans réponse dans les 48h.",
      gardien: "Candidature expirée, sans réponse dans les 48h.",
    },
    garde_en_cours: {
      proprio: `La garde a commencé. ${name || "Le gardien"} est sur place.`,
      gardien: "La garde a commencé. Bon séjour.",
    },
    garde_terminee: {
      proprio: "Garde terminée. Pensez à laisser un avis.",
      gardien: "Garde terminée. Pensez à laisser un avis.",
    },
    reinvited: {
      proprio: `Vous avez invité ${name || "ce gardien"} à reconsidérer sa candidature.`,
      gardien: "Le propriétaire vous invite à reconsidérer votre candidature.",
    },
    guide_available: {
      proprio: "Vous avez rendu le guide de la maison disponible pour le gardien.",
      gardien: "Le guide de la maison est disponible. Vous y trouverez l'adresse, les codes d'accès, les contacts utiles et toutes les consignes.",
    },
    other_sitter_chosen: {
      proprio: "Vous avez choisi un autre gardien pour cette garde.",
      gardien: "Le propriétaire a choisi un autre gardien pour cette garde. Merci pour votre candidature.",
    },
    review_left: {
      proprio: "Un avis a été déposé pour cette garde.",
      gardien: "Un avis a été déposé pour cette garde.",
    },
  };
  return map[action]?.[readerRole] || fallback;
};

const MessageBubble = ({ msg, isMe, readerRole = "gardien", isLastInGroup = true }: MessageBubbleProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (msg.is_system) {
    const text = systemMessageText(msg.metadata, readerRole, msg.content);
    if (!text?.trim()) return null;
    return (
      <div className="flex justify-center" role="status">
        <div className="bg-muted/50 rounded-full px-4 py-1 flex items-center gap-1">
          <Info className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-xs text-muted-foreground italic">{text}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
        <div
          className={[
            "max-w-[78%] px-4 py-2.5",
            "rounded-2xl",
            // Asymétrie 2026 : coin 4 px côté origine
            isMe
              ? "rounded-br-[4px] bg-primary text-primary-foreground"
              : "rounded-bl-[4px] bg-muted text-foreground",
          ].join(" ")}
        >
          {msg.photo_url && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block mb-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Agrandir la photo partagée"
            >
              <img
                src={msg.photo_url}
                alt="Photo partagée dans la conversation"
                loading="lazy"
                className="max-w-full max-h-52 rounded-lg object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
              />
            </button>
          )}
          {msg.content && (
            <p className={`text-sm whitespace-pre-line break-words leading-[1.5] ${isMe ? "text-primary-foreground" : "text-foreground"}`}>
              {msg.content}
            </p>
          )}
          {/* Timestamp + statut lecture : uniquement sur la dernière bulle du groupe */}
          {isLastInGroup && (
            <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
              <span className={`text-[10px] ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {format(new Date(msg.created_at), "HH:mm")}
              </span>
              {isMe && (
                msg.read_at
                  ? <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                  : <Check className="h-3 w-3 text-primary-foreground/50" />
              )}
            </div>
          )}
        </div>
      </div>

      {msg.photo_url && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl p-2 bg-background border-none">
            <VisuallyHidden>
              <DialogTitle>Photo partagée</DialogTitle>
              <DialogDescription>Aperçu agrandi de la photo échangée dans cette conversation</DialogDescription>
            </VisuallyHidden>
            <img src={msg.photo_url} alt="Photo partagée en grand" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default MessageBubble;
