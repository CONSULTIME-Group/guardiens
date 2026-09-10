/**
 * Fil de conversation d'Alma, rendu dans le panneau déplié du dock.
 *
 * Contraintes tenues ici :
 * - hauteur plafonnée à 60 pour cent de la hauteur visible (visualViewport
 *   sur iOS, sinon innerHeight), fil scrollable, composeur collé en bas
 * - le composeur reste visible quand le clavier logiciel se lève
 * - l'état vit dans conversation-store, donc il survit au démontage du dock
 *
 * Entrée vocale seulement, aucune synthèse vocale.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Send, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlmaAvatar } from "./AlmaAvatar";
import { VoiceStatusLine } from "./AlmaDock";
import { useAlmaVoiceInput } from "@/hooks/useAlmaVoiceInput";

import {
  closeAlmaConversation,
  getAlmaConversationState,
  sendAlmaMessage,
  subscribeAlmaConversation,
} from "@/lib/alma/conversation-store";

function useVisualViewportHeight(): number {
  const [height, setHeight] = useState(() =>
    typeof window === "undefined" ? 800 : window.innerHeight,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const update = () => setHeight(vv?.height ?? window.innerHeight);
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return height;
}

interface AlmaConversationProps {
  surface: string;
  activeRole: "owner" | "sitter";
}

export function AlmaConversation({ surface, activeRole }: AlmaConversationProps) {
  const state = useSyncExternalStore(subscribeAlmaConversation, getAlmaConversationState);
  const [draft, setDraft] = useState("");
  const viewportHeight = useVisualViewportHeight();
  const threadRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const dictatedRef = useRef(false);

  const voice = useAlmaVoiceInput((text) => {
    dictatedRef.current = true;
    setDraft((d) => (d ? `${d} ${text}` : text));
    inputRef.current?.focus();
  });

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.messages.length, state.sending]);

  const maxHeight = Math.round(viewportHeight * 0.6);

  const submit = () => {
    const text = draft.trim();
    if (!text || state.sending) return;
    const inputMode = dictatedRef.current ? "voice" : "keyboard";
    dictatedRef.current = false;
    setDraft("");
    void sendAlmaMessage({ text, surface, activeRole, inputMode });
  };

  return (
    <div
      data-testid="alma-conversation"
      className={cn(
        "pointer-events-auto mb-2 w-full md:w-96 flex flex-col",
        "rounded-2xl border border-primary/20 bg-card text-card-foreground shadow-xl",
        "animate-in slide-in-from-bottom-2 fade-in duration-200",
      )}
      style={{ maxHeight }}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <AlmaAvatar size={24} mood={state.sending ? "thinking" : "idle"} />
        <span className="text-xs font-semibold text-primary">Alma</span>
        <button
          type="button"
          onClick={closeAlmaConversation}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label="Fermer la conversation avec Alma"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2"
        role="log"
        aria-live="polite"
      >
        {state.messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug whitespace-pre-line",
              m.role === "alma"
                ? "bg-muted text-foreground"
                : "ml-auto bg-primary text-primary-foreground",
            )}
          >
            {m.content}
          </div>
        ))}
        {state.sending && (
          <p className="text-xs text-muted-foreground">Alma prépare sa réponse.</p>
        )}
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      </div>

      <div className="border-t border-border p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Posez votre question à Alma"
            aria-label="Votre message pour Alma"
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-[13px] leading-snug max-h-24 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={voice.supported ? voice.toggle : undefined}
            disabled={!voice.supported || voice.status === "transcribing"}
            title={
              voice.supported
                ? undefined
                : "La dictée arrive sur les navigateurs qui la prennent en charge."
            }
            aria-label={
              voice.supported
                ? voice.status === "recording"
                  ? "Arrêter la dictée"
                  : "Dicter votre message"
                : "Dictée disponible sur les navigateurs qui la prennent en charge"
            }
            aria-pressed={voice.status === "recording"}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-50",
              voice.status === "recording"
                ? "bg-destructive text-destructive-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {voice.status === "recording" ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={state.sending || draft.trim().length === 0}
            aria-label="Envoyer à Alma"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <VoiceStatusLine status={voice.status} error={voice.error} />
      </div>

    </div>
  );
}

export default AlmaConversation;
