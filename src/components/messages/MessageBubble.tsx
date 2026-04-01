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
  };
  isMe: boolean;
}

const MessageBubble = ({ msg, isMe }: MessageBubbleProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // MOD 4 — System messages styled differently
  if (msg.is_system) {
    return (
      <div className="flex justify-center">
        <div className="bg-muted/50 rounded-full px-4 py-1 flex items-center gap-1">
          <Info className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground italic">{msg.content}</span>
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

      {/* Lightbox */}
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
