import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  listeners: new Set<(event: string, session: { user: { id: string } } | null) => void>(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (listener: (event: string, session: { user: { id: string } } | null) => void) => {
        auth.listeners.add(listener);
        return { data: { subscription: { unsubscribe: () => auth.listeners.delete(listener) } } };
      },
    },
    functions: { invoke: vi.fn() },
  },
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

import {
  getAlmaConversationState,
  getAlmaMoodContext,
  openAlmaConversation,
  resetAlmaConversation,
  sendAlmaMessage,
  setAlmaMoodContext,
  subscribeAlmaConversation,
} from "@/lib/alma/conversation-store";

function emit(event: string, userId: string | null) {
  auth.listeners.forEach((listener) => listener(event, userId ? { user: { id: userId } } : null));
}

function pendingMessage(text: string) {
  let resolve!: (result: any) => void;
  let reject!: (error: Error) => void;
  const result = new Promise<any>((ok, fail) => { resolve = ok; reject = fail; });
  const invoke = vi.fn().mockReturnValue(result);
  const done = sendAlmaMessage({ text, surface: "dashboard", activeRole: "owner", invoke });
  return { done, resolve, reject, invoke };
}

describe("isolation du fil Alma entre comptes", () => {
  beforeEach(() => {
    emit("SIGNED_OUT", null);
    resetAlmaConversation();
    emit("SIGNED_IN", "account-a");
  });

  it("efface le fil et l'humeur à la déconnexion, même sans dock monté", () => {
    openAlmaConversation("Information privée A");
    setAlmaMoodContext({ mood: "calme", line: "Contexte A" });
    emit("SIGNED_OUT", null);
    expect(getAlmaConversationState()).toEqual({ open: false, messages: [], sending: false, limited: false, error: null });
    expect(getAlmaMoodContext()).toEqual({ mood: null, line: null });
  });

  it("n'envoie jamais l'historique A au nom de B lors d'un changement direct", async () => {
    openAlmaConversation("Information privée A");
    emit("SIGNED_IN", "account-b");
    const invoke = vi.fn().mockResolvedValue({ data: { answer: "Réponse B" }, error: null });
    await sendAlmaMessage({ text: "Question B", surface: "dashboard", activeRole: "sitter", invoke });
    expect(invoke.mock.calls[0][1].body.history).toEqual([]);
    expect(getAlmaConversationState().messages.map((m) => m.content)).toEqual(["Question B", "Réponse B"]);
  });

  it.each(["TOKEN_REFRESHED", "SIGNED_IN", "USER_UPDATED", "INITIAL_SESSION"])(
    "préserve le fil et la réponse en vol pour %s du même compte",
    async (event) => {
      const request = pendingMessage("Question A");
      emit(event, "account-a");
      request.resolve({ data: { answer: "Réponse A" }, error: null });
      await request.done;
      expect(getAlmaConversationState().messages.map((m) => m.content)).toEqual(["Question A", "Réponse A"]);
    },
  );

  it.each(["answer", "limited", "error", "throw"])(
    "ignore une ancienne réponse %s sans interrompre la requête B",
    async (kind) => {
      const old = pendingMessage("Question privée A");
      emit("SIGNED_OUT", null);
      emit("SIGNED_IN", "account-b");
      const current = pendingMessage("Question B");
      if (kind === "throw") old.reject(new Error("ancienne erreur"));
      else old.resolve(kind === "answer"
        ? { data: { answer: "Réponse privée A" }, error: null }
        : kind === "limited"
          ? { data: { limited: true, message: "Limite A" }, error: null }
          : { data: null, error: new Error("ancienne erreur") });
      await old.done;
      expect(getAlmaConversationState()).toMatchObject({ sending: true, error: null, limited: false });
      expect(getAlmaConversationState().messages.map((m) => m.content)).toEqual(["Question B"]);
      current.resolve({ data: { answer: "Réponse B" }, error: null });
      await current.done;
      expect(getAlmaConversationState().messages.map((m) => m.content)).toEqual(["Question B", "Réponse B"]);
    },
  );

  it("invalide aussi une réponse après déconnexion puis reconnexion du même compte", async () => {
    const old = pendingMessage("Question A avant déconnexion");
    emit("SIGNED_OUT", null);
    emit("SIGNED_IN", "account-a");
    old.resolve({ data: { answer: "Ancienne réponse A" }, error: null });
    await old.done;
    expect(getAlmaConversationState().messages).toEqual([]);
  });

  it("une remise à zéro explicite invalide la requête en cours", async () => {
    const old = pendingMessage("Question avant remise à zéro");
    resetAlmaConversation();
    old.resolve({ data: { answer: "Ancienne réponse" }, error: null });
    await old.done;
    expect(getAlmaConversationState().messages).toEqual([]);
  });

  it("conserve le fil lors d'un démontage/remontage du dock", () => {
    const unsubscribe = subscribeAlmaConversation(vi.fn());
    openAlmaConversation("Information A");
    unsubscribe();
    const nextUnsubscribe = subscribeAlmaConversation(vi.fn());
    expect(getAlmaConversationState().messages[0].content).toBe("Information A");
    nextUnsubscribe();
  });
});
