import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Garder le miroir de la règle d'indexabilité identique à sa référence.
 * Le recache traite aussi les fiches devenues noindex : leur ancienne copie
 * doit être remplacée. Les cas de reprise et d'échec sont exercés par le
 * vrai handler dans consume-seo-dirty/index_test.ts.
 */
const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

describe("miroir Deno de la règle d'indexabilité gardien", () => {
  it("le miroir est identique au fichier de référence", () => {
    expect(read("supabase/functions/_shared/sitterProfileIndexability.js")).toBe(
      read("src/lib/sitterProfileIndexability.js"),
    );
  });

  it("le consommateur traite toute fiche marquée dans le même budget", () => {
    const src = read("supabase/functions/consume-seo-dirty/index.ts");
    expect(src).not.toContain('.in("role", ["sitter", "both"])');
    expect(src).toContain("rows.slice(0, SITTER_RENDER_BUDGET)");
    expect(src).toContain('.eq("seo_dirty_at", row.seo_dirty_at)');
    expect(src).toMatch(/SITTER_RENDER_BUDGET = 25/);
    expect(src).toContain("/gardiens/");
  });
});
