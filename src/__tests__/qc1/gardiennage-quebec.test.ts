/**
 * Lot QC1 (14/10/2026) : page « Gardiennage de maison au Québec ».
 * Doctrine des textes (Y3), ponctuation, sources officielles, route,
 * plan du site et données structurées.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AVE_URL,
  DIPLOMATIE_URL,
  QUEBEC_DESCRIPTION,
  QUEBEC_FAQ,
  QUEBEC_H1,
  QUEBEC_INTRO,
  QUEBEC_PATH,
  QUEBEC_SECTIONS,
  QUEBEC_TITLE,
  quebecJsonLd,
} from "@/lib/quebecPage";
import { staticRoutes as SITE_ROUTES } from "@/data/siteRoutes";

const allText = [
  QUEBEC_TITLE,
  QUEBEC_DESCRIPTION,
  QUEBEC_H1,
  QUEBEC_INTRO,
  ...QUEBEC_SECTIONS.flatMap((s) => [s.title, ...s.paragraphs, ...(s.steps ?? [])]),
  ...QUEBEC_FAQ.flatMap((f) => [f.question, f.answer]),
].join("\n");

describe("QC1, textes", () => {
  it("doctrine : gratuité dite simplement, rencontre facultative, aucun mot proscrit", () => {
    expect(allText).toContain("Guardiens est gratuit");
    expect(allText).toMatch(/si vous le souhaitez/);
    expect(allText).not.toMatch(/sans engagement|offert|gratuit pour vous|0 €|voisin|pension|pet-sitter|obligatoire/i);
  });

  it("ponctuation : aucun tiret cadratin ou demi-cadratin", () => {
    expect(allText).not.toMatch(/[–—]/);
  });

  it("vocabulaire du Québec présent", () => {
    expect(allText).toMatch(/gardiennage de maison/i);
    expect(allText).toMatch(/garde d'animaux à domicile/i);
  });

  it("faits de voyage : chiffres et sources officielles", () => {
    expect(allText).toContain("7 $ CA");
    expect(allText).toContain("moins de six mois");
    expect(AVE_URL).toMatch(/^https:\/\/www\.canada\.ca\/fr\//);
    expect(DIPLOMATIE_URL).toMatch(/^https:\/\/www\.diplomatie\.gouv\.fr\//);
  });
});

describe("QC1, page et référencement", () => {
  it("route déclarée et page dans le plan du site", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toContain(`path="${QUEBEC_PATH}"`);
    const route = SITE_ROUTES.find((r) => r.path === QUEBEC_PATH);
    expect(route?.h1).toBe(QUEBEC_H1);
    expect(route?.index ?? true).toBe(true);
  });

  it("données structurées : page sur le Québec et FAQ alignée sur l'affichage", () => {
    const [page, faq] = quebecJsonLd() as any[];
    expect(page.about.address.addressCountry).toBe("CA");
    expect(faq["@type"]).toBe("FAQPage");
    expect(faq.mainEntity.map((q: any) => q.name)).toEqual(QUEBEC_FAQ.map((f) => f.question));
  });

  it("maillage : liens depuis le hub house-sitting, les annonces du Canada et llms.txt", () => {
    expect(readFileSync("src/pages/HouseSittingHub.tsx", "utf8")).toContain(QUEBEC_PATH);
    expect(readFileSync("src/pages/InternationalListings.tsx", "utf8")).toContain(QUEBEC_PATH);
    expect(readFileSync("public/llms.txt", "utf8")).toContain(QUEBEC_PATH);
  });
});
