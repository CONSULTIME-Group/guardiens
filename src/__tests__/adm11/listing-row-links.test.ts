import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { listingLiveUrl } from "@/lib/admin/listingRowLinks";

const page = readFileSync("src/pages/admin/AdminListings.tsx", "utf8");

describe("lot ADM11 : couverture et version en ligne en un clic sur la ligne", () => {
  it("la version en ligne vise la page publique pour les statuts servis aux visiteurs", () => {
    for (const status of ["published", "confirmed", "in_progress", "completed", "archived"]) {
      expect(listingLiveUrl({ id: "abc", status })).toBe("/annonces/abc");
    }
    for (const status of ["draft", "cancelled", "expired", null]) {
      expect(listingLiveUrl({ id: "abc", status })).toBeNull();
    }
  });

  it("lot ANN-6 : sur ordinateur, les deux gestes vivent dans le groupe « Voir » du menu, sur les cartes ils restent des boutons", () => {
    expect(page).toContain('data-testid="menu-cover-picker"');
    expect(page).toContain('data-testid="menu-live-link"');
    expect(page).toContain('data-testid="row-cover-picker"');
    expect(page).toContain('data-testid="row-live-link"');
    expect(page).toContain('target="_blank"');
    const menu = page.slice(page.indexOf("<DropdownMenuContent"), page.indexOf("</DropdownMenuContent>"));
    expect(menu).toContain("Photo de couverture");
    expect(menu).toContain("Voir la version en ligne");
    // dans le menu, avant le groupe « Partager »
    expect(menu.indexOf("Photo de couverture")).toBeLessThan(menu.indexOf("Partager"));
  });

  it("les boutons de la ligne ne sont rendus que pour la version carte", () => {
    const rowActions = page.slice(page.indexOf("const rowActions"), page.indexOf("const rowMenu"));
    expect(rowActions).toContain("{card && (<>");
    expect(rowActions.indexOf('data-testid="row-cover-picker"')).toBeGreaterThan(rowActions.indexOf("{card && (<>"));
  });
});
