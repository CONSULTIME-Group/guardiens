import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  isSitterProfileIndexable,
  MIN_SITTER_BIO_LENGTH,
} from "@/lib/sitterProfileIndexability";

/**
 * Garde anti-divergence : la règle d'indexabilité des fiches gardien doit
 * rester définie à un seul endroit (src/lib/sitterProfileIndexability.js).
 * Le composant React et le générateur de sitemap doivent l'importer, jamais la
 * réimplémenter. Une divergence entre les deux redonnerait le bug du
 * 12/08/2026 : des URLs déclarées au sitemap alors que la page rend un noindex.
 */

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

describe("règle d'indexabilité des fiches gardien : source unique", () => {
  it("le composant importe la règle partagée et ne la réimplémente pas", () => {
    const src = read("src/pages/PublicSitterProfile.tsx");
    expect(src).toContain('from "@/lib/sitterProfileIndexability"');
    expect(src).toContain("isSitterProfileIndexable(");
    expect(src).toContain("const shouldNoindex = !isRichProfile");
    // Aucun seuil ni critère recopié en dur dans la page.
    expect(src).not.toMatch(/length\s*>=\s*80/);
    expect(src).not.toMatch(/const shouldNoindex = true/);
  });

  it("le générateur de sitemap importe la même règle", () => {
    const src = read("scripts/generate-sitemap.mjs");
    expect(src).toContain("sitterProfileIndexability.js");
    expect(src).toContain("isSitterProfileIndexable(");
    expect(src).not.toMatch(/bio\.length\s*>\s*50/);
  });

  it("aucun Disallow sur /gardiens", () => {
    expect(read("public/robots.txt")).not.toMatch(/Disallow:\s*\/gardiens/);
    expect(read("scripts/generate-robots.mjs")).not.toMatch(/"Disallow: \/gardiens/);
    expect(read("src/data/siteRoutes.ts")).not.toMatch(/privateDisallowPaths[\s\S]*?\/gardiens[\s\S]*?\]/);
  });

  it("la règle : bio substantielle ET signal de confiance", () => {
    expect(MIN_SITTER_BIO_LENGTH).toBe(80);
    const longBio = "a".repeat(80);
    expect(isSitterProfileIndexable({ bio: longBio, identityVerified: true })).toBe(true);
    expect(isSitterProfileIndexable({ bio: longBio, galleryCount: 1 })).toBe(true);
    expect(isSitterProfileIndexable({ bio: longBio, galleryCount: 0 })).toBe(false);
    expect(isSitterProfileIndexable({ bio: "a".repeat(79), identityVerified: true })).toBe(false);
    expect(isSitterProfileIndexable({ motivation: longBio, identityVerified: true })).toBe(true);
    expect(isSitterProfileIndexable({})).toBe(false);
  });
});
