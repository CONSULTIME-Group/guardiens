import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");
const start = src.indexOf("ONGLET GARDIEN, fiche allégée (lot F1)");
const end = src.indexOf("ONGLET PROPRIO, flux narratif");
const gardien = src.slice(start, end);
const sections = readFileSync("src/components/profile/sitter/SitterF1Sections.tsx", "utf8");

describe("onglet gardien allégé", () => {
  it("ne rend plus StoryTiles, CommunityPulseCard, TrustStory ni PracticalGrid", () => {
    expect(start).toBeGreaterThan(0);
    for (const c of ["<StoryTiles", "<CommunityPulseCard", "<TrustStory", "<PracticalGrid"]) {
      expect(gardien).not.toContain(c);
    }
  });
  it("contient la carte contact et les étapes", () => {
    expect(gardien).toContain("<SitterContactCard");
    expect(gardien).toContain("<HowItWorksSteps");
    expect(sections).toContain("Faire garder avec");
    expect(sections).toContain("Comment ça se passe");
  });
  it("ancres de confiance posées sur le bloc parcours", () => {
    expect(gardien).toContain('journeyBlock(mobile ? "confiance-mobile" : "confiance")');
  });
  it("textes sans tiret cadratin ni demi-cadratin", () => {
    expect(sections).not.toMatch(/[\u2014\u2013]/);
  });
});

describe("gouache du hero partagé entière (lots F1c, L5)", () => {
  const heroSrc = readFileSync("src/components/profile/ProfileHero.tsx", "utf8");
  const hs = heroSrc.indexOf("data-hero-gouache");
  const frame = heroSrc.slice(hs, heroSrc.indexOf("</div>", hs));
  const img = frame.slice(frame.indexOf("<img"), frame.indexOf("/>", frame.indexOf("<img")));
  it("image en object-contain, sans opacité ni recadrage", () => {
    expect(img).toContain("object-contain");
    expect(img).not.toMatch(/opacity-/);
    expect(img).not.toContain("object-cover");
  });
  it("aucun voile en dégradé superposé", () => {
    expect(frame).not.toMatch(/linear-gradient|mask-image|maskImage/);
  });
  it("conteneur au ratio 1536/544", () => {
    expect(heroSrc).toContain("[aspect-ratio:1536/544]");
  });
});
