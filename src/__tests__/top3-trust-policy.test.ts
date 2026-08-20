/**
 * Garde-fou « tri, on filtre jamais » (décision de Jérémie, 20/08/2026).
 *
 * Verrouille la règle définitive sur les trois viviers gardiens côté
 * propriétaire : Top 3 (useOwnerTopAffinitySitters), « près de chez vous »
 * (useNearbyOwnerSitters) et invitation groupée (BulkInviteNearestDialog).
 * La confiance (identité vérifiée, complétude) est une clé de tri et un
 * badge, jamais un filtre. Aucune constante d'arbitrage, aucune bascule :
 * si l'une réapparaît, ce test doit échouer.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const hookSrc = readFileSync(
  resolve(__dirname, "../hooks/useOwnerTopAffinitySitters.ts"),
  "utf8",
);
const nearbySrc = readFileSync(
  resolve(__dirname, "../hooks/useNearbyOwnerSitters.ts"),
  "utf8",
);
const bulkSrc = readFileSync(
  resolve(__dirname, "../components/sits/owner/BulkInviteNearestDialog.tsx"),
  "utf8",
);
const cardSrc = readFileSync(
  resolve(__dirname, "../components/dashboard/OwnerFirstNBAGardiens.tsx"),
  "utf8",
);

describe("Viviers gardiens, règle définitive : on trie, on ne filtre jamais", () => {
  it("aucune constante d'arbitrage ni bascule ne subsiste", () => {
    expect(hookSrc).not.toContain("TOP3_TRUST_POLICY");
  });

  it("le vivier du Top 3 ne filtre ni identité vérifiée ni complétude", () => {
    expect(hookSrc).not.toContain('.eq("identity_verified", true)');
    expect(hookSrc).not.toContain('.gte("profile_completion"');
    expect(hookSrc).not.toContain(".limit(300)");
  });

  it("le tri du Top 3 est score décroissant, identité vérifiée en départage, distance croissante", () => {
    expect(hookSrc).toContain("b.affinity.score - a.affinity.score");
    expect(hookSrc).toContain("a.identity_verified !== b.identity_verified");
    expect(hookSrc).toContain("return da - db;");
  });

  it("les plafonds du Top 3 sont triés par distance d'abord et tracés, jamais silencieux", () => {
    expect(hookSrc).toContain("POOL_SCORING_CAP");
    expect(hookSrc).toContain("poolExcludedByCap");
    expect(hookSrc).toContain("console.info");
    expect(hookSrc).toContain("POOL_READ_CAP");
    expect(hookSrc).toContain("console.warn");
  });

  it("un gardien sans ligne sitter_profiles est scoré, pas écarté", () => {
    expect(hookSrc).not.toContain("if (!sitter) continue");
    expect(hookSrc).toContain("sitterByUser.get(p.id) ?? {}");
  });

  it("« gardiens près de chez vous » ne filtre plus la complétude", () => {
    expect(nearbySrc).not.toContain('.gte("profile_completion"');
    expect(nearbySrc).not.toContain(".limit(500)");
    expect(nearbySrc).toContain("POOL_READ_CAP");
  });

  it("l'invitation groupée trie par distance avant de plafonner, et trace", () => {
    expect(bulkSrc).not.toContain(".limit(300)");
    expect(bulkSrc).toContain("console.info");
    const sortIdx = bulkSrc.indexOf("enriched.sort(");
    const sliceIdx = bulkSrc.indexOf(".slice(0, cap)");
    expect(sortIdx).toBeGreaterThan(-1);
    expect(sliceIdx).toBeGreaterThan(sortIdx);
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
