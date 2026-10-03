import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dedupeEntries } from "../../scripts/lib/sitemapCore.mjs";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

// Depuis SEO-3, la déduplication vit dans le générateur unique ; la fonction
// sitemap ne fait plus que relayer le fichier statique.
describe("sitemap : villes codées en dur et déduplication", () => {
  const build = read("scripts/generate-sitemap.mjs");

  it("les villes codées en dur ne contiennent pas aura et existent côté front", () => {
    const block = build.match(/const cityLandingPages = \[([\s\S]*?)\];/);
    expect(block).not.toBeNull();
    expect(block![1]).not.toMatch(/["']aura["']/);
    const cities = read("src/data/cities.ts");
    for (const slug of ["annecy", "lyon", "grenoble", "caluire-et-cuire", "chambery"]) {
      expect(block![1]).toContain(`"${slug}"`);
      expect(cities).toContain(`slug: "${slug}"`);
    }
  });

  it("déduplique par loc avant sérialisation, première occurrence gagnante", () => {
    const { entries, dupes } = dedupeEntries([
      { loc: "/a", lastmod: null, changefreq: "weekly", priority: "0.9" },
      { loc: "/a", lastmod: null, changefreq: "monthly", priority: "0.5" },
    ]);
    expect(dupes).toBe(1);
    expect(entries).toEqual([{ loc: "/a", lastmod: null, changefreq: "weekly", priority: "0.9" }]);
    expect(build.indexOf("dedupeEntries(raw)")).toBeLessThan(build.indexOf("renderSitemapXml(SITE_URL"));
  });
});
