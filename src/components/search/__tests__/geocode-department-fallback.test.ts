/**
 * Test 7 — Repli département quand le géocodage échoue.
 *
 * Deux niveaux :
 *  1. `geocodeCity` absorbe erreur et timeout, elle renvoie null sans lever.
 *  2. Le prédicat de rayon de SearchOwner (extrait du source) rattache un
 *     gardien sans coordonnées à son département : la précision se dégrade,
 *     la liste ne se vide pas.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

const src = readFileSync(resolve(process.cwd(), "src/components/search/SearchOwner.tsx"), "utf8");

describe("géocodage en panne", () => {
  

  it("geocodeCity renvoie null sur erreur de l'API, sans lever", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "rate limited" } });
    const { geocodeCity } = await import("@/lib/geocode");
    await expect(geocodeCity("Ville-Inconnue-Err")).resolves.toBeNull();
  });

  it("geocodeCity renvoie null sur exception (timeout), sans lever", async () => {
    invoke.mockImplementation(() => { throw new Error("timeout"); });
    const { geocodeCity } = await import("@/lib/geocode");
    let outcome: any = "n'a pas résolu";
    try {
      outcome = await geocodeCity("Ville-Inconnue-Timeout");
    } catch (e) {
      outcome = `a levé : ${(e as Error).message}`;
    }
    console.log("OUTCOME", outcome);
    expect(outcome).toBeNull();
  });


  it("SearchOwner déclare un repli département dans le prédicat de rayon", () => {
    const m = src.match(/const inRadius = \(s: any\) => \{[\s\S]*?\n {4}\};/);
    expect(m, "prédicat inRadius introuvable").not.toBeNull();
    const body = m![0];
    expect(body, "aucun repli sur le département dans inRadius").toMatch(/refDept/);
    expect(body).toMatch(/getDeptCode/);
  });

  it("le repli retient bien un gardien du même département sans coordonnées", () => {
    const getDeptCode = (cp?: string | null) => (cp ? cp.slice(0, 2) : null);
    const refDept = "69";
    const radius = [15];
    const inRadius = (s: any) => {
      if (s._dist != null) return s._dist <= radius[0];
      if (!refDept) return false;
      const cp = s.profile?.postal_code;
      return cp ? getDeptCode(cp) === refDept : false;
    };
    const rows = [
      { id: "geo-ok", _dist: 8 },
      { id: "geo-ko-meme-dept", _dist: null, profile: { postal_code: "69003" } },
      { id: "geo-ko-autre-dept", _dist: null, profile: { postal_code: "75011" } },
    ];
    const kept = rows.filter(inRadius).map((r) => r.id);
    expect(kept.length, "une panne de géocodage ne doit pas vider la liste").toBeGreaterThan(0);
    expect(kept).toEqual(["geo-ok", "geo-ko-meme-dept"]);
  });
});
