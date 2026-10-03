/** Lot P2b : aucun rendu suspendu au réseau avant le premier affichage. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { preloadList } from "@/lib/bootSchedule";

const read = (p: string) => readFileSync(p, "utf8");

describe("P2b, premier rendu sans attente réseau", () => {
  it("le dictionnaire fr est importé statiquement et prêt immédiatement", async () => {
    const src = read("src/i18n/index.ts");
    expect(src).toMatch(/import fr from "\.\/locales\/fr\/common\.json"/);
    const i18n = await import("@/i18n");
    await expect(i18n.i18nReady).resolves.toBeUndefined();
    expect(i18n.default.hasResourceBundle("fr", "common")).toBe(true);
  });

  it("main.tsx rend sans attendre de promesse", () => {
    const src = read("src/main.tsx");
    expect(src).not.toMatch(/i18nReady/);
    expect(src).not.toMatch(/await[^\n]*render|\.then\([^)]*render/);
    expect(src).toMatch(/createRoot\(document\.getElementById\("root"\)!\)\.render\(<App \/>\)/);
  });

  it("en-tête et pied de page publics dans l'entrée, coquille membre à la demande", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/^import PublicHeader from/m);
    expect(app).toMatch(/^import PublicFooter from/m);
    expect(app).not.toMatch(/^import AppLayout from/m);
  });

  it("liste de préchargement : vide tant que le repère n'est pas remplacé", () => {
    expect(preloadList("__P2B_PRELOAD_DASHBOARD__")).toEqual([]);
    expect(preloadList('["assets/Dashboard-x.js"]')).toEqual(["assets/Dashboard-x.js"]);
    expect(preloadList("pas du json")).toEqual([]);
  });
});
