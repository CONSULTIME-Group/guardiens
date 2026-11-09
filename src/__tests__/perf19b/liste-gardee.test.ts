/**
 * Lot perf 19b (09/11/2026) : la liste reste à l'écran pendant une recherche
 * suivante ; les squelettes ne servent qu'avant la première réponse.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/components/search/SearchSitter.tsx", "utf8");
const fr = JSON.parse(readFileSync("src/i18n/locales/fr/common.json", "utf8"));

describe("liste gardée pendant une recherche suivante", () => {
  it("squelettes seulement quand aucune liste n'est gardée", () => {
    expect(src).toContain(") : loading && !refreshing ? (");
    expect(src).toContain("const refreshing = loading && keptList;");
    expect(src).toMatch(/if \(!loading\) setKeptList\(hasShownList\);/);
  });
  it("conteneur occupé et ligne d'état à la place du compteur", () => {
    expect(src).toContain("aria-busy={refreshing ? true : undefined}");
    expect(src).toContain('role="status" aria-live="polite"');
    expect(src).toContain('refreshing ? t("search_results.refreshing")');
    expect(fr.search_results.refreshing).toBe("Recherche en cours");
  });
  it("aucune animation d'apparition ni changement de hauteur : opacité seule", () => {
    expect(src).toContain('refreshing ? "p-6 opacity-60 transition-opacity" : "p-6"');
    expect(src).not.toMatch(/refreshing[^\n]*animate-fade-in/);
  });
  it("remonte en haut seulement pour un autre lieu, une autre zone ou un autre rayon", () => {
    expect(src).toContain("scrollOnResultRef.current = /(^|\\+)(city|radius|zone)(\\+|$)/.test(motif);");
    const re = /(^|\+)(city|radius|zone)(\+|$)/;
    expect(re.test("radius")).toBe(true);
    expect(re.test("city+zone")).toBe(true);
    expect(re.test("dates")).toBe(false);
    expect(re.test("user_city")).toBe(false);
  });
  it("une erreur garde son affichage", () => {
    const i = src.indexOf("<SearchErrorAlert message={searchError} onRetry={() => { void doSearch(); }} />\n ) : loading && !refreshing");
    expect(i).toBeGreaterThan(0);
  });
});
