import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Garantit que public/llms.txt liste toutes les routes statiques publiques
 * indexables (staticRoutes avec index !== false) ET une page d'entrée pour
 * chaque famille d'URL présente dans le sitemap. Sources de vérité :
 * src/data/siteRoutes.ts et public/sitemap.xml.
 */
describe("llms.txt coverage", () => {
  const llmsTxt = readFileSync(resolve(process.cwd(), "public/llms.txt"), "utf-8");

  it("liste toutes les routes statiques publiques indexables", () => {
    const routesSource = readFileSync(
      resolve(process.cwd(), "src/data/siteRoutes.ts"),
      "utf-8",
    );

    // Extraction simple des paths déclarés dans staticRoutes.
    const blockRe =
      /\{\s*path:\s*(["'])([^"']+)\1[\s\S]*?changeFreq:\s*(["'])(daily|weekly|monthly|yearly)\3[\s\S]*?\}/g;

    const indexable: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = blockRe.exec(routesSource)) !== null) {
      const block = m[0];
      const path = m[2];
      const indexMatch = block.match(/index:\s*(true|false)/);
      const isIndexable = indexMatch ? indexMatch[1] === "true" : true;
      if (isIndexable) indexable.push(path);
    }

    expect(indexable.length).toBeGreaterThan(0);

    const missing = indexable.filter((p) => !llmsTxt.includes(`(${p})`));
    expect(
      missing,
      `Routes publiques indexables absentes de public/llms.txt : ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("couvre toutes les familles d'URL du sitemap", () => {
    const sitemapPath = resolve(process.cwd(), "public/sitemap.xml");
    if (!existsSync(sitemapPath)) return; // sitemap généré au build

    const xml = readFileSync(sitemapPath, "utf-8");
    const paths = Array.from(xml.matchAll(/<loc>https:\/\/guardiens\.fr([^<]*)<\/loc>/g)).map(
      (mm) => mm[1] || "/",
    );

    // Familles volontairement absentes : profils publics de gardiens (pages
    // individuelles, sans page d'entrée publique) et pages d'annonces
    // individuelles, déjà représentées par leur hub /annonces.
    const EXEMPT = new Set(["/gardiens"]);

    const families = new Set<string>();
    for (const p of paths) {
      const first = p.split("/")[1] || "";
      if (!first) continue;
      families.add(`/${first}`);
    }

    const missing = Array.from(families)
      .filter((f) => !EXEMPT.has(f))
      .filter((f) => !llmsTxt.includes(`(${f})`))
      .sort();

    expect(
      missing,
      `Familles d'URL du sitemap sans page d'entrée dans public/llms.txt : ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("annonce le bon nombre de badges, aligné sur BADGE_DEFINITIONS", async () => {
    const { BADGE_DEFINITIONS } = await import("@/components/badges/badge-definitions");
    const count = Object.keys(BADGE_DEFINITIONS).length;
    expect(
      llmsTxt.includes(`${count} badges de reconnaissance`),
      `public/llms.txt doit annoncer ${count} badges de reconnaissance.`,
    ).toBe(true);
  });
});
