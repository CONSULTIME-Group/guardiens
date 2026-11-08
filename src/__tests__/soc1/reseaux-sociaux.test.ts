/**
 * Lot SOC1 (08/11/2026) : liens vers les pages officielles Facebook, Instagram
 * et LinkedIn sur la page contact et dans le sameAs de l'accueil.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SOCIAL_LINKS } from "@/data/socialLinks";

describe("pages officielles de Guardiens", () => {
  it("trois liens, dans l'ordre Facebook, Instagram, LinkedIn", () => {
    expect(SOCIAL_LINKS.map((s) => s.url)).toEqual([
      "https://www.facebook.com/profile.php?id=61592310607948",
      "https://www.instagram.com/guardiens_fr/",
      "https://www.linkedin.com/company/guardiens/",
    ]);
  });
  it("la page contact les affiche en liens cliquables ouverts dans un nouvel onglet", () => {
    const src = readFileSync("src/pages/Contact.tsx", "utf8");
    expect(src).toContain("SOCIAL_LINKS.map");
    expect(src).toMatch(/href=\{s\.url\}/);
    expect(src).toMatch(/target="_blank"/);
    expect(src).toMatch(/rel="noopener noreferrer me"/);
  });
  it("le balisage Organization de l'accueil les déclare en sameAs", () => {
    const src = readFileSync("src/components/landing/HomeJsonLd.tsx", "utf8");
    expect(src).toContain("...SOCIAL_LINKS.map((s) => s.url)");
  });
});
