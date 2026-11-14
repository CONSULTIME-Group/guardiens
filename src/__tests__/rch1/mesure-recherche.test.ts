import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { viewFromState } from "@/lib/sitViewSource";

const read = (p: string) => readFileSync(p, "utf8");

describe("RCH1 · mesure de la recherche", () => {
  it("un changement de paramètres sur le même chemin est marqué kind filter", () => {
    const src = read("src/components/analytics/PageViewTracker.tsx");
    expect(src).toContain("const sameAsPrevious = lastPath.current === path;");
    expect(src).toContain('...(sameAsPrevious ? { kind: "filter" } : {}),');
  });

  it("l'impression hors zone suit la même règle que l'affichage du bandeau", () => {
    const src = read("src/components/search/SearchSitter.tsx");
    expect(src).toContain("const outOfZoneShown = nearestShown.length === 0");
    expect(src).toContain("if (!outOfZoneShown || deptCountsPending) return;");
    expect(src).toContain("const showOutOfZone = outOfZoneShown;");
  });

  it("la bulle d'Alma de recherche vide compte une impression par montage", () => {
    const src = read("src/components/ai/alma/AlmaEmptySearchBubble.tsx");
    expect(src).toContain("if (seenTrackedRef.current) return;");
  });

  it("la carte de la recherche transmet sa provenance jusqu'à sit_view", () => {
    expect(read("src/components/search/listing/SearchListingCard.tsx")).toContain('state={{ from: "search" }}');
    const pub = read("src/pages/PublicSitDetail.tsx");
    expect(pub).toContain("{ replace: true, state: location.state }");
    expect(pub).toContain("from: viewFromState(location.state),");
    expect(read("src/pages/SitDetail.tsx")).toContain("from: viewFromState(location.state)");
  });

  it("viewFromState ne garde que les provenances connues", () => {
    expect(viewFromState({ from: "search" })).toBe("search");
    expect(viewFromState({ from: "autre" })).toBeNull();
    expect(viewFromState(null)).toBeNull();
    expect(viewFromState("search")).toBeNull();
  });
});
