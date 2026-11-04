/**
 * Lot perf 17 (04/11/2026) : /guides/:id. Mesure réelle (analytics_events, web_vital,
 * mobile et tablette, 28 jours) : le bloc « L'essentiel », construit depuis les lieux,
 * s'insérait au-dessus de la barre de recherche à l'arrivée des lieux et poussait tout
 * le contenu (CLS 0,10 à 0,33 sur le conteneur max-w-5xl). Le contenu dépendant des
 * lieux arrive d'un seul bloc, une réserve de hauteur tient sa place avant.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/pages/GuideDetail.tsx", "utf8");

describe("perf 17, /guides/:id", () => {
  it("réserve de hauteur tant que les lieux ne sont pas chargés", () => {
    expect(src).toContain("{!placesLoaded ? (");
    expect(src).toContain('data-testid="guide-places-placeholder"');
    expect(src).toContain("min-h-[120vh]");
  });

  it("l'essentiel, la barre de recherche et les catégories sont dans le bloc chargé", () => {
    const start = src.indexOf("{!placesLoaded ? (");
    const end = src.indexOf("{/* Schema.org");
    const block = src.slice(start, end);
    for (const k of ["essentials.length > 0", "guide_detail.search_placeholder", "categories.map", "<GuideMapLazy"]) {
      expect(block, k).toContain(k);
    }
  });

  it("JSON-LD hors du bloc de réserve (inchangé pour les robots)", () => {
    expect(src.indexOf("placesSchema && (")).toBeGreaterThan(src.indexOf("{/* Schema.org"));
  });
});
