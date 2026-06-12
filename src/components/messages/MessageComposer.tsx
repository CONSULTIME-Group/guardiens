import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Image as ImageIcon } from "lucide-react";

interface MessageComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onPickPhoto: (file: File) => void;
  sending: boolean;
}

/**
 * Champ de saisie auto-grow (1 → 6 lignes) avec Enter pour envoyer
 * et Shift+Enter pour nouvelle ligne. Bouton photo conservé.
 */
const MessageComposer = ({ value, onChange, onSend, onPickPhoto, sending }: MessageComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow : ajuste la hauteur au contenu, plafonnée à ~6 lignes
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = 6 * 24 + 16; // ~6 lignes (line-height 24px) + padding
    ta.style.height = Math.min(ta.scrollHeight, max) + "px";
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPickPhoto(file);
    // reset for re-pick same file
    e.target.value = "";
  };

  return (
    <div className="border-t border-border bg-card p-2 md:p-3 flex items-end gap-1.5 md:gap-2 mb-16 md:mb-0 shadow-[0_-4px_12px_-8px_hsl(var(--foreground)/0.08)]">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
        aria-label="Joindre une photo"
      >
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Écrire un message…"
        aria-label="Écrire un message"
        rows={1}
        className="flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-[height]"
      />
      <Button
        size="icon"
        onClick={onSend}
        disabled={sending || !value.trim()}
        className="rounded-full shrink-0"
        aria-label="Envoyer le message"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
};

export default MessageComposer;
