/**
 * Lot perf 10 (26/10/2026) : le code de la recherche d'un membre est
 * préchargé sans exécution une fois la page en cours affichée. Constat :
 * sur la sonde mobile du 26/10/2026, 3,9 s de téléchargement de code avant
 * la première lecture d'annonces lors d'une navigation interne vers /search,
 * et première carte à 9,7 s en médiane chez les membres Android (89 vues).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isSearchPath, preloadList, prefetchMemberSearch, searchPreloadAllowed } from "@/lib/bootSchedule";

const read = (p: string) => readFileSync(p, "utf8");

describe("perf 10, préchargement de la recherche membre", () => {
  it("rien sur la recherche elle-même", () => {
    expect(isSearchPath("/search")).toBe(true);
    expect(isSearchPath("/recherche")).toBe(true);
    expect(searchPreloadAllowed("/search", undefined)).toBe(false);
    expect(searchPreloadAllowed("/dashboard", undefined)).toBe(true);
    expect(searchPreloadAllowed("/messages", { effectiveType: "4g" })).toBe(true);
  });

  it("rien en mode économie de données ni en 2G", () => {
    expect(searchPreloadAllowed("/dashboard", { saveData: true })).toBe(false);
    expect(searchPreloadAllowed("/dashboard", { effectiveType: "2g" })).toBe(false);
    expect(searchPreloadAllowed("/dashboard", { effectiveType: "slow-2g" })).toBe(false);
  });

  it("hors build, repère non remplacé : aucune planification", () => {
    expect(preloadList("__P2B_PRELOAD_SEARCH_SITTER__")).toEqual([]);
    expect(prefetchMemberSearch("/dashboard", "sitter")).toBe(false);
  });

  it("le greffon suit la page et la vue importée dynamiquement", () => {
    const plugin = read("scripts/vite-plugin-member-preload.mjs");
    expect(plugin).toContain('__P2B_PRELOAD_SEARCH_SITTER__: ["src/pages/SearchPage.tsx", "src/components/search/SearchSitter.tsx"]');
    expect(plugin).toContain('__P2B_PRELOAD_SEARCH_OWNER__: ["src/pages/SearchPage.tsx", "src/components/search/SearchOwner.tsx"]');
    const page = read("src/pages/SearchPage.tsx");
    expect(page).toContain('import("@/components/search/SearchSitter")');
    expect(page).toContain('import("@/components/search/SearchOwner")');
  });

  it("la coquille membre planifie selon l'espace actif, préchargement sans exécution", () => {
    const layout = read("src/components/layout/AppLayout.tsx");
    expect(layout).toMatch(/prefetchMemberSearch\(location\.pathname, activeRole === "sitter" \? "sitter" : "owner"\)/);
    const boot = read("src/lib/bootSchedule.ts");
    expect(boot).toMatch(/runAfterFirstPaint\(\(\) => \{\s*window\.setTimeout\(\(\) => addModulePreload\(files\), SEARCH_PRELOAD_DELAY_MS\)/);
    expect(boot).not.toMatch(/import\("@\/components\/search/);
  });
});
