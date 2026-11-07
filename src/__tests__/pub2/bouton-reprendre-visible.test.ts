// Lot PUB2 : « Reprendre mon brouillon » existe réellement sur Mes annonces.
// Le bouton collant MobileStickyCTA ne rend rien depuis la barre basse : le
// lot PUB1 y branchait ce bouton, il n'apparaissait jamais.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sits = readFileSync("src/pages/Sits.tsx", "utf8");

describe("bouton de reprise sur Mes annonces", () => {
  it("est rendu dans l'en-tête de la page, relié à ownerCreateCta", () => {
    expect(sits).toContain('data-testid="sits-resume-draft"');
    expect(sits).toMatch(/to=\{ownerCreateCta\(sits\)\.to\}/);
  });

  it("ne passe plus par le bouton collant désactivé", () => {
    expect(sits).not.toContain("<MobileStickyCTA");
  });
});
