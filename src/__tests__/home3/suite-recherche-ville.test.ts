/**
 * Lot RECH1 (13/11/2026) : la recherche de ville de la home mène aux gardes
 * autour de la ville, et la page des annonces montre les gardes ouvertes les
 * plus proches avant les annonces terminées quand la zone est vide.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { cityTitleCase } from "@/components/landing/HomeProximitySearch";

const home = readFileSync("src/components/landing/HomeProximitySearch.tsx", "utf8");
const search = readFileSync("src/components/search/SearchSitter.tsx", "utf8");

describe("suite de la recherche de ville", () => {
  it("le résultat de ville porte un lien vers les annonces de cette ville", () => {
    expect(home).toContain("to={`/annonces?ville=${encodeURIComponent(searched)}`}");
    expect(home).toContain('trackEvent("home_city_listings_clicked"');
    expect(home).toContain("min-h-11");
  });

  it("lot RCH3 : aucune annonce terminée n'est rendue, les plus proches ouvertes restent", () => {
    expect(search).toContain("<NearestOutsideSection");
    expect(search).not.toContain('data-testid="past-after-nearest"');
    expect(search).toContain("let final = applySitClientFilters(rawResults).filter((s: any) => !isInactiveSit(s));");
  });

  it("écrit le nom de la ville proprement, dans le lien comme dans l'adresse", () => {
    expect(cityTitleCase("rennes")).toBe("Rennes");
    expect(cityTitleCase("saint-malo")).toBe("Saint-Malo");
    expect(cityTitleCase("  l'isle-adam ")).toBe("L'Isle-Adam");
    expect(cityTitleCase("AIX en  provence")).toBe("Aix en Provence");
    expect(cityTitleCase("saint-cyr-au-mont-d'or")).toBe("Saint-Cyr-au-Mont-d'Or");
    expect(cityTitleCase("la rochelle")).toBe("La Rochelle");
  });
});
