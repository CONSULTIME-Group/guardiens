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

  it("getPricingBaseline() contient la promesse pivot", () => {
    expect(getPricingBaseline()).toContain(
      "gratuit tant que nous ne sommes pas satisfaits",
    );
  });

  it("getPricingBaselineShort() est concis et sans engagement", () => {
    expect(getPricingBaselineShort().toLowerCase()).toContain("sans engagement");
  });
});
