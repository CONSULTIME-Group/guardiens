import { describe, it, expect } from "vitest";
import { shouldShowVerifiedCard } from "../shouldShowVerifiedCard";

describe("shouldShowVerifiedCard", () => {
  it("flag éteint : jamais visible, même sans abonnement", () => {
    expect(shouldShowVerifiedCard(false, false)).toBe(false);
    expect(shouldShowVerifiedCard(false, true)).toBe(false);
  });

  it("flag actif + abonné : jamais visible", () => {
    expect(shouldShowVerifiedCard(true, true)).toBe(false);
  });

  it("flag actif + non abonné : visible", () => {
    expect(shouldShowVerifiedCard(true, false)).toBe(true);
  });
});
