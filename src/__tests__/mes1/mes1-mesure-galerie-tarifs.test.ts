// Lot MES1 (21/11/2026) : mesure des étapes de « Publier une annonce »,
// galerie gardien jamais lue sans session sur /recherche-gardiens, titre de
// /tarifs sans durée de la gratuité.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("MES1 (1) étapes de « Publier une annonce »", () => {
  const src = read("src/pages/CreateSit.tsx");

  it("étape commencée et étape terminée portent le parcours (par étapes ou express)", () => {
    expect(src).toMatch(/stepFlowRef\.current = expressActiveRef\.current \? "express" : "steps"/);
    expect(src).toMatch(/"sits_create_step_started", \{ metadata: \{ step, is_backward: isBackward, flow: stepFlowRef\.current \} \}/);
    expect(src).toMatch(/"sits_create_step_completed", \{\s*metadata: \{ step, duration_ms: Date\.now\(\) - stepStartedAtRef\.current, flow: stepFlowRef\.current \}/);
  });

  it("passer à l'étape suivante termine l'étape quittée", () => {
    expect(src).toMatch(/if \(currentStepRef\.current <= step\) return;\s*trackStepCompleted\(step\);/);
  });

  it("une publication réussie termine l'étape affichée, puis émet sit_publish_succeeded", () => {
    const i = src.indexOf("publishedRef.current = true;\n      trackStepCompleted(currentStepRef.current);");
    const j = src.indexOf('await trackEvent("sit_publish_succeeded"');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
  });
});

describe("MES1 (1 bis) sit_publish_succeeded sur chaque mise en ligne par le propriétaire", () => {
  it.each([
    ["src/components/sits/views/OwnerSitView.tsx", "owner_sit_view"],
    ["src/pages/Sits.tsx", "sits_list_republish"],
  ])("%s", (f, source) => {
    const src = read(f);
    expect(src).toMatch(new RegExp(`"sit_publish_succeeded", \\{\\s*source: "${source}"`));
  });
});

describe("MES1 (2) galerie gardien sans session", () => {
  const src = read("src/components/search/SearchOwner.tsx");
  it("aucune lecture de sitter_gallery sans session", () => {
    expect(src).toContain("const galleryChunks = viewerSession ? idChunks : [];");
    expect(src).toMatch(/galleryChunks\.map\(\(ids\) => supabase\.from\("sitter_gallery"\)/);
    expect(src).not.toMatch(/idChunks\.map\(\(ids\) => supabase\.from\("sitter_gallery"\)/);
  });
});

describe("MES1 (3) titre de /tarifs", () => {
  const files = ["src/pages/Pricing.tsx", "src/data/siteRoutes.ts"];
  it.each(files)("%s : titre et description sans durée", (f) => {
    const src = read(f);
    expect(src).toContain("Tarifs : Guardiens est gratuit | Guardiens");
    expect(src).toContain("Guardiens est gratuit, pour les propriétaires comme pour les gardiens : publier une annonce, postuler, échanger et s'entraider.");
    expect(src).not.toContain("pourquoi, et demain");
  });
  it("aucun tiret cadratin ni demi-cadratin dans les fichiers du lot", () => {
    for (const f of [...files, "src/pages/CreateSit.tsx", "src/components/search/SearchOwner.tsx", "src/__tests__/mes1/mes1-mesure-galerie-tarifs.test.ts"]) {
      const src = read(f);
      expect(src.includes("\u2014"), f).toBe(false);
    }
  });
});
