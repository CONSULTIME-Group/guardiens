import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { proximityEmptyText } from "@/lib/admin/proximityEmpty";
import { LISTING_FILTER_MENU, LISTING_FILTERS, LISTING_FILTER_LABELS } from "@/lib/admin/listingSituation";

const page = readFileSync("src/pages/admin/AdminListings.tsx", "utf8");
const menu = page.slice(page.indexOf("<DropdownMenuContent"), page.indexOf("</DropdownMenuContent>"));

describe("ANN-3, diffusion à zéro gardien : la fenêtre dit pourquoi", () => {
  it("aucun gardien dans le rayon", () => {
    expect(proximityEmptyText(0, 20)).toBe("Aucun gardien dans un rayon de 20 km. Élargissez le rayon pour toucher plus de monde.");
    expect(proximityEmptyText(undefined, 20)).toContain("Aucun gardien");
  });
  it("gardiens déjà prévenus", () => {
    expect(proximityEmptyText(2, 20)).toContain("Les 2 gardiens de ce rayon ont déjà reçu cette annonce");
    expect(proximityEmptyText(1, 20)).toContain("Le gardien de ce rayon a déjà reçu cette annonce");
  });
  it("les deux fenêtres de diffusion utilisent le texte", () => {
    for (const f of ["src/components/admin/ListingProximityCard.tsx", "src/components/admin/signals/BroadcastSitDialog.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src).toContain("proximityEmptyText(");
      expect(src).not.toContain("Aucun gardien éligible dans ce rayon.");
    }
  });
});

describe("ANN-3, actions rangées", () => {
  it("l'ancienne fenêtre de message est retirée, Écrire passe par le texte prérempli", () => {
    expect(page).not.toContain("messageModal");
    expect(page).not.toContain("handleSendMessage");
    expect(page).not.toContain("Message dans la messagerie");
    expect(page).toContain("writeOwner(listing)");
  });
  it("menu en trois groupes, sans X ni doublon de diffusion", () => {
    for (const label of [">Voir<", ">Partager<", ">Modérer<"]) expect(menu).toContain(label);
    expect(menu).not.toContain('"twitter"');
    expect(menu).toContain("!broadcastShown(listing, urg, st)");
    expect(menu).toContain("navigator.share");
  });
  it("le bouton de diffusion porte le même verbe que la vue d'ensemble", () => {
    expect(page).toContain("Diffuser l'annonce");
    expect(readFileSync("src/lib/admin/gestures.ts", "utf8")).toContain('actionLabel: "Diffuser l\'annonce"');
  });
});

describe("ANN-3, filtre ramené à 8 choix", () => {
  it("la liste déroulante propose 8 choix, les autres restent valides dans l'adresse", () => {
    expect(LISTING_FILTER_MENU).toHaveLength(8);
    for (const f of LISTING_FILTER_MENU) expect(LISTING_FILTERS).toContain(f);
    expect(LISTING_FILTER_LABELS.waiting_long).toBeTruthy();
    expect(page).toContain("LISTING_FILTER_MENU.map(");
    expect(page).toContain("!(LISTING_FILTER_MENU as readonly string[]).includes(filterStatus)");
  });
});

describe("ANN-5, cartes au téléphone", () => {
  it("le téléphone reçoit des cartes, l'ordinateur garde le tableau", () => {
    expect(page).toContain("useIsMobile()");
    expect(page).toContain('data-testid="listing-cards"');
    expect(page).toContain('data-testid="listing-card"');
    expect(page).toContain('rowActions(listing, urg, st, listingLiveUrl(listing), isAdminHidden, ownerFirst, "card")');
    expect(page).toContain("min-h-11");
  });
});
