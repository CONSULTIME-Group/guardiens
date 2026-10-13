import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

/**
 * Garde anti-régression du vocabulaire marketing.
 *
 * Règle produit : on dit ce que la chose EST, pas ce qu'elle n'est pas.
 *  - accès               -> « Guardiens est gratuit » (lots X3c et Y3, sans durée,
 *                           pour tous les membres : plus de « 0 € pour les
 *                           propriétaires », qui sous-entend un accès gardien payant)
 *  - commission          -> « aucune commission prélevée sur les gardes »
 *  - comparaison         -> aucune (ni pension, ni pet-sitter, ni plateformes)
 *
 * Les formulations en « sans ... » et la promesse « reste gratuit tant que »
 * sont proscrites dans tout le contenu public, emails compris (lot Y3).
 */

const SCAN_PATHS = "src public supabase/functions/_shared/transactional-email-templates";

const EXCLUDE = [
  // Surfaces internes, jamais vues par un visiteur.
  "--glob=!src/pages/admin/**",
  // Tests et utilitaires de test.
  "--glob=!**/*.test.*",
  "--glob=!**/*.spec.*",
  "--glob=!**/__tests__/**",
  "--glob=!**/*_test.ts",
  "--glob=!src/test/**",
  // Lot Y3 : /tarifs (Pricing.tsx) et /mon-abonnement (MySubscription.tsx) ne
  // sont plus exclus, ils disent « Guardiens est gratuit » comme le reste.
  // Documents juridiques : « sans frais ni pénalité » est une formule légale
  // reprise du Code de la consommation, elle ne se paraphrase pas.
  "--glob=!src/pages/Terms.tsx",
  "--glob=!src/pages/Cgs.tsx",
  "--glob=!src/pages/MentionsLegales.tsx",
  // Validateur éditorial : il CONTIENT les motifs proscrits comme données.
  "--glob=!src/lib/refreshArticleValidator.ts",
  // Ce fichier de garde lui-même.
  "--glob=!src/__tests__/no-forbidden-marketing-copy.test.ts",
];

const FORBIDDEN: Array<{ label: string; pattern: string }> = [
  { label: "reste gratuit tant que", pattern: "reste gratuit tant que" },
  { label: "sans commission", pattern: "[Ss]ans commission" },
  { label: "sans engagement", pattern: "[Ss]ans engagement" },
  { label: "sans limite", pattern: "[Ss]ans limite" },
  { label: "sans carte bancaire", pattern: "[Ss]ans carte bancaire" },
  { label: "zéro frais", pattern: "[Zz]éro frais" },
  { label: "sans frais", pattern: "[Ss]ans frais" },
  // Lot Y3 (passe 5 du 13/10/2026) : gratuité restreinte aux propriétaires.
  { label: "0 € pour les propriétaires", pattern: "0 € pour les propriétaires" },
  { label: "gratuit pour les propriétaires", pattern: "[Gg]ratuite? pour les propriétaires" },
  { label: "offert aux propriétaires", pattern: "offert aux propriétaires" },
  { label: "Guardiens est offert", pattern: "Guardiens est offert" },
  { label: "gratuit pour vous", pattern: "[Gg]ratuit pour vous" },
  // Lot Y3 : les fondateurs ne cherchent pas de gardien pour quelqu'un.
  { label: "nous cherchons des gardiens", pattern: "[Nn]ous cherchons des gardiens" },
];

function search(pattern: string): string[] {
  try {
    const out = execSync(`rg -n '${pattern}' ${SCAN_PATHS} ${EXCLUDE.join(" ")}`, {
      encoding: "utf8",
    });
    return out.split("\n").filter(Boolean);
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err.status === 1) return []; // aucun résultat = conforme
    throw e;
  }
}

describe("Vocabulaire marketing proscrit", () => {
  it("aucune formulation en « sans ... » ni promesse de gratuité perpétuelle dans le contenu public", () => {
    const findings: string[] = [];
    for (const { label, pattern } of FORBIDDEN) {
      for (const line of search(pattern)) {
        findings.push(`[${label}] ${line.trim().slice(0, 200)}`);
      }
    }

    if (findings.length > 0) {
      throw new Error(
        `${findings.length} formulation(s) proscrite(s) dans le contenu public.\n` +
          `Dire ce que la chose EST : « Guardiens est gratuit », ` +
          `« aucune commission prélevée sur les gardes ».\n\n` +
          findings.join("\n"),
      );
    }
    expect(findings).toEqual([]);
  });
});
