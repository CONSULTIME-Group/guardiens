/**
 * Corrections issues du rapport « Indexation des pages » de la Search Console
 * (26/10/2026) :
 * - une fiche de race fusionnée vers une cible absente de la base reste
 *   affichée, listée et indexée (« gris du gabon » finissait en 404) ;
 * - une adresse département accentuée mène au slug sans accent ;
 * - une ville retirée peut rediriger vers un chemin complet (page département) ;
 * - l'ancien article « gardes-longue-duree-guide » passe par la table
 *   redirects (vrai 301 déclaré au pré-rendu) au lieu d'un renvoi vers /actualites.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { liveMergedBreedTarget, mergedBreedTarget } from "@/lib/breedFicheMerges";
import { visibleBreeds } from "@/lib/breedsListingModel";
import { asciiSlug } from "@/lib/asciiSlug";

const read = (p: string) => readFileSync(p, "utf8");

describe("fiches de race fusionnées", () => {
  it("la fusion déclarée reste lisible", () => {
    expect(mergedBreedTarget("bird", "gris du gabon")).toBe("perroquet gris du gabon");
  });
  it("cible absente : la source reste la fiche servie", () => {
    const rows = [{ species: "bird", breed: "gris du gabon" }];
    expect(liveMergedBreedTarget("bird", "gris du gabon", rows)).toBeNull();
    expect(visibleBreeds(rows).map((r) => r.breed)).toEqual(["gris du gabon"]);
  });
  it("cible présente : la redirection et le retrait de la liste tiennent", () => {
    const rows = [
      { species: "bird", breed: "gris du gabon" },
      { species: "bird", breed: "perroquet gris du gabon" },
    ];
    expect(liveMergedBreedTarget("bird", "gris du gabon", rows)).toBe("perroquet gris du gabon");
    expect(visibleBreeds(rows).map((r) => r.breed)).toEqual(["perroquet gris du gabon"]);
  });
  it("la page, le sitemap et la liste lisent la même règle", () => {
    expect(read("src/pages/BreedPage.tsx")).toContain("liveMergedBreedTarget(match.species, match.breed, data as BreedProfile[])");
    expect(read("supabase/functions/_shared/sitemap-data.js")).toContain("liveMergedBreedTarget(bp.species, bp.breed, rows)");
  });
});

describe("adresses de pages locales", () => {
  it("slug sans accent", () => {
    expect(asciiSlug("isère")).toBe("isere");
    expect(asciiSlug("Rhône")).toBe("rhone");
    expect(asciiSlug("Côtes-d'Armor")).toBe("cotes-d-armor");
  });
  it("la page département rattrape un slug accentué", () => {
    const page = read("src/pages/DepartmentPage.tsx");
    expect(page).toContain("const plain = asciiSlug(slug!);");
  });
  it("une ville retirée peut mener à un chemin complet", () => {
    const page = read("src/pages/CityPage.tsx");
    expect(page).toContain('const target = cityRedirect.startsWith("/") ? cityRedirect : `/house-sitting/${cityRedirect}`;');
    expect(page).toContain('if (current.startsWith("/")) break;');
  });
  it("l'ancien article passe par la table redirects", () => {
    expect(read("src/App.tsx")).not.toContain("gardes-longue-duree-guide");
  });
});
