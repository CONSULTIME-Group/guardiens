import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Garde-fou : un lien mort dans un email est invisible côté serveur.
 *
 * Tous les `href` produits par les modules partagés de complétion
 * (`completion-steps`, `missing-opportunities`) doivent pointer vers une
 * route réellement déclarée dans `App.tsx`, avec une clé `section` réellement
 * acceptée par `SECTION_PARAM_MAP` de `SitterProfile.tsx`.
 */
const read = (p: string) => readFileSync(resolve(__dirname, p), "utf-8");

const appSrc = read("../App.tsx");
const profileSrc = read("../pages/SitterProfile.tsx");

const declaredRoutes = new Set<string>(
  [...appSrc.matchAll(/path="([^"]+)"/g)].map((m) => m[1]),
);

const mapBlock = profileSrc.match(
  /const SECTION_PARAM_MAP: Record<string, string> = \{([\s\S]*?)\};/,
);
const acceptedSections = new Set<string>(
  [...(mapBlock?.[1] ?? "").matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]),
);

const collectHrefs = (src: string): string[] => [
  ...[...src.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]),
  ...[...src.matchAll(/href:\s*`([^`]+)`/g)].map((m) => m[1]),
];

const sources: Array<[string, string]> = [
  ["completion-steps", read("../../supabase/functions/_shared/completion-steps/index.ts")],
  [
    "missing-opportunities",
    read("../../supabase/functions/_shared/missing-opportunities/index.ts"),
  ],
];

describe("liens de complétion (emails et dashboard)", () => {
  it("SECTION_PARAM_MAP est lisible et non vide", () => {
    expect(acceptedSections.size).toBeGreaterThan(0);
    expect(declaredRoutes.has("/profile")).toBe(true);
  });

  for (const [name, src] of sources) {
    const hrefs = collectHrefs(src);

    it(`${name} produit au moins un href`, () => {
      expect(hrefs.length).toBeGreaterThan(0);
    });

    it.each(hrefs)(`${name} : %s pointe vers une route et une section valides`, (href) => {
      const [path, query = ""] = href.split("?");
      expect(
        declaredRoutes.has(path),
        `Route "${path}" absente de App.tsx (href "${href}").`,
      ).toBe(true);

      const section = query.match(/section=([^&]+)/)?.[1];
      if (section && !section.startsWith("$") && !section.startsWith("{")) {
        expect(
          acceptedSections.has(section),
          `Section "${section}" refusée par SECTION_PARAM_MAP (href "${href}").`,
        ).toBe(true);
      }
    });
  }

  it("les sections du module missing-opportunities sont toutes acceptées", () => {
    const src = sources[1][1];
    const declared = [...src.matchAll(/section:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);
    for (const s of declared) {
      expect(acceptedSections.has(s), `Section "${s}" refusée par SECTION_PARAM_MAP.`).toBe(true);
    }
  });
});
