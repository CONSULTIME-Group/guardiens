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

  it("les deux gestes vivent sur la ligne, hors du menu déroulant", () => {
    expect(page).toContain('data-testid="row-cover-picker"');
    expect(page).toContain('data-testid="row-live-link"');
    expect(page).toContain('target="_blank"');
    const menu = page.slice(page.indexOf("<DropdownMenuContent"), page.indexOf("</DropdownMenuContent>"));
    expect(menu).not.toContain("Photo de couverture");
    expect(menu).not.toContain("setCoverListing");
  });

  it("les boutons précèdent le menu « Autres actions »", () => {
    expect(page.indexOf('data-testid="row-cover-picker"')).toBeLessThan(page.indexOf('aria-label="Autres actions"'));
  });
});
