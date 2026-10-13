import { describe, it, expect } from "vitest";
import { PRICING_IS_ACTIVE } from "@/config/pricing";
import {
  getSitterMonthlyLabel,
  getOwnerPriceLabel,
  getPricingBaseline,
  getPricingBaselineShort,
  isPricingActive,
} from "@/lib/pricing";

/**
 * Verrouille l'état "pivot pricing gratuit sans deadline".
 * Toute réactivation doit être un changement explicite et documenté.
 */
describe("Pricing helpers (PRICING_IS_ACTIVE = false)", () => {
  it("PRICING_IS_ACTIVE est bien à false", () => {
    expect(PRICING_IS_ACTIVE).toBe(false);
    expect(isPricingActive()).toBe(false);
  });

  it("getSitterMonthlyLabel() retourne 'Gratuit'", () => {
    expect(getSitterMonthlyLabel()).toBe("Gratuit");
  });

  it("getOwnerPriceLabel() retourne 'Gratuit'", () => {
    expect(getOwnerPriceLabel()).toBe("Gratuit");
  });

  // Lot X3c (13/10/2026) : « Guardiens est gratuit », dit simplement, sans
  // durée ni annonce d'évolution tarifaire (audit E-09).
  it("getPricingBaseline() dit simplement que Guardiens est gratuit", () => {
    expect(getPricingBaseline()).toContain("Guardiens est gratuit.");
    expect(getPricingBaseline()).not.toContain("phase de lancement");
    expect(getPricingBaseline()).not.toContain("évolution tarifaire");
  });

  // La formulation « sans engagement » a été proscrite le 07/09/2026 (voir
  // src/__tests__/no-forbidden-marketing-copy.test.ts) : on dit ce que la
  // chose EST. Le verrou porte désormais sur la liberté de partir, énoncée
  // positivement, et sur la concision de la phrase.
  it("getPricingBaselineShort() est concis et énonce la liberté de partir", () => {
    const short = getPricingBaselineShort();
    expect(short.toLowerCase()).toContain("vous restez libre à tout moment");
    expect(short.length).toBeLessThanOrEqual(120);
  });
});

