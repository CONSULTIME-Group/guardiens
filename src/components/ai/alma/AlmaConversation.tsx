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
 * Habillage : charte Guardiens (papier crème, encre, vert pin, Playfair pour
 * la voix d'Alma, Outfit pour le fonctionnel). Classes dans src/index.css.
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
  /** Libellé du stade de relation, affiché sous le nom dans l'en tête. */
  stageLabel?: string;
}

export function AlmaConversation({ surface, activeRole, stageLabel }: AlmaConversationProps) {
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
        "alma-thread-card text-card-foreground",
        "animate-in slide-in-from-bottom-2 fade-in duration-200",
      )}
      style={{ maxHeight }}
    >
      {/* En tête : trio signature en version courte, pastille, nom, stade. */}
      <div className="flex items-center gap-3 border-b border-border px-[18px] py-3">
        <span className="alma-badge" style={{ width: 32, height: 32 }}>
          <AlmaAvatar size={24} mood={state.sending ? "thinking" : "idle"} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-heading text-base font-semibold text-foreground">Alma</span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {stageLabel ?? "votre assistante"}
          </span>
        </span>
        <button
          type="button"
          onClick={closeAlmaConversation}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Fermer la conversation avec Alma"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={threadRef}
        className="flex-1 overflow-y-auto overscroll-contain px-[18px] py-[14px] flex flex-col gap-[14px]"
        role="log"
        aria-live="polite"
      >
        {state.messages.map((m, index) => {
          const previous = state.messages[index - 1];
          const startsAlmaRun = m.role === "alma" && previous?.role !== "alma";
          if (m.role === "alma") {
            return (
              <div key={m.id} className="flex items-start gap-2">
                <span className="w-6 shrink-0">
                  {startsAlmaRun && <AlmaAvatar size={24} mood="idle" />}
                </span>
                <div className="alma-bubble-alma max-w-[85%] whitespace-pre-line">{m.content}</div>
              </div>
            );
          }
          return (
            <div key={m.id} className="alma-bubble-user ml-auto max-w-[85%] whitespace-pre-line">
              {m.content}
            </div>
          );
        })}
        {state.sending && (
          <div className="flex items-center gap-1.5 pl-8" aria-live="polite">
            <span className="alma-typing-dot" aria-hidden />
            <span className="alma-typing-dot" aria-hidden />
            <span className="alma-typing-dot" aria-hidden />
            <span className="sr-only">Alma prépare sa réponse.</span>
          </div>
        )}
        {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      </div>

      <div className="border-t border-border px-[18px] py-3">
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
            className="alma-field flex-1 resize-none max-h-24"
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
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
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
            className="alma-primary-shadow flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
