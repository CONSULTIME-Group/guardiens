import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Garde-fou éditorial pour la page « Mon abonnement » après le pivot
 * "gratuit sans deadline" du 5 juillet 2026.
 *
 * La page ne doit plus afficher aucune grille tarifaire ni date de bascule.
 * Elle doit exposer la baseline pivot.
 */

const FILES = ["src/pages/MySubscription.tsx"];

const FORBIDDEN = [
  { label: "6,99 €/mois", regex: /6\s*[.,]\s*99\s*€\s*\/\s*mois/i },
  { label: "1er octobre 2026", regex: /1er\s+octobre\s+2026/i },
  { label: "30 septembre 2026", regex: /30\s+septembre\s+2026/i },
];

const REQUIRED = [
  {
    label: "baseline pivot",
    regex: /getPricingBaseline\(\)|gratuit tant que nous ne sommes pas satisfaits/i,
  },
];

function readAll(): string {
  return FILES.map((f) => readFileSync(resolve(process.cwd(), f), "utf-8")).join("\n");
}

describe("Page « Mon abonnement » — contenu éditorial (pivot pricing)", () => {
  const corpus = readAll();

  describe("Mentions PROSCRITES", () => {
    for (const { label, regex } of FORBIDDEN) {
      it(`ne doit plus contenir « ${label} »`, () => {
        expect(corpus.match(regex)).toBeNull();
      });
    }
  });

  describe("Mentions REQUISES", () => {
    for (const { label, regex } of REQUIRED) {
      it(`doit contenir « ${label} »`, () => {
        expect(regex.test(corpus)).toBe(true);
      });
    }
  });
});
