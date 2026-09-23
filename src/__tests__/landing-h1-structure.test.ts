import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/pages/Landing.tsx", "utf8");

describe("structure H1 de la home", () => {
  it("suit l'ordre éditorial validé", () => {
    const names = ["LiveListingsStrip", "LandingTocBar", "ServiceAfterServiceSection", "QuickHelpSection", "HowItWorksSection", "ConfianceSection", "MidJourneyCta", "LazyAroundYouSection", "UsagesSection", "NotreHistoireSection", "LivedItSection", "InternationalStrip", "ComparatifSection", "FaqSection", "FinalCtaSection"];
    const positions = names.map((name) => source.indexOf(`<${name}`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("retire les témoignages écrits à la main", () => {
    expect(source).not.toContain("TestimonialsSection");
    expect(source).not.toContain("homeTestimonials");
  });
});