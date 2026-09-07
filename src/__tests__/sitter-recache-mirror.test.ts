import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Garde anti-divergence : la règle d'indexabilité des fiches gardien est
 * consommée aussi par la fonction edge `consume-seo-dirty`, qui ne peut pas
 * importer `src/`. Le miroir Deno doit rester rigoureusement identique au
 * fichier de référence, sinon une fiche en noindex pourrait consommer un
 * render Prerender facturé.
 */
const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

describe("miroir Deno de la règle d'indexabilité gardien", () => {
  it("le miroir est identique au fichier de référence", () => {
    expect(read("supabase/functions/_shared/sitterProfileIndexability.js")).toBe(
      read("src/lib/sitterProfileIndexability.js"),
    );
  });

  it("le consommateur applique la règle et plafonne les renders", () => {
    const src = read("supabase/functions/consume-seo-dirty/index.ts");
    expect(src).toContain('from "../_shared/sitterProfileIndexability.js"');
    expect(src).toContain("isSitterProfileIndexable(");
    expect(src).toMatch(/SITTER_RENDER_BUDGET = \d+/);
    expect(src).toContain("/gardiens/");
  });
});
