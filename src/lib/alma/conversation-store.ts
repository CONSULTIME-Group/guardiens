/**
 * Store de la conversation Alma (lot 1).
 *
 * Volontairement hors React : le dock est démonté quand une modale Radix
 * s'ouvre. Un état local serait perdu, alors qu'ici le fil se retrouve
 * intact au remontage, dans la même session d'onglet.
 *
 * Ne touche à rien du scheduler de whispers.
 */
import { supabase } from "@/integrations/supabase/client";

export type AlmaChatRole = "alma" | "user";

export interface AlmaChatMessage {
  id: string;
  role: AlmaChatRole;
  content: string;
}

export interface AlmaConversationState {
  open: boolean;
  messages: AlmaChatMessage[];
  sending: boolean;
  limited: boolean;
  error: string | null;
}

const initialState: AlmaConversationState = {
  open: false,
  messages: [],
  sending: false,
  limited: false,
  error: null,
};

let state: AlmaConversationState = initialState;
const listeners = new Set<() => void>();

function setState(patch: Partial<AlmaConversationState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getAlmaConversationState(): AlmaConversationState {
  return state;
}

export function subscribeAlmaConversation(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetAlmaConversation() {
  state = initialState;
  listeners.forEach((l) => l());
}

/**
 * Humeur du moment, posée par le dock à chaque changement. Elle part avec
 * la requête pour que le modèle parle de l'humeur exactement affichée à
 * l'écran.
 */
let almaMoodContext: { mood: string | null; line: string | null } = { mood: null, line: null };

export function setAlmaMoodContext(next: { mood: string | null; line: string | null }) {
  almaMoodContext = { mood: next.mood ?? null, line: next.line ?? null };
}

export function getAlmaMoodContext() {
  return almaMoodContext;
}

let counter = 0;
function nextId() {
  counter += 1;
  return `alma-msg-${counter}`;
}

/** Ouvre le fil, en le semant d'un premier message d'Alma si le fil est vide. */
export function openAlmaConversation(seed?: string) {
  if (state.messages.length === 0 && seed) {
    setState({
      open: true,
      messages: [{ id: nextId(), role: "alma", content: seed }],
      error: null,
    });
    return;
  }
  setState({ open: true, error: null });
}

export function closeAlmaConversation() {
  setState({ open: false, error: null });
}

export interface SendAlmaMessageArgs {
  text: string;
  surface: string;
  activeRole: "owner" | "sitter";
  /** Voix ou clavier, journalisé pour le pilotage admin. */
  inputMode?: "voice" | "keyboard";
  /** Injection pour les tests. */
  invoke?: typeof supabase.functions.invoke;
}

/** Envoie un message et ajoute la réponse d'Alma au fil. */
export async function sendAlmaMessage({
  text,
  surface,
  activeRole,
  inputMode = "keyboard",
  invoke,
}: SendAlmaMessageArgs): Promise<void> {
  const message = text.trim();
  if (!message || state.sending) return;

  const history = state.messages.map((m) => ({
    role: m.role === "alma" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  setState({
    open: true,
    sending: true,
    error: null,
    messages: [...state.messages, { id: nextId(), role: "user", content: message }],
  });

  const call = invoke ?? supabase.functions.invoke.bind(supabase.functions);

  try {
    const { data, error } = await call("alma-chat", {
      body: {
        message,
        history,
        surface,
        active_role: activeRole,
        input_mode: inputMode,
        mood: almaMoodContext.mood,
        mood_line: almaMoodContext.line,
      },
    });

    if (error) {
      setState({ sending: false, error: "Alma reste joignable dans un instant, réessayez." });
      return;
    }
    if ((data as any)?.limited) {
      setState({
        sending: false,
        limited: true,
        messages: [
          ...state.messages,
          { id: nextId(), role: "alma", content: String((data as any).message) },
        ],
      });
      return;
    }
    const answer = typeof (data as any)?.answer === "string" ? (data as any).answer.trim() : "";
    if (!answer) {
      setState({ sending: false, error: "Alma reste joignable dans un instant, réessayez." });
      return;
    }
    setState({
      sending: false,
      messages: [...state.messages, { id: nextId(), role: "alma", content: answer }],
    });
  } catch {
    setState({ sending: false, error: "Alma reste joignable dans un instant, réessayez." });
  }
}
