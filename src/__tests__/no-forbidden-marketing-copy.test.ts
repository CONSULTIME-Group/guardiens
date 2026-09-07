import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

/**
 * Garde anti-régression du vocabulaire marketing.
 *
 * Règle produit : on dit ce que la chose EST, pas ce qu'elle n'est pas.
 *  - prix propriétaire   -> « 0 € pour les propriétaires » (badge : « Propriétaires : 0 € »)
 *  - accès               -> « l'accès est ouvert pendant la phase de lancement »
 *  - commission          -> « aucune commission prélevée sur les gardes »
 *  - comparaison pension -> donner le coût de la pension, puis « 0 € » côté Guardiens
 *
 * Les formulations en « sans ... » et la promesse « reste gratuit tant que »
 * sont proscrites dans tout le contenu public.
 */

const SCAN_PATHS = "src public";

const EXCLUDE = [
  // Surfaces internes, jamais vues par un visiteur.
  "--glob=!src/pages/admin/**",
  // Tests et utilitaires de test.
  "--glob=!**/*.test.*",
  "--glob=!**/*.spec.*",
  "--glob=!**/__tests__/**",
  "--glob=!src/test/**",
  // Pages tarifaires : elles décrivent l'offre commerciale et peuvent
  // employer un vocabulaire contractuel (engagement, abonnement).
  "--glob=!src/pages/Pricing.tsx",
  "--glob=!src/pages/MySubscription.tsx",
  "--glob=!src/pages/AuditTarifs.tsx",
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
          `Dire ce que la chose EST : « 0 € pour les propriétaires », ` +
          `« l'accès est ouvert pendant la phase de lancement », ` +
          `« aucune commission prélevée sur les gardes ».\n\n` +
          findings.join("\n"),
      );
    }
    expect(findings).toEqual([]);
  });
});
