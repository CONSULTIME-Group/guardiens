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
 * et Shift+Enter pour nouvelle ligne.
 * Safe-area iOS : pb-[env(safe-area-inset-bottom)] pour le notch.
 */
const MessageComposer = ({ value, onChange, onSend, onPickPhoto, sending }: MessageComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-grow : ajuste la hauteur au contenu, plafonnée à ~6 lignes
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineH = 22; // line-height réel en px
    const maxLines = 6;
    const maxH = maxLines * lineH + 20; // + padding vertical
    ta.style.height = Math.min(ta.scrollHeight, maxH) + "px";
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Envoyer avec Enter (sans Shift) sur desktop uniquement
    // Sur mobile, le clavier virtuel n'envoie pas Enter de la même façon,
    // l'utilisateur peut utiliser le bouton d'envoi.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      // Détection approximative desktop (pointer: fine)
      if (window.matchMedia("(pointer: fine)").matches) {
        e.preventDefault();
        onSend();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPickPhoto(file);
    e.target.value = "";
  };

  return (
    <div
      className={[
        // Sticky bottom + safe-area iOS
        "sticky bottom-0 z-10",
        "border-t border-border bg-card/95 backdrop-blur-sm",
        "px-3 pt-2.5 pb-2.5",
        // Safe area iOS (notch / home indicator)
        "[padding-bottom:max(10px,env(safe-area-inset-bottom))]",
        "flex items-end gap-2",
        "shadow-[0_-1px_0_0_hsl(var(--border)),0_-8px_16px_-8px_hsl(var(--foreground)/0.06)]",
      ].join(" ")}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Bouton photo — cible tactile 44 × 44 px */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-accent active:bg-accent/80 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
        aria-label="Joindre une photo"
      >
        <ImageIcon className="h-[22px] w-[22px]" aria-hidden="true" />
      </button>

      {/* Champ texte autosize */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Écrire un message…"
        aria-label="Écrire un message"
        rows={1}
        className={[
          "flex-1 resize-none",
          "rounded-2xl border border-input bg-background",
          "px-4 py-[10px] text-sm leading-[22px]",
          "min-h-[44px]",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "transition-[height] duration-100",
        ].join(" ")}
      />

      {/* Bouton envoi — 44 × 44 px, couleur primary */}
      <Button
        size="icon"
        onClick={onSend}
        disabled={sending || !value.trim()}
        className="rounded-full shrink-0 h-11 w-11 transition-all active:scale-95"
        aria-label="Envoyer le message"
      >
        <Send className="h-[18px] w-[18px]" aria-hidden="true" />
      </Button>
    </div>
  );
};

export default MessageComposer;
