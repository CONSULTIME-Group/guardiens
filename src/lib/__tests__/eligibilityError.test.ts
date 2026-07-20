import { describe, it, expect } from "vitest";
import { detectEligibilityReason } from "@/lib/eligibilityError";

describe("detectEligibilityReason", () => {
  it("détecte account_not_active via le hint", () => {
    expect(detectEligibilityReason({ message: "account_not_active", hint: "account_not_active" })).toBe("account_not_active");
  });
  it("détecte account_not_active via le message seul", () => {
    expect(detectEligibilityReason({ message: "account_not_active" })).toBe("account_not_active");
  });
  it("ne considère plus profile_incomplete comme un motif d'inéligibilité (vague 31)", () => {
    expect(detectEligibilityReason({ message: "profile_incomplete: 45", hint: "profile_incomplete" })).toBeNull();
  });
  it("retourne null sur une erreur non pertinente", () => {
    expect(detectEligibilityReason({ message: "duplicate key" })).toBeNull();
    expect(detectEligibilityReason(null)).toBeNull();
    expect(detectEligibilityReason(undefined)).toBeNull();
  });
});
