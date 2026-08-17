import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

// Verrous du sitemap edge : déduplication finale par <loc> et cohérence des
// villes hardcodées avec les données du front. « aura » a été retiré car le
// slug ne résout ni dans src/data/cities.ts ni dans seo_city_pages :
// /house-sitting/aura rend la page introuvable.
describe("sitemap edge : déduplication et villes hardcodées", () => {
  const src = read("supabase/functions/sitemap/index.ts");

  it("les villes hardcodées ne contiennent pas aura", () => {
    const block = src.match(/const cityPages = \[([\s\S]*?)\];/);
    expect(block).not.toBeNull();
    expect(block![1]).not.toMatch(/["']aura["']/);
    for (const slug of ["annecy", "lyon", "grenoble", "caluire-et-cuire", "chambery"]) {
      expect(block![1]).toContain(`"${slug}"`);
    }
  });

  it("chaque ville hardcodée existe dans les données statiques du front", () => {
    const cities = read("src/data/cities.ts");
    for (const slug of ["annecy", "lyon", "grenoble", "caluire-et-cuire", "chambery"]) {
      expect(cities).toContain(`slug: "${slug}"`);
    }
  });

  it("déduplique les entrées par <loc>, première occurrence gagnante", () => {
    expect(src).toContain("seen.has(loc)");
    expect(src).toContain("seen.add(loc)");
    // La déduplication précède la sérialisation finale.
    expect(src.indexOf("seen.has(loc)")).toBeLessThan(src.indexOf("new Response(xml"));
  });
});
