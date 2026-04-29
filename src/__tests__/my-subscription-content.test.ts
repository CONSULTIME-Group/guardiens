import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Garde-fou éditorial pour la page « Mon abonnement ».
 *
 * On scanne directement le code source des fichiers visibles sur cette page
 * (page + composants directs) pour s'assurer que les anciens tarifs et le mot
 * "gratuit" n'y réapparaissent jamais.
 */

const FILES = [
  "src/pages/MySubscription.tsx",
  "src/components/subscription/EntraideLibreBanner.tsx",
  "src/components/subscription/PricingCardsCheckout.tsx",
];

const FORBIDDEN = [
  { label: "gratuit", regex: /\bgratuit(?:e|s|es)?\b/i },
  { label: "12€", regex: /(?<!,)\b12\s*€/ },
  { label: "9€/mois", regex: /(?<!,)\b9\s*€\s*\/\s*mois/i },
];

const REQUIRED = [
  { label: "6,99 €/mois", regex: /6\s*[.,]\s*99\s*€\s*\/\s*mois/i },
  { label: "offert", regex: /\boffert(?:e|s|es)?\b/i },
];

function readAll(): string {
  return FILES.map((f) => {
    const p = resolve(process.cwd(), f);
    return `\n\n/* ===== ${f} ===== */\n` + readFileSync(p, "utf-8");
  }).join("\n");
}

describe("Page « Mon abonnement » — contenu éditorial", () => {
  const corpus = readAll();

  describe("Mots / tarifs PROSCRITS", () => {
    for (const { label, regex } of FORBIDDEN) {
      it(`ne doit jamais contenir « ${label} »`, () => {
        const match = corpus.match(regex);
        expect(
          match,
          match
            ? `Occurrence interdite « ${label} » trouvée : "${match[0]}" — contexte : ...${corpus.slice(Math.max(0, match.index! - 60), match.index! + 80)}...`
            : undefined,
        ).toBeNull();
      });
    }
  });

  describe("Mentions REQUISES", () => {
    for (const { label, regex } of REQUIRED) {
      it(`doit contenir « ${label} »`, () => {
        expect(regex.test(corpus), `Mention requise « ${label} » manquante.`).toBe(true);
      });
    }
  });
});
