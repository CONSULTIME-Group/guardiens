/**
 * Lot perf 4 : le premier affichage de /annonces s'empaquette seul, petit,
 * sans client Supabase ni React. Construit dans un processus Node à part
 * (esbuild refuse l'environnement de test du navigateur).
 */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

describe("paquet du premier affichage (lot perf 4)", () => {
  it("le paquet se construit, sans dépendance au client Supabase ni à React", () => {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e",
      "const m = await import(process.cwd() + '/scripts/vite-plugin-listings-prefetch.mjs'); const r = await m.buildBootListings(process.cwd()); console.log(JSON.stringify({ fileName: r.fileName, size: r.code.length, texts: r.code.includes('Annonces de garde'), client: /createClient|react-dom/.test(r.code) }));",
    ], { encoding: "utf8" });
    const r = JSON.parse(out.trim().split("\n").pop()!);
    expect(r.fileName).toMatch(/^assets\/boot-listings-[0-9a-f]{10}\.js$/);
    expect(r.size).toBeLessThan(25_000);
    expect(r.texts).toBe(true);
    expect(r.client).toBe(false);
  }, 60_000);
});
