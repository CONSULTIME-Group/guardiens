import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/pages/Landing.tsx", "utf8");
const faqSource = readFileSync("src/components/landing/FaqSection.tsx", "utf8");
const jsonLdSource = readFileSync("src/components/landing/HomeJsonLd.tsx", "utf8");
const comparisonSource = readFileSync("src/components/landing/ComparatifSection.tsx", "utf8");

describe("structure H1 de la home", () => {
  it("suit l'ordre éditorial validé", () => {
    const names = ["LiveListingsStrip", "LandingTocBar", "HowItWorksSection", "ServiceAfterServiceSection", "ConfianceSection", "LivedItSection", "UsagesSection", "FaqSection", "FinalCtaSection"];
    const positions = names.map((name) => source.indexOf(`<${name}`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("retire les témoignages écrits à la main", () => {
    expect(source).not.toContain("TestimonialsSection");
    expect(source).not.toContain("homeTestimonials");
  });

  it("retire les blocs condensés ou déplacés", () => {
    expect(source).not.toContain("<QuickHelpSection");
    expect(source).not.toContain("<MidJourneyCta");
    expect(source).not.toContain("<LazyAroundYouSection");
    expect(source).not.toContain("<NotreHistoireSection");
    expect(source).not.toContain("<InternationalStrip");
    expect(source).not.toContain("<ComparatifSection");
  });

  it("garde neuf questions alignées, dont trois dans un accordéon monté", () => {
    expect(faqSource).toContain('const featuredKeys = new Set(["q1", "q2", "q3", "q5", "q8", "q9"])');
    expect(faqSource).toContain("<AccordionContent forceMount");
    expect(jsonLdSource).toContain("const faqNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]");
  });

  it("garde le comparatif monté quand son accordéon est replié", () => {
    expect(comparisonSource).toContain("<AccordionContent forceMount");
  });
});