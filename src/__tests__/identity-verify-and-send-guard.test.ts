import { describe, it, expect } from "vitest";
import { describeVerifyError, quotaMessage } from "@/lib/identityVerifyError";
import { evaluateSend, extractRecipients, isReservedTestRecipient } from "../../../supabase/functions/_shared/resend-guard";

describe("messages d'échec de vérification d'identité", () => {
  const ctx = { attempts: 6, resetAt: new Date("2026-08-02T09:00:00Z") };

  it("distingue le quota d'une panne", () => {
    const info = describeVerifyError({ status: 429 }, ctx);
    expect(info.kind).toBe("quota");
    expect(info.tone).toBe("error");
    expect(info.message).toContain("Quota atteint");
    expect(info.message).toContain("n'a pas été soumis");
  });

  it("dit combien de tentatives ont été utilisées et quand le compteur repart", () => {
    const msg = quotaMessage(6, new Date("2026-08-02T09:00:00Z"));
    expect(msg).toContain("5 vérifications sur 5");
    expect(msg).toMatch(/réinitialise le/);
  });

  it("donne un message propre aux autres motifs", () => {
    expect(describeVerifyError({ status: 401 }, ctx).kind).toBe("unauthorized");
    expect(describeVerifyError({ status: 404 }, ctx).kind).toBe("document_missing");
    expect(describeVerifyError({ status: 413 }, ctx).kind).toBe("too_large");
    expect(describeVerifyError({ status: 503 }, ctx).kind).toBe("provider_busy");
    const fallback = describeVerifyError({ status: 500 }, ctx);
    expect(fallback.kind).toBe("unavailable");
    expect(fallback.tone).toBe("warning");
  });

  it("n'utilise jamais le message générique pour un quota", () => {
    expect(describeVerifyError({ status: 429 }, ctx).message).not.toContain("indisponible");
  });
});

describe("barrière d'envoi Resend", () => {
  const base = { functionName: "test-fn" };

  it("refuse par défaut quand le mode de livraison n'est pas live", () => {
    delete process.env.EMAIL_DELIVERY_MODE;
    const d = evaluateSend({ ...base, recipients: ["reel@guardiens.fr"] });
    expect(d.allowed).toBe(false);
  });

  it("autorise seulement en mode live vers une adresse réelle", () => {
    process.env.EMAIL_DELIVERY_MODE = "live";
    expect(evaluateSend({ ...base, recipients: ["reel@guardiens.fr"] }).allowed).toBe(true);
    delete process.env.EMAIL_DELIVERY_MODE;
  });

  it("refuse les domaines réservés aux tests même en mode live", () => {
    process.env.EMAIL_DELIVERY_MODE = "live";
    for (const addr of ["qa@guardiens-test.invalid", "a@x.test", "b@example.com", "c@foo.example"]) {
      expect(isReservedTestRecipient(addr)).toBe(true);
      expect(evaluateSend({ ...base, recipients: [addr] }).allowed).toBe(false);
    }
    delete process.env.EMAIL_DELIVERY_MODE;
  });

  it("refuse tout envoi portant le marqueur de harnais", () => {
    process.env.EMAIL_DELIVERY_MODE = "live";
    const req = { headers: { get: (n: string) => (n === "x-guardiens-test-harness" ? "1" : null) } };
    expect(evaluateSend({ ...base, req, recipients: ["reel@guardiens.fr"] }).allowed).toBe(false);
    process.env.EMAIL_TEST_HARNESS = "1";
    expect(evaluateSend({ ...base, recipients: ["reel@guardiens.fr"] }).allowed).toBe(false);
    delete process.env.EMAIL_TEST_HARNESS;
    delete process.env.EMAIL_DELIVERY_MODE;
  });

  it("extrait les destinataires unitaires et en lot", () => {
    expect(extractRecipients({ to: ["a@b.fr"], bcc: "c@d.fr" })).toEqual(["a@b.fr", "c@d.fr"]);
    expect(extractRecipients([{ to: "a@b.fr" }, { to: ["c@d.fr"] }])).toEqual(["a@b.fr", "c@d.fr"]);
  });
});
