// Lot SORT9 (13/11/2026) : « Publier » propose la garde, le coup de main et la sortie.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PUBLISH_COPY, PUBLISH_PATH, publishChoices } from "@/lib/publishChoices";
import { bottomNavFab, isFabHidden } from "@/lib/bottomNavFab";

const read = (p: string) => readFileSync(p, "utf8");

describe("les trois choix", () => {
  it("espace propriétaire : la garde en tête", () => {
    expect(publishChoices("owner", true).map((c) => c.kind)).toEqual(["garde", "coup_de_main", "sortie"]);
  });
  it("espace gardien : le coup de main en tête, la garde reste proposée", () => {
    expect(publishChoices("sitter", true).map((c) => c.kind)).toEqual(["coup_de_main", "sortie", "garde"]);
  });
  it("chaque choix mène à son formulaire", () => {
    expect(Object.fromEntries(publishChoices("owner", true).map((c) => [c.kind, c.to]))).toEqual({
      garde: "/sits/create",
      coup_de_main: "/petites-missions/creer",
      sortie: "/sorties/proposer",
    });
  });
  it("rubrique fermée : deux choix", () => {
    expect(publishChoices("owner", false).map((c) => c.kind)).toEqual(["garde", "coup_de_main"]);
  });
  it("textes affirmatifs, sans tiret long", () => {
    const all = [...Object.values(PUBLISH_COPY), ...publishChoices("owner", true).flatMap((c) => [c.eyebrow, c.title, c.text])].join(" ");
    expect(all).not.toMatch(/\b(pas|jamais|aucun|aucune|rien|voisins?)\b/i);
    expect(all).not.toMatch(/[—–]/);
    expect(PUBLISH_COPY.intro).toContain("Guardiens est gratuit.");
  });
});

describe("entrées", () => {
  it("le bouton du menu mène au choix dans les deux espaces", () => {
    const nav = read("src/components/layout/Navigation.tsx");
    expect(nav).toContain("navigate(PUBLISH_PATH)");
    expect(nav).not.toContain('"Publier une annonce"');
    expect(PUBLISH_PATH).toBe("/publier");
  });
  it("téléphone : « Publier » du propriétaire mène au choix, le gardien garde ses disponibilités", () => {
    expect(bottomNavFab("/dashboard", true).to).toBe("/publier");
    expect(bottomNavFab("/dashboard", false).label).toBe("Dispo");
    expect(bottomNavFab("/sorties", true).to).toBe("/sorties/proposer");
    expect(bottomNavFab("/petites-missions", false).to).toBe("/petites-missions/creer");
    expect(isFabHidden("/publier")).toBe(true);
  });
  it("route protégée", () => {
    expect(read("src/App.tsx")).toContain('<Route path="/publier" element={<ProtectedRoute><Publier /></ProtectedRoute>} />');
  });
});
