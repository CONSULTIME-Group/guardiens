/**
 * Garde-fou : plus aucune trace de "Programme Fondateur" ou "Badge fondateur"
 * dans les traductions (post-pivot pricing). Bloque la réintroduction.
 * Vérifie aussi que Landing.tsx n'utilise plus landing.final.badge_program
 * ni landing.final.badge_offer.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const LOCALES_DIR = resolve(__dirname, "../i18n/locales");
const LANDING_TSX = resolve(__dirname, "../pages/Landing.tsx");

const FORBIDDEN_PATTERNS = [
  /Programme Fondateur/i,
  /Badge fondateur/i,
  /Founder Programme/i,
  /Founder badge/i,
  /Programa Fundador/i,
  /Insignia fundador/i,
  /Programma Fondatore/i,
  /Badge fondatore/i,
  /Gründer-Programm/i,
  /Gründer-Abzeichen/i,
];

describe("no-founder-in-landing-copy", () => {
  const locales = readdirSync(LOCALES_DIR).filter((f) =>
    ["fr", "en", "es", "it", "de"].includes(f),
  );

  for (const lang of locales) {
    it(`locale ${lang} ne contient plus aucune mention "Programme Fondateur"`, () => {
      const content = readFileSync(`${LOCALES_DIR}/${lang}/common.json`, "utf-8");
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(
          pattern.test(content),
          `Locale ${lang} contient encore un motif proscrit: ${pattern}`,
        ).toBe(false);
      }
    });
  }

  it("Landing.tsx n'utilise plus badge_program ni badge_offer", () => {
    const src = readFileSync(LANDING_TSX, "utf-8");
    expect(src).not.toMatch(/landing\.final\.badge_program/);
    expect(src).not.toMatch(/landing\.final\.badge_offer/);
  });
});
