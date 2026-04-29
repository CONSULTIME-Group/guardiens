import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Validation JSON-LD : garantit qu'aucun vocabulaire proscrit (AURA, voisin,
 * « votre région », ancien prix 9 €/mois) ne se glisse dans les schémas
 * Schema.org du codebase (Organization, WebSite, Service, FAQPage, etc.).
 *
 * Le script complet vit dans scripts/validate-jsonld.mjs et est exécuté ici
 * en sous-processus — exit code != 0 = test échoué.
 */
describe("JSON-LD Schema.org compliance", () => {
  it("ne contient aucun vocabulaire proscrit dans les schémas Schema.org", () => {
    const script = resolve(process.cwd(), "scripts/validate-jsonld.mjs");
    let output = "";
    let exitCode = 0;
    try {
      output = execSync(`node ${script}`, { encoding: "utf8", stdio: "pipe" });
    } catch (err: any) {
      output = (err.stdout || "") + (err.stderr || "");
      exitCode = err.status ?? 1;
    }
    if (exitCode !== 0) {
      // Affiche le rapport complet pour diagnostic dans la sortie de test
      console.error("\n" + output);
    }
    expect(exitCode, `Validation JSON-LD échouée :\n${output}`).toBe(0);
  }, 30000);
});
