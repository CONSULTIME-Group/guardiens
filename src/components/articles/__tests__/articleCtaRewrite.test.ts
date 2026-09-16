import { describe, it, expect } from "vitest";
import { rewriteMemberHref, rewriteMemberLinksInHtml } from "../ArticleRenderer";

describe("rewriteMemberHref", () => {
  it("passe par l'inscription pour les routes réservées aux membres", () => {
    expect(rewriteMemberHref("/projets/publier")).toBe(
      "/inscription?redirect=%2Fprojets%2Fpublier",
    );
    expect(rewriteMemberHref("/petites-missions/creer")).toBe(
      "/inscription?redirect=%2Fpetites-missions%2Fcreer",
    );
    expect(rewriteMemberHref("/sits/create")).toBe("/inscription?redirect=%2Fsits%2Fcreate");
    expect(rewriteMemberHref("/dashboard")).toBe("/inscription?redirect=%2Fdashboard");
  });

  it("laisse intactes les routes publiques", () => {
    expect(rewriteMemberHref("/projets")).toBe("/projets");
    expect(rewriteMemberHref("/petites-missions")).toBe("/petites-missions");
    expect(rewriteMemberHref("/inscription?redirect=/projets")).toBe(
      "/inscription?redirect=/projets",
    );
    expect(rewriteMemberHref("https://exemple.fr/projets/publier")).toBe(
      "https://exemple.fr/projets/publier",
    );
  });

  it("conserve la requête et l'ancre de la cible", () => {
    expect(rewriteMemberHref("/projets/publier?src=article")).toBe(
      "/inscription?redirect=%2Fprojets%2Fpublier%3Fsrc%3Darticle",
    );
  });

  it("réécrit les liens internes du contenu", () => {
    const html = '<p><a href="/projets/publier">Publier</a> et <a href="/projets">Voir</a></p>';
    expect(rewriteMemberLinksInHtml(html)).toBe(
      '<p><a href="/inscription?redirect=%2Fprojets%2Fpublier">Publier</a> et <a href="/projets">Voir</a></p>',
    );
  });
});
