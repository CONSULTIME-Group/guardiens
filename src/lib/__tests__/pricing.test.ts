import { describe, it, expect } from "vitest";
import {
  OWNER_PRICE,
  SITTER_PRICE,
  SITTER_PRICE_NUMERIC,
  SITTER_PRICE_CURRENCY,
  SITTER_PRICE_START,
  SITTER_PRICE_START_ISO,
  FOUNDER_DEADLINE,
  FOUNDER_DEADLINE_ISO,
  PRICING_LONG,
  PRICING_SHORT,
  PRICING_VERY_SHORT,
} from "../pricing";

const NBSP = "\u00A0";
const FORBIDDEN = ["gratuit", "à vie", "pour toujours", "13 mai"];

describe("pricing constants", () => {
  it("uses non-breaking space before €", () => {
    expect(OWNER_PRICE).toBe(`0${NBSP}€`);
    expect(SITTER_PRICE).toBe(`6,99${NBSP}€/mois`);
  });

  it("exposes correct atomic values", () => {
    expect(SITTER_PRICE_NUMERIC).toBe(6.99);
    expect(SITTER_PRICE_CURRENCY).toBe("EUR");
    expect(SITTER_PRICE_START).toBe("30 septembre 2026");
    expect(SITTER_PRICE_START_ISO).toBe("2026-09-30");
    expect(FOUNDER_DEADLINE).toBe("30 septembre 2026");
    expect(FOUNDER_DEADLINE_ISO).toBe("2026-09-30");
  });

  it("PRICING_LONG contains required mentions", () => {
    expect(PRICING_LONG).toContain("30 septembre 2026");
    expect(PRICING_LONG).toContain("6,99");
    expect(PRICING_LONG).toContain("30 septembre 2026");
    expect(PRICING_LONG).toContain("Fondateur");
  });

  it("PRICING_SHORT contains required mentions", () => {
    expect(PRICING_SHORT).toContain("30 septembre 2026");
    expect(PRICING_SHORT).toContain("6,99");
  });

  it("PRICING_VERY_SHORT contains owner price", () => {
    expect(PRICING_VERY_SHORT).toContain(OWNER_PRICE);
  });

  it.each([PRICING_LONG, PRICING_SHORT, PRICING_VERY_SHORT])(
    "does not contain forbidden vocabulary: %s",
    (text) => {
      for (const word of FORBIDDEN) {
        expect(text.toLowerCase()).not.toContain(word.toLowerCase());
      }
    },
  );
});
