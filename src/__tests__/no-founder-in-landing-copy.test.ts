/**
 * Garde-fou pivot pricing sur la Landing.
 * Bloque la réintroduction des chips "Programme Fondateur" / "Badge fondateur"
 * dans le CTA final et le renommage de `program_label` vers "Programme Fondateur".
 *
 * Note : d'anciennes clés `pre_launch.*` (bloc pré-lancement désactivé tant que
 * PRICING_IS_ACTIVE = false) mentionnent encore "Fondateur", elles sont hors
 * périmètre de ce garde-fou.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LOCALES = ["fr", "en", "es", "it", "de"] as const;
const LANDING_TSX = resolve(__dirname, "../pages/Landing.tsx");

const forbiddenLabels: Record<(typeof LOCALES)[number], RegExp> = {
  fr: /Programme Fondateur/i,
  en: /Founder Programme/i,
  es: /Programa Fundador/i,
  it: /Programma Fondatore/i,
  de: /Gründer-Programm/i,
};

describe("no-founder-in-landing-copy", () => {
  for (const lang of LOCALES) {
    it(`locale ${lang} : landing.final.badge_program et badge_offer sont supprimés`, () => {
      const raw = readFileSync(
        resolve(__dirname, `../i18n/locales/${lang}/common.json`),
        "utf-8",
      );
      const json = JSON.parse(raw);
      const finalBlock = json?.landing?.final ?? {};
      expect(finalBlock.badge_program).toBeUndefined();
      expect(finalBlock.badge_offer).toBeUndefined();
    });

    it(`locale ${lang} : landing.testimonials.program_label ne mentionne plus le programme fondateur`, () => {
      const raw = readFileSync(
        resolve(__dirname, `../i18n/locales/${lang}/common.json`),
        "utf-8",
      );
      const json = JSON.parse(raw);
      const label = json?.landing?.testimonials?.program_label ?? "";
      expect(forbiddenLabels[lang].test(label)).toBe(false);
    });
  }

  it("Landing.tsx n'utilise plus badge_program ni badge_offer", () => {
    const src = readFileSync(LANDING_TSX, "utf-8");
    expect(src).not.toMatch(/landing\.final\.badge_program/);
    expect(src).not.toMatch(/landing\.final\.badge_offer/);
  });
});
