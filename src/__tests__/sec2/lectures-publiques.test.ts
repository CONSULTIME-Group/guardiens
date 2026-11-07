// Lot SEC2 (07/11/2026) : hero_weights et competences_validees ne se lisent
// plus en direct hors admin ; le site passe par deux fonctions dédiées.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const rpc = vi.fn();
const from = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    from: (...a: unknown[]) => from(...a),
    channel: () => ({ on: () => ({ subscribe: () => undefined }) }),
  },
}));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "__tests__" || name === "integrations") continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

describe("SEC2, lectures protégées", () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
  });

  it("les suggestions de savoir-faire passent par list_validated_competences", async () => {
    rpc.mockResolvedValue({ data: [{ label: "Taille des haies", categorie: "jardin" }, { label: "" }], error: null });
    const { fetchValidatedCompetenceLabels } = await import("@/lib/validatedCompetences");
    expect(await fetchValidatedCompetenceLabels({ search: "ha", categorie: "jardin", limit: 5 })).toEqual(["Taille des haies"]);
    expect(rpc).toHaveBeenCalledWith("list_validated_competences", { p_search: "ha", p_categorie: "jardin", p_limit: 5 });
    expect(from).not.toHaveBeenCalled();
  });

  it("une lecture refusée donne une liste vide, sans planter", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    const { fetchValidatedCompetenceLabels } = await import("@/lib/validatedCompetences");
    expect(await fetchValidatedCompetenceLabels()).toEqual([]);
  });

  it("aucun écran hors admin ne lit ces deux tables en direct", () => {
    const offenders = walk("src").filter((p) => {
      if (/src\/pages\/admin\/|src\/pages\/AdminHeroWeights\.tsx$/.test(p)) return false;
      return /\.from\(\s*["'](hero_weights|competences_validees)["']/.test(readFileSync(p, "utf8"));
    });
    expect(offenders).toEqual([]);
  });

  it("le hook des poids du hero lit get_hero_weights", () => {
    const src = readFileSync("src/hooks/useHeroWeights.ts", "utf8");
    expect(src).toContain('rpc("get_hero_weights")');
    expect(src).not.toMatch(/\.from\(\s*["']hero_weights["']\)/);
  });

  it("recette des droits par rôle (PGlite) : anon, membre, admin, service", () => {
    const out = execFileSync("node", ["scripts/test-sec2-lectures-publiques.mjs"], { encoding: "utf8" });
    expect(out).toContain("PASS SEC2");
  }, 60_000);
});

describe("SEC2, échec réseau", () => {
  it("une erreur levée par le client donne une liste vide", async () => {
    rpc.mockRejectedValue(new Error("offline"));
    const { fetchValidatedCompetenceLabels } = await import("@/lib/validatedCompetences");
    expect(await fetchValidatedCompetenceLabels()).toEqual([]);
  });
});
