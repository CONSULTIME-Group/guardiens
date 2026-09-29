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
import { trackEvent } from "@/lib/analytics";


export type AlmaChatRole = "alma" | "user";

/** Lot J2-A : action cliquable renvoyée par le serveur, optionnelle. */
export interface AlmaChatAction {
  label: string;
  path: string;
}

export interface AlmaChatChip {
  label: string;
  path?: string;
  prompt?: string;
}

export interface AlmaChatMessage {
  id: string;
  role: AlmaChatRole;
  content: string;
  action?: AlmaChatAction;
  chips?: AlmaChatChip[];
  /** Lot J2-B : identifiant de l'échange, pour le retour utile / pas utile. */
  conversationId?: string;
  /** Lot J2-B : frustration, bug ou question sans réponse détectés. */
  humanContact?: boolean;
  feedback?: AlmaFeedbackValue;
}

export type AlmaFeedbackValue = "useful" | "not_useful";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function readConversationId(raw: unknown): string | undefined {
  return typeof raw === "string" && UUID_RE.test(raw) ? raw : undefined;
}

/** Seuls les chemins internes du site sont acceptés, jamais une adresse externe. */
function isInternalPath(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && v.length <= 1500;
}

export function readAlmaAction(raw: unknown): AlmaChatAction | undefined {
  const a = raw as any;
  if (!a || typeof a.label !== "string" || !a.label.trim() || !isInternalPath(a.path)) return undefined;
  return { label: a.label.slice(0, 80), path: a.path };
}

export function readAlmaChips(raw: unknown): AlmaChatChip[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: AlmaChatChip[] = [];
  for (const c of raw) {
    if (!c || typeof c.label !== "string" || !c.label.trim()) continue;
    const chip: AlmaChatChip = { label: c.label.slice(0, 60) };
    if (isInternalPath(c.path)) chip.path = c.path;
    else if (typeof c.prompt === "string" && c.prompt.trim()) chip.prompt = c.prompt.slice(0, 200);
    else continue;
    out.push(chip);
    if (out.length >= 3) break;
  }
  return out.length ? out : undefined;
}

export interface AlmaConversationState {
  open: boolean;
  messages: AlmaChatMessage[];
  sending: boolean;
  limited: boolean;
  error: string | null;
  /** Lot J2-B : formulaire « Écrire à Jérémie et Elisa » ouvert. */
  contactOpen: boolean;
}

const initialState: AlmaConversationState = {
  open: false,
  messages: [],
  sending: false,
  limited: false,
  error: null,
  contactOpen: false,
};

let state: AlmaConversationState = initialState;
let conversationGeneration = 0;
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
  conversationGeneration += 1;
  almaMoodContext = { mood: null, line: null };
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
  const requestGeneration = conversationGeneration;

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

  // Dernière étape de l'entonnoir de découvrabilité (N6).
  void trackEvent("alma_conversation_message_sent" as any, {
    metadata: { surface, active_role: activeRole, input_mode: inputMode },
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
        page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
      },
    });

    // Une réponse d'une session terminée ne doit jamais rejoindre le nouveau fil.
    if (requestGeneration !== conversationGeneration) return;

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
      messages: [
        ...state.messages,
        {
          id: nextId(),
          role: "alma",
          content: answer,
          action: readAlmaAction((data as any)?.action),
          chips: readAlmaChips((data as any)?.chips),
          conversationId: readConversationId((data as any)?.conversation_id),
          humanContact: (data as any)?.human_contact === true,
        },
      ],
    });
  } catch {
    if (requestGeneration !== conversationGeneration) return;
    setState({ sending: false, error: "Alma reste joignable dans un instant, réessayez." });
  }
}

/** Lot J2-B : ouvre le formulaire de contact humain, dans le fil d'Alma. */
export function openAlmaHumanContact() {
  setState({ open: true, contactOpen: true, error: null });
}

export function closeAlmaHumanContact() {
  setState({ contactOpen: false });
}

/** Lot J2-B : retour utile / pas utile sur une réponse d'Alma. */
export async function sendAlmaFeedback(
  messageId: string,
  value: AlmaFeedbackValue,
  client: { from: typeof supabase.from; auth: typeof supabase.auth } = supabase,
): Promise<boolean> {
  const msg = state.messages.find((m) => m.id === messageId);
  if (!msg?.conversationId) return false;
  const { data: auth } = await client.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return false;
  const { error } = await (client.from as any)("alma_feedback").upsert(
    { conversation_id: msg.conversationId, user_id: userId, value },
    { onConflict: "conversation_id,user_id" },
  );
  if (error) return false;
  setState({
    messages: state.messages.map((m) => (m.id === messageId ? { ...m, feedback: value } : m)),
    ...(value === "not_useful" ? { contactOpen: true } : {}),
  });
  return true;
}

export interface HumanContactInput {
  name: string;
  email: string;
  text: string;
  surface: string;
  invoke?: typeof supabase.functions.invoke;
}

/** Lot J2-B : message à Jérémie et Elisa, avec les derniers échanges et l'écran courant. */
export async function sendAlmaHumanContact(input: HumanContactInput): Promise<boolean> {
  const call = input.invoke ?? supabase.functions.invoke.bind(supabase.functions);
  const { data, error } = await call("alma-chat", {
    body: {
      kind: "contact_humans",
      name: input.name,
      email: input.email,
      text: input.text,
      surface: input.surface,
      page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
      transcript: state.messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    },
  });
  const ok = !error && (data as any)?.ok === true;
  if (ok) {
    setState({
      contactOpen: false,
      messages: [
        ...state.messages,
        { id: nextId(), role: "alma", content: "Votre message est parti chez Jérémie et Elisa. Ils vous répondent par email." },
      ],
    });
  }
  return ok;
}

// Le store survit au dock : écouter l'auth même quand celui-ci est démonté.
// Un rafraîchissement de jeton du même compte conserve la conversation.
let conversationUserId: string | null = null;
const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
  const nextUserId = session?.user.id ?? null;
  if (event === "SIGNED_OUT" || nextUserId !== conversationUserId) {
    conversationUserId = nextUserId;
    resetAlmaConversation();
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => authSubscription.unsubscribe());
}
