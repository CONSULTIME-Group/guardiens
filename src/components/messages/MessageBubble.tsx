import { useState } from "react";
import { Check, CheckCheck, Info } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
}

const systemMessageText = (
  metadata: { action?: string; actor?: string; actor_name?: string; dates?: string } | null | undefined,
  readerRole: "proprio" | "gardien",
  fallback: string,
): string => {
  if (!metadata?.action) return fallback;
  const name = metadata.actor_name || "";
  const dates = metadata.dates || "";
  const map: Record<string, Record<string, string>> = {
    candidature_declinee: {
      proprio: metadata.actor === "proprio" ? "Vous avez décliné cette candidature." : "Le gardien a retiré sa candidature.",
      gardien: metadata.actor === "proprio" ? "Votre candidature a été déclinée." : "Vous avez retiré votre candidature.",
    },
    candidature_acceptee: {
      proprio: `Vous avez accepté ${name || "le gardien"}. Garde confirmée ✓`,
      gardien: "Votre candidature a été acceptée. Garde confirmée ✓",
    },
    garde_confirmee: {
      proprio: `Garde confirmée avec ${name}${dates ? " · " + dates : ""}`,
      gardien: `Garde confirmée avec ${name}${dates ? " · " + dates : ""}`,
    },
    garde_annulee_proprio: {
      proprio: "Vous avez annulé cette garde.",
      gardien: "Le propriétaire a annulé la garde.",
    },
    garde_annulee_gardien: {
      proprio: "Le gardien a annulé la garde.",
      gardien: "Vous avez annulé cette garde.",
    },
    candidature_expiree: {
      proprio: "Candidature expirée — sans réponse dans les 48h.",
      gardien: "Candidature expirée — sans réponse dans les 48h.",
    },
    garde_en_cours: {
      proprio: `La garde a commencé. ${name || "Le gardien"} est sur place.`,
      gardien: "La garde a commencé. Bon séjour !",
    },
    garde_terminee: {
      proprio: "Garde terminée. Pensez à laisser un avis !",
      gardien: "Garde terminée. Pensez à laisser un avis !",
    },
  };
  return map[metadata.action]?.[readerRole] || fallback;
};

const MessageBubble = ({ msg, isMe, readerRole = "gardien" }: MessageBubbleProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (msg.is_system) {
    const text = systemMessageText(msg.metadata, readerRole, msg.content);
    return (
      <div className="flex justify-center">
        <div className="bg-muted/50 rounded-full px-4 py-1 flex items-center gap-1">
          <Info className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground italic">{text}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "rounded-br-md bg-primary/15" : "rounded-bl-md bg-muted"}`}
        >
          {msg.photo_url && (
            <button onClick={() => setLightboxOpen(true)} className="block mb-1 focus:outline-none">
              <img src={msg.photo_url} alt="" className="max-w-full max-h-48 rounded-lg object-cover hover:opacity-90 transition-opacity cursor-zoom-in" />
            </button>
          )}
          {msg.content && <p className="text-sm whitespace-pre-line break-words text-foreground">{msg.content}</p>}
          <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
            <span className="text-[10px] text-muted-foreground">{format(new Date(msg.created_at), "HH:mm")}</span>
            {isMe && (
              msg.read_at
                ? <CheckCheck className="h-3 w-3 text-primary" />
                : <Check className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {msg.photo_url && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl p-2 bg-background border-none">
            <img src={msg.photo_url} alt="" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default MessageBubble;
