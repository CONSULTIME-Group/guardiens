import { describe, it, expect } from "vitest";
import {
  OWNER_PRICE,
  SITTER_PRICE,
  SITTER_PRICE_NUMERIC,
  SITTER_PRICE_CURRENCY,
  PRICING_LONG,
  PRICING_SHORT,
  PRICING_VERY_SHORT,
  isPricingActive,
  getSitterMonthlyLabel,
  getOwnerPriceLabel,
  getPricingBaseline,
} from "../pricing";

/**
 * Pivot pricing "gratuit sans deadline", 5 juillet 2026.
 *
 * Tant que PRICING_IS_ACTIVE = false, les labels utilisateur sont figés sur
 * « Gratuit » et la baseline ne contient aucune date de bascule.
 */
describe("pricing helpers (pivot gratuit sans deadline)", () => {
  it("le flag pricing est désactivé", () => {
    expect(isPricingActive()).toBe(false);
  });

  it("labels utilisateur figés sur 'Gratuit'", () => {
    expect(OWNER_PRICE).toBe("Gratuit");
    expect(SITTER_PRICE).toBe("Gratuit");
    expect(getSitterMonthlyLabel()).toBe("Gratuit");
    expect(getOwnerPriceLabel()).toBe("Gratuit");
  });

  it("constantes atomiques conservées pour réactivation future", () => {
    expect(SITTER_PRICE_NUMERIC).toBe(6.99);
    expect(SITTER_PRICE_CURRENCY).toBe("EUR");
  });

  it("PRICING_LONG contient la baseline pivot", () => {
    expect(PRICING_LONG).toBe(getPricingBaseline());
    expect(PRICING_LONG).toContain("gratuit tant que nous ne sommes pas satisfaits");
    expect(PRICING_LONG).not.toMatch(/1er\s+octobre\s+2026/);
    expect(PRICING_LONG).not.toMatch(/30\s+septembre\s+2026/);
  });

  it("PRICING_SHORT et PRICING_VERY_SHORT sont concis et sans date", () => {
    for (const t of [PRICING_SHORT, PRICING_VERY_SHORT]) {
      expect(t.toLowerCase()).toContain("sans engagement");
      expect(t).not.toMatch(/2026/);
    }
  });
});
