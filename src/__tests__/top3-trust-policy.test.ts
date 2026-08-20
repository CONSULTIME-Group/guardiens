/**
 * Garde-fou Top 3 propriétaire : la confiance TRIE, elle ne filtre pas.
 *
 * Verrouille la doctrine « on trie par pertinence, on n'élimine jamais »
 * sur le vivier du Top 3 : vérification d'identité et complétude sont des
 * clés de départage, jamais des barrages. Le retour arrière éventuel est
 * une constante nommée et documentée, pas un filtre glissé dans la requête.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const hookSrc = readFileSync(
  resolve(__dirname, "../hooks/useOwnerTopAffinitySitters.ts"),
  "utf8",
);
const cardSrc = readFileSync(
  resolve(__dirname, "../components/dashboard/OwnerFirstNBAGardiens.tsx"),
  "utf8",
);

describe("Top 3 propriétaire, politique de confiance", () => {
  it("TOP3_TRUST_POLICY est en mode 'sort' (la confiance trie, ne filtre pas)", () => {
    expect(hookSrc).toMatch(/TOP3_TRUST_POLICY[^=]*=\s*"sort"/);
  });

  it("le vivier n'est plus borné à 300 lignes", () => {
    expect(hookSrc).not.toContain(".limit(300)");
  });

  it("les clauses d'exclusion n'existent que dans la branche 'filter' documentée", () => {
    const withoutFilterBranch = hookSrc.replace(
      /if \(TOP3_TRUST_POLICY === "filter"\) \{[\s\S]*?\n      \}/,
      "",
    );
    expect(withoutFilterBranch).not.toContain('.eq("identity_verified", true)');
    expect(withoutFilterBranch).not.toContain('.gte("profile_completion", 60)');
  });

  it("le plafond de scoring est tracé, jamais silencieux", () => {
    expect(hookSrc).toContain("POOL_SCORING_CAP");
    expect(hookSrc).toContain("poolExcludedByCap");
    expect(hookSrc).toContain("console.info");
  });

  it("un gardien sans ligne sitter_profiles est scoré, pas écarté", () => {
    expect(hookSrc).not.toContain("if (!sitter) continue");
    expect(hookSrc).toContain("sitterByUser.get(p.id) ?? {}");
  });

  it("la carte affiche le fait « Identité vérifiée » quand il est vrai", () => {
    expect(cardSrc).toContain("sitter.identity_verified");
    expect(cardSrc).toContain("Identité vérifiée");
  });

  it("la section n'est jamais vide dès qu'il existe au moins un candidat", () => {
    expect(cardSrc).not.toContain("topSitters.length < 3");
    expect(cardSrc).toContain("topSitters.length === 0");
  });
});
