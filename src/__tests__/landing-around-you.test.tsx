import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AroundYouSection, { projectHelperPoint } from "@/components/landing/AroundYouSection";
import { MemoryRouter } from "react-router-dom";

describe("Lot E6 partie 4, bloc home Autour de vous", () => {
  it("affiche le sous-titre validé et les deux boutons", () => {
    const html = renderToStaticMarkup(
    <MemoryRouter>
      <AroundYouSection />
    </MemoryRouter>,
  );
    expect(html).toContain("Arroser un jardin, nourrir un chat, changer une ampoule : demandez, les gens du coin répondent.");
    expect(html).toContain("/petites-missions/creer");
    expect(html).toContain("/petites-missions");
  });

  it("affiche un titre affirmatif sans chiffre tant que le compteur n'est pas chargé", () => {
    const html = renderToStaticMarkup(
    <MemoryRouter>
      <AroundYouSection />
    </MemoryRouter>,
  );
    expect(html).toContain("Des personnes prêtes à donner un coup de main sur Guardiens");
    expect(html).not.toContain("null");
  });

  it("projette des coordonnées réelles à l'intérieur du viewBox", () => {
    for (const [lat, lng] of [[45.75, 4.85], [48.85, 2.35], [43.6, 1.44], [48.1, -1.68]]) {
      const [x, y] = projectHelperPoint(lat, lng);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(360);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(360);
    }
  });

  it("ne contient aucun tiret cadratin ni demi-cadratin", () => {
    const html = renderToStaticMarkup(
    <MemoryRouter>
      <AroundYouSection />
    </MemoryRouter>,
  );
    expect(html).not.toContain("\u2014");
    expect(html).not.toContain("\u2013");
  });
});
