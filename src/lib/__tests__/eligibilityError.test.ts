import { describe, it, expect } from "vitest";
import { detectEligibilityReason } from "@/lib/eligibilityError";

describe("detectEligibilityReason", () => {
  it("détecte profile_incomplete via le hint", () => {
    expect(detectEligibilityReason({ message: "profile_incomplete: 45", hint: "profile_incomplete" })).toBe("profile_incomplete");
  });
  it("détecte account_not_active via le message", () => {
    expect(detectEligibilityReason({ message: "account_not_active" })).toBe("account_not_active");
  });
  it("retourne null sur une erreur non pertinente", () => {
    expect(detectEligibilityReason({ message: "duplicate key" })).toBeNull();
    expect(detectEligibilityReason(null)).toBeNull();
    expect(detectEligibilityReason(undefined)).toBeNull();
  });
});
