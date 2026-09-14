import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Mic, Send, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AlmaAvatarAnimated } from "./AlmaAvatarAnimated";
import { VoiceStatusLine } from "./AlmaDock";
import { useAlmaVoiceInput } from "@/hooks/useAlmaVoiceInput";
import { ALMA_COMPOSER_INTRO } from "@/lib/alma/prompt-starters";
import type { AlmaJournalEntry, AlmaJournalPage } from "@/lib/alma/journal";
import {
  getAlmaConversationState,
  openAlmaConversation,
  sendAlmaMessage,
  subscribeAlmaConversation,
} from "@/lib/alma/conversation-store";

export const ALMA_THINKING_LINES = [
  "Je regarde.",
  "Je cherche dans mes notes.",
  "Deux secondes, je vérifie.",
  "Je relis, je veux être sûre.",
  "Je fouille un peu.",
  "J'y suis presque.",
] as const;

const SECTION_LABELS: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/profile": "Mon profil gardien",
  "/owner-profile": "Mon profil propriétaire",
  "/sits": "Mes annonces",
  "/sits/create": "Créer une annonce",
  "/annonces": "Les annonces",
  "/recherche-gardiens": "Rechercher un gardien",
  "/messages": "Messagerie",
  "/favoris": "Mes favoris",
  "/mes-candidatures": "Mes candidatures",
  "/mes-avis": "Mes avis",
  "/mon-secteur": "Mon secteur",
  "/notifications": "Mes notifications",
  "/settings": "Réglages",
  "/alma": "Mon parcours avec Alma",
  "/petites-missions/creer": "Proposer un coup de main",
};

const PUBLIC_SOURCE_TITLES: Record<string, string> = {
  "/faq": "La FAQ",
  "/conseils": "Les conseils d'Alma",
  "/actualites": "Le journal",
  "/associations": "Les associations",
  "/petites-missions": "L'entraide",
  "/guides": "Les guides locaux",
  "/races": "Les fiches de race",
};

interface ExtractedLink {
  href: string;
  title: string;
  kind: "source" | "action";
  label?: string;
}

interface ParsedMessage {
  text: string;
  links: ExtractedLink[];
}

function normalizeInternalPath(href: string): string | null {
  if (href.startsWith("/")) return href;
  try {
    const url = new URL(href);
    if (url.hostname !== "guardiens.fr" && !url.hostname.endsWith(".guardiens.fr")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function sourceLabel(path: string): string {
  if (path.includes("faq")) return "Dans la FAQ";
  if (path.includes("conseil")) return "Conseil";
  return "Le journal";
}

function readableSourceTitle(path: string): string {
  const knownTitle = PUBLIC_SOURCE_TITLES[path];
  if (knownTitle) return knownTitle;
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments.at(-1) ?? "Page";
  let decoded = lastSegment;
  try {
    decoded = decodeURIComponent(lastSegment);
  } catch {
    decoded = lastSegment;
  }
  const words = decoded.replace(/[-_]+/g, " ").trim() || "Page";
  return `${words.charAt(0).toLocaleUpperCase("fr-FR")}${words.slice(1)}`;
}

function extractedLink(path: string): ExtractedLink {
  const basePath = path.split(/[?#]/)[0];
  const menuLabel = SECTION_LABELS[basePath];
  return menuLabel
    ? { href: path, title: menuLabel, kind: "action" }
    : {
        href: path,
        title: readableSourceTitle(basePath),
        kind: "source",
        label: sourceLabel(basePath),
      };
}

/**
 * Racines de chemin reconnues comme des liens internes. Sans cette liste, une
 * simple barre oblique dans une phrase (« et/ou », « 24h/24 », une date) serait
 * prise pour une adresse, retirée du texte et transformée en carte cliquable.
 */
const KNOWN_PATH_ROOTS = new Set(
  [...Object.keys(SECTION_LABELS), ...Object.keys(PUBLIC_SOURCE_TITLES)].map(
    (path) => path.split("/")[1],
  ),
);

function isKnownPath(path: string): boolean {
  const root = path.split(/[?#]/)[0].split("/")[1] ?? "";
  return KNOWN_PATH_ROOTS.has(root);
}

export function parseAlmaMessage(content: string): ParsedMessage {
  const links: ExtractedLink[] = [];
  const markdownPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g;
  let text = content.replace(markdownPattern, (_match, title: string, href: string) => {
    const path = normalizeInternalPath(href);
    if (!path) return title;
    links.push(extractedLink(path));
    return "";
  });

  const absolutePattern = /https?:\/\/(?:www\.)?guardiens\.fr\/[a-zA-Z0-9À-ÿ_?&=#./-]+/g;
  const pathPattern = /(^|[\s("'«])(\/[a-zA-Z0-9À-ÿ_?&=#./-]+)/gu;

  const consume = (href: string): string | null => {
    const trailingPunctuation = href.match(/[.,;:!?]+$/)?.[0] ?? "";
    const cleanHref = trailingPunctuation ? href.slice(0, -trailingPunctuation.length) : href;
    const path = normalizeInternalPath(cleanHref);
    if (!path) return null;
    links.push(extractedLink(path));
    return trailingPunctuation;
  };

  text = text.replace(absolutePattern, (href) => consume(href) ?? href);
  text = text.replace(pathPattern, (match, prefix: string, href: string) => {
    const trailing = href.match(/[.,;:!?]+$/)?.[0] ?? "";
    const cleanHref = trailing ? href.slice(0, -trailing.length) : href;
    if (!isKnownPath(cleanHref)) return match;
    const result = consume(href);
    return result === null ? match : `${prefix}${result}`;
  });

  text = text.replace(/\s{2,}/g, " ").trim();
  if (links.length > 0 && text) {
    text = text
      .replace(/(?:\s*[:,.]\s*)+$/u, "")
      .replace(/(?:\s|^)(?:ici|à l'adresse(?: suivante)?|à cette adresse|sur cette page)$/iu, "")
      .replace(/(?:\s*[:,.]\s*)+$/u, "")
      .trim()
      .trim();
    if (text) text = `${text}.`;
  }

  return { text, links };
}

function useVisualViewportHeight(): number {
  const [height, setHeight] = useState(() =>
    typeof window === "undefined" ? 800 : window.innerHeight,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = window.visualViewport;
    const update = () => setHeight(viewport?.height ?? window.innerHeight);
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return height;
}

function useDesktopLayout(): boolean {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return desktop;
}

interface AlmaConversationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surface: string;
  activeRole: "owner" | "sitter";
  initialMessage: string;
  moodLine?: string | null;
  stageLabel?: string;
  stage?: "nouvelle" | "eveillee" | "complice" | "fidele";
  subject?: string;
  focusSignal?: number;
  starters?: string[];
  showIntro?: boolean;
  onIntroSeen?: () => void;
  onStarterClick?: (label: string) => void;
  onSeen?: () => void;
  onFocus?: () => void;
  onTyped?: () => void;
  action?: { label: string; onClick: () => void } | null;
  /** Page du jour d'Alma (lot Y), affichée avant toute conversation. */
  journal?: AlmaJournalPage | null;
  onJournalAction?: (entry: AlmaJournalEntry) => void;
  onJournalReply?: (reply: string, ruleKey: string) => void;
  /**
   * Panneau bloquant (voile sombre, page inerte). Faux quand Alma s'ouvre
   * d'elle-même : la personne garde la main sur la page et le clavier.
   */
  modal?: boolean;
  /** Place le curseur dans la zone de saisie à l'ouverture. */
  autoFocusInput?: boolean;
}

export function AlmaConversation({
  open,
  onOpenChange,
  surface,
  activeRole,
  initialMessage,
  moodLine,
  stageLabel,
  stage,
  subject,
  focusSignal,
  starters,
  showIntro,
  onIntroSeen,
  onStarterClick,
  onSeen,
  onFocus,
  onTyped,
  action,
  journal,
  onJournalAction,
  onJournalReply,
  modal = true,
  autoFocusInput = true,
}: AlmaConversationProps) {
  const state = useSyncExternalStore(subscribeAlmaConversation, getAlmaConversationState);
  const [draft, setDraft] = useState("");
  const [compactHeader, setCompactHeader] = useState(false);
  const [thinkingLine, setThinkingLine] = useState<string>(ALMA_THINKING_LINES[0]);
  const previousThinkingRef = useRef(-1);
  const viewportHeight = useVisualViewportHeight();
  const desktopLayout = useDesktopLayout();
  const threadRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const dictatedRef = useRef(false);
  const navigate = useNavigate();

  const voice = useAlmaVoiceInput((text) => {
    dictatedRef.current = true;
    setDraft((current) => (current ? `${current} ${text}` : text));
    inputRef.current?.focus({ preventScroll: true });
  });

  useEffect(() => {
    if (!open) return;
    onSeen?.();
    if (showIntro) onIntroSeen?.();
  }, [open, onIntroSeen, onSeen, showIntro]);

  useEffect(() => {
    if (!focusSignal || !open) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [focusSignal, open]);

  useEffect(() => {
    if (!state.sending) return;
    let next = Math.floor(Math.random() * ALMA_THINKING_LINES.length);
    if (next === previousThinkingRef.current) next = (next + 1) % ALMA_THINKING_LINES.length;
    previousThinkingRef.current = next;
    setThinkingLine(ALMA_THINKING_LINES[next]);
  }, [state.sending]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [state.messages.length, state.sending]);

  const journalEntries = journal?.entries ?? [];
  const hasJournal = journalEntries.length > 0;

  const messages = useMemo(
    () => state.open
      ? state.messages
      : hasJournal
        ? []
        : [{ id: "alma-opening", role: "alma" as const, content: initialMessage }],
    [hasJournal, initialMessage, state.messages, state.open],
  );

  const placeholder = subject === "raconter la maison"
    ? "Répondre à Alma"
    : subject
      ? `Répondre au sujet : ${subject}`
      : "Posez votre question à Alma";

  const send = (text: string) => {
    const message = text.trim();
    if (!message || state.sending) return;
    const inputMode = dictatedRef.current ? "voice" : "keyboard";
    dictatedRef.current = false;
    setDraft("");
    openAlmaConversation(initialMessage);
    void sendAlmaMessage({ text: message, surface, activeRole, inputMode });
  };

  const submit = () => send(draft);

  // Suivre un lien ferme le panneau : la page d'arrivée reste utilisable.
  const followLink = (href: string) => {
    const path = normalizeInternalPath(href);
    if (!path) return;
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={modal}>
      <SheetContent
        side="alma"
        hideOverlay={!modal}
        data-alma-conversation-dialog="true"
        data-testid="alma-dock-panel"
        className="alma-conversation-sheet flex gap-0 overflow-hidden p-0"
        style={{ height: viewportHeight }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (autoFocusInput) inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <SheetTitle className="sr-only">Conversation avec Alma</SheetTitle>
        <SheetDescription className="sr-only">Posez une question à Alma.</SheetDescription>

        <header className={cn("alma-conversation-header shrink-0", compactHeader && "is-compact")}>
          <div className="alma-sheet-handle md:hidden" aria-hidden="true" />
          <div className="flex items-center gap-3 pr-12">
            <AlmaAvatarAnimated
              size={compactHeader ? 32 : desktopLayout ? 64 : 46}
              mood={state.sending ? "thinking" : "idle"}
              stage={stage}
              showHalo
              aria-hidden
            />
            <div className="min-w-0">
              <p className="font-heading text-[19px] leading-tight text-foreground">Alma</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase text-terra [letter-spacing:.16em]">
                {stageLabel ?? "Votre assistante"}
              </p>
              {moodLine && (
                <p className="alma-header-mood mt-1 font-heading text-[13px] italic text-muted-foreground">
                  {moodLine}
                </p>
              )}
            </div>
          </div>
          <div className="alma-gold-rule mt-3 h-px w-[85%]" aria-hidden="true" />
        </header>

        <div
          ref={threadRef}
          className="alma-conversation-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 md:px-6"
          role="log"
          aria-live="polite"
          onScroll={(event) => {
            if (window.matchMedia("(max-width: 767px)").matches) {
              setCompactHeader(event.currentTarget.scrollTop > 24);
            }
          }}
        >
          {journalEntries.map((entry, index) => (
            <article
              key={entry.ruleKey}
              data-testid="alma-journal-entry"
              data-rule-key={entry.ruleKey}
              className={cn("alma-turn", index > 0 && "border-t border-[hsl(var(--line-soft))]")}
            >
              <div className="mb-2 flex items-center gap-2" aria-hidden="true">
                <span className="text-[10.5px] font-bold uppercase text-terra [letter-spacing:.16em]">{entry.typeLabel}</span>
                <span className="h-px flex-1 bg-[hsl(var(--line-soft))]" />
              </div>
              <p className="alma-turn-alma whitespace-pre-line">{entry.text}</p>
              {entry.action && (
                <button
                  type="button"
                  data-testid="alma-journal-action"
                  onClick={() => {
                    onJournalAction?.(entry);
                    followLink(entry.action!.href);
                  }}
                  className="alma-action-link mt-3 inline-flex min-h-11 items-center gap-2 text-left text-[13px] font-bold text-pine focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>{entry.action.label}</span><ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              )}
            </article>
          ))}

          {hasJournal && journal?.invitation && (
            <p
              data-testid="alma-journal-invitation"
              className="alma-turn alma-turn-alma border-t border-[hsl(var(--line-soft))]"
            >
              {journal.invitation.question}
            </p>
          )}

          {messages.map((message, index) => {
            const parsed = parseAlmaMessage(message.content);
            return (
              <article
                key={message.id}
                className={cn("alma-turn", (index > 0 || hasJournal) && "border-t border-[hsl(var(--line-soft))]")}
              >
                {message.role === "alma" ? (
                  <div>
                    <div className="mb-2 flex items-center gap-2" aria-hidden="true">
                      <span className="text-[10.5px] font-bold uppercase text-terra [letter-spacing:.16em]">ALMA</span>
                      <span className="h-px flex-1 bg-[hsl(var(--line-soft))]" />
                    </div>
                    {parsed.text && <p className="alma-turn-alma whitespace-pre-line">{parsed.text}</p>}
                    {parsed.links.map((link) => link.kind === "source" ? (
                      <button
                        key={`${message.id}-${link.href}`}
                        type="button"
                        onClick={() => followLink(link.href)}
                        className="alma-source-card notebook-card mt-3 block w-full bg-card p-4 text-left focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block text-[10.5px] font-bold uppercase text-terra [letter-spacing:.16em]">{link.label}</span>
                        <span className="mt-1 block font-heading text-[15px] text-foreground">{link.title}</span>
                        <span className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-4">Lire la source</span>
                      </button>
                    ) : (
                      <button
                        key={`${message.id}-${link.href}`}
                        type="button"
                        onClick={() => followLink(link.href)}
                        className="alma-action-link mt-3 inline-flex min-h-11 items-center gap-2 text-left text-[13px] font-bold text-pine focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span>{link.title}</span><ArrowRight className="h-4 w-4" aria-hidden />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="alma-turn-user ml-auto whitespace-pre-line">{message.content}</p>
                )}
              </article>
            );
          })}

          {!state.open && action && (
              <Button data-testid="alma-panel-action" variant="link" onClick={action.onClick} className="alma-action-link mt-2 h-11 px-0 text-[13px] font-bold text-pine">
              {action.label}<ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          )}

          {state.sending && (
            <div className="alma-thinking flex items-center gap-3 border-t border-[hsl(var(--line-soft))] py-4" aria-live="polite">
              <AlmaAvatarAnimated size={32} mood="thinking" stage={stage} aria-hidden />
              <span className="font-heading text-sm italic text-muted-foreground">{thinkingLine}</span>
              <span className="sr-only">Alma prépare sa réponse.</span>
            </div>
          )}
          {state.error && <p className="py-3 text-xs text-destructive">{state.error}</p>}
        </div>

        <footer className="alma-conversation-composer shrink-0 border-t border-[hsl(var(--line-soft))] bg-[hsl(var(--hero-paper))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 md:px-5 md:pb-5">
          {showIntro && <p data-testid="alma-composer-intro" className="alma-voice mb-2 text-xs">{ALMA_COMPOSER_INTRO}</p>}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => {
                if (event.target.value.length > 0 && draft.length === 0) onTyped?.();
                setDraft(event.target.value);
              }}
              onFocus={onFocus}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={placeholder}
              aria-label="Votre message pour Alma"
              className="alma-field min-h-11 max-h-24 flex-1 resize-none bg-card"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={voice.supported ? voice.toggle : undefined}
              disabled={!voice.supported || voice.status === "transcribing"}
              aria-label={voice.supported ? (voice.status === "recording" ? "Arrêter la dictée" : "Dicter votre message") : "Dictée disponible sur les navigateurs qui la prennent en charge"}
              aria-pressed={voice.status === "recording"}
              className={cn(
                "h-[46px] w-[46px] shrink-0 rounded-full md:h-11 md:w-11",
                voice.status === "recording" ? "bg-destructive text-destructive-foreground" : "bg-terra-soft text-terra hover:bg-terra-soft/80",
              )}
            >
              {voice.status === "recording" ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
            </Button>
            {draft.trim().length > 0 && (
              <Button
                type="button"
                size="icon"
                onClick={submit}
                disabled={state.sending}
                aria-label="Envoyer à Alma"
                className="alma-primary-shadow h-10 w-10 shrink-0 rounded-full md:h-11 md:w-11"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          {!state.open && journal?.invitation && (
            <div className="no-scrollbar mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-1" data-testid="alma-journal-replies">
              {journal.invitation.replies.map((reply) => (
                <Button
                  key={reply}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onJournalReply?.(reply, journalEntries[0]?.ruleKey ?? "");
                    send(reply);
                  }}
                  className="h-11 shrink-0 px-3 text-xs font-normal text-muted-foreground"
                >
                  {reply}
                </Button>
              ))}
            </div>
          )}
          {!(journal?.invitation && !state.open) && starters && starters.length > 0 && (
            <div className="no-scrollbar mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-1" data-testid="alma-prompt-starters">
              {starters.slice(0, 2).map((label) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  onClick={() => { onStarterClick?.(label); send(label); }}
                  className="h-11 shrink-0 px-3 text-xs font-normal text-muted-foreground"
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
          <VoiceStatusLine status={voice.status} error={voice.error} />
        </footer>
      </SheetContent>
    </Sheet>
  );
}

export default AlmaConversation;
