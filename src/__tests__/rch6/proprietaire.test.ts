import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ownerPublishHref } from "@/lib/almaVisitorSearch";
import { readPublishVia } from "@/lib/formPrefill";

const read = (p: string) => readFileSync(p, "utf8");

describe("RCH6 · du côté du propriétaire", () => {
  it("« Publier ma garde » garde son origine, visiteur compris", () => {
    expect(ownerPublishHref(false, "recherche_gardiens")).toBe("/sits/create?via=recherche_gardiens");
    const visitor = new URL(ownerPublishHref(true, "annonces"), "https://guardiens.fr");
    expect(visitor.pathname).toBe("/inscription");
    expect(visitor.searchParams.get("role")).toBe("owner");
    expect(visitor.searchParams.get("redirect")).toBe("/sits/create?via=annonces");
    expect(readPublishVia(new URLSearchParams("via=recherche_gardiens"))).toBe("recherche_gardiens");
    expect(readPublishVia(new URLSearchParams("via=annonces"))).toBe("annonces");
    expect(readPublishVia(new URLSearchParams("via=autre"))).toBeNull();
  });

  it("barre de /recherche-gardiens", () => {
    const src = read("src/components/search/SearchOwner.tsx");
    expect(src).toContain("à proximité de {city}, à moins de {radius[0]} km.");
    expect(src).toContain("Votre annonce part par email aux gardiens proches de chez vous.");
    expect(src).toContain('ownerPublishHref(!user, "recherche_gardiens")');
  });

  it("ligne propriétaire de /annonces, visiteur seulement", () => {
    const src = read("src/components/search/SearchSitter.tsx");
    expect(src).toContain("const ownerLine = isVisitor ? (");
    expect(src).toContain("Vous partez bientôt ? Votre annonce part par email aux gardiens proches de chez vous.");
    expect(src).toContain("`/recherche-gardiens?ville=${encodeURIComponent(city)}`");
  });
});
