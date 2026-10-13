import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Garder le miroir de la règle d'indexabilité identique à sa référence.
 * Lot PR1 (13/10/2026) : le consommateur rend les fiches indexables selon
 * cette règle ; une fiche hors index n'est rendue que si `seo_indexed_at`
 * signale une version indexable à remplacer, sinon elle est acquittée sans
 * render. Les cas de reprise et d'échec sont exercés par le vrai handler
 * dans consume-seo-dirty/index_test.ts.
 */
const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

describe("miroir Deno de la règle d'indexabilité gardien", () => {
  it("le miroir est identique au fichier de référence", () => {
    expect(read("supabase/functions/_shared/sitterProfileIndexability.js")).toBe(
      read("src/lib/sitterProfileIndexability.js"),
    );
  });

  it("le consommateur applique la règle partagée et ne rend une fiche hors index que pour remplacer sa copie", () => {
    const src = read("supabase/functions/consume-seo-dirty/index.ts");
    expect(src).not.toContain('.in("role", ["sitter", "both"])');
    expect(src).toContain('from "../_shared/sitterProfileIndexability.js"');
    expect(src).toContain('from("public_profiles")');
    expect(src).toContain("!indexable && !row.seo_indexed_at");
    expect(src).toContain("attempts >= SITTER_RENDER_BUDGET");
    expect(src).toContain('.eq("seo_dirty_at", row.seo_dirty_at)');
    expect(src).toMatch(/SITTER_RENDER_BUDGET = 25/);
    expect(src).toContain("/gardiens/");
  });
});
