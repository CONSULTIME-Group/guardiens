/** Décision du 01/11/2026 : dans une annonce, une mention d'argent prévient, elle ne bloque plus. */
import { describe, it, expect, vi } from "vitest";

const verdicts: Record<string, any> = {};
vi.mock("@/lib/moderation", async (o) => ({
  ...(await o<any>()),
  moderateContent: async (_k: string, text: string) => verdicts[text],
}));
import { moderateSitFields, PAYMENT_NOTICE, softenPaymentVerdict } from "@/lib/sitFieldModeration";

describe("MOD1", () => {
  it("paiement : réserve sans blocage, avec le rappel sans argent", async () => {
    verdicts["chauffage"] = { status: "block", rule: "payment", reasons: ["Participation aux frais de chauffage"] };
    verdicts["07 12 34 56 78"] = { status: "block", rule: "contact_details", reasons: ["Numéro de téléphone"] };
    const r = await moderateSitFields({ ownerMessage: "chauffage", title: "07 12 34 56 78" });
    expect(r.blocked).toEqual(["title"]);
    expect(r.warned).toEqual(["ownerMessage"]);
    expect(r.verdicts.ownerMessage?.reasons).toEqual([PAYMENT_NOTICE]);
  });
  it("les autres règles restent bloquantes", () => {
    expect(softenPaymentVerdict({ status: "block", rule: "scam", reasons: [] }).status).toBe("block");
    expect(softenPaymentVerdict({ status: "block", reasons: [] }).status).toBe("block");
  });
});
