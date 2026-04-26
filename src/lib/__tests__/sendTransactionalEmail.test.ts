import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock du client supabase AVANT l'import du module testé
const invokeMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
    rpc: (...args: any[]) => rpcMock(...args),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { sendTransactionalEmail } from "../sendTransactionalEmail";

describe("sendTransactionalEmail", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    rpcMock.mockReset();
  });

  it("échoue proprement si ni email ni user_id n'est fourni", async () => {
    const res = await sendTransactionalEmail({
      templateName: "application-accepted",
      idempotencyKey: "k1",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("missing_recipient");
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("invoque l'edge function avec un email direct", async () => {
    invokeMock.mockResolvedValueOnce({ error: null });
    const res = await sendTransactionalEmail({
      templateName: "application-accepted",
      recipientEmail: "elisa@example.com",
      idempotencyKey: "app-accepted-42",
      templateData: { sitTitle: "Garde Paris", ownerFirstName: "Patricia" },
    });
    expect(res.success).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith("send-transactional-email", {
      body: {
        templateName: "application-accepted",
        recipientEmail: "elisa@example.com",
        idempotencyKey: "app-accepted-42",
        templateData: { sitTitle: "Garde Paris", ownerFirstName: "Patricia" },
      },
    });
  });

  it("résout l'email via RPC quand seul user_id est fourni", async () => {
    rpcMock.mockResolvedValueOnce({ data: "resolved@example.com", error: null });
    invokeMock.mockResolvedValueOnce({ error: null });

    const res = await sendTransactionalEmail({
      templateName: "application-declined",
      recipientUserId: "user-123",
      idempotencyKey: "app-declined-7",
      templateData: { sitTitle: "Garde Lyon" },
    });

    expect(rpcMock).toHaveBeenCalledWith("get_user_email_for_notification", {
      target_user_id: "user-123",
    });
    expect(res.success).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith("send-transactional-email", {
      body: {
        templateName: "application-declined",
        recipientEmail: "resolved@example.com",
        idempotencyKey: "app-declined-7",
        templateData: { sitTitle: "Garde Lyon" },
      },
    });
  });

  it("retourne échec silencieux si la RPC ne trouve pas d'email", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const res = await sendTransactionalEmail({
      templateName: "mission-response",
      recipientUserId: "ghost-user",
      idempotencyKey: "miss-1",
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe("email_not_resolved");
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("ne throw jamais — retourne {success: false} quand l'invoke crash", async () => {
    invokeMock.mockRejectedValueOnce(new Error("network down"));
    const res = await sendTransactionalEmail({
      templateName: "application-accepted",
      recipientEmail: "x@y.com",
      idempotencyKey: "k2",
    });
    expect(res.success).toBe(false);
    // Doit contenir l'erreur, pas la propager
    expect(res.error).toBeInstanceOf(Error);
  });

  it("propage les templateData vide par défaut quand non fourni", async () => {
    invokeMock.mockResolvedValueOnce({ error: null });
    await sendTransactionalEmail({
      templateName: "subscription-expired",
      recipientEmail: "u@example.com",
      idempotencyKey: "sub-1",
    });
    expect(invokeMock).toHaveBeenCalledWith(
      "send-transactional-email",
      expect.objectContaining({
        body: expect.objectContaining({ templateData: {} }),
      }),
    );
  });

  it("idempotencyKey est transmis tel quel — anti-régression doublons", async () => {
    invokeMock.mockResolvedValueOnce({ error: null });
    const key = "app-accepted-conv-abc-123";
    await sendTransactionalEmail({
      templateName: "application-accepted",
      recipientEmail: "u@example.com",
      idempotencyKey: key,
    });
    const call = invokeMock.mock.calls[0];
    expect(call[1].body.idempotencyKey).toBe(key);
  });
});
