import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Garantit que public/llms.txt liste toutes les routes statiques publiques
 * indexables (staticRoutes avec index !== false). Source de vérité :
 * src/data/siteRoutes.ts. Si une nouvelle route publique est ajoutée
 * (ou retirée), ce test échoue tant que llms.txt n'est pas mis à jour.
 */
describe("llms.txt coverage", () => {
  it("liste toutes les routes statiques publiques indexables", () => {
    const routesSource = readFileSync(
      resolve(process.cwd(), "src/data/siteRoutes.ts"),
      "utf-8",
    );
    const llmsTxt = readFileSync(
      resolve(process.cwd(), "public/llms.txt"),
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
});
