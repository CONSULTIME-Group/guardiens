import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Garde-fou anti-régression : vérifie que le sync index.html est bloqué
 * dès qu'un vocabulaire proscrit (AURA, voisin, votre région, 9 €/mois)
 * est introduit dans la source de vérité (src/data/siteRoutes.ts route /).
 *
 * Ce test simule une régression en patchant temporairement le fichier puis
 * en restaurant son contenu original.
 */
describe("sync-index-html — garde-fou SEO", () => {
  const ROUTES_PATH = resolve(process.cwd(), "src/data/siteRoutes.ts");
  const SCRIPT = resolve(process.cwd(), "scripts/sync-index-html.mjs");

  it("passe en --check quand siteRoutes.ts est conforme", () => {
    const out = execSync(`node ${SCRIPT} --check`, { encoding: "utf8" });
    expect(out).toMatch(/synchronisé/);
  });

  it("bloque (exit 3) si vocabulaire proscrit injecté dans la route /", () => {
    const original = readFileSync(ROUTES_PATH, "utf8");
    // Injecte « votre région » dans la metaDescription de la route "/".
    const patched = original.replace(
      /(\{\s*path:\s*["']\/["'],[\s\S]*?metaDescription:\s*")([^"]+)(")/,
      (_m, before, _desc, after) => `${before}Test régression votre région AURA${after}`,
    );
    expect(patched).not.toBe(original); // sanity : la regex a matché

    let exitCode = 0;
    let stderr = "";
    try {
      writeFileSync(ROUTES_PATH, patched, "utf8");
      execSync(`node ${SCRIPT} --check`, { encoding: "utf8", stdio: "pipe" });
    } catch (err: any) {
      exitCode = err.status ?? 0;
      stderr = (err.stderr?.toString() || "") + (err.stdout?.toString() || "");
    } finally {
      writeFileSync(ROUTES_PATH, original, "utf8");
    }

    expect(exitCode, `Le garde-fou aurait dû bloquer (exit 3), reçu ${exitCode}`).toBe(3);
    expect(stderr).toMatch(/GARDE-FOU SEO/);
    expect(stderr).toMatch(/votre région|AURA/);
  }, 30000);
});
