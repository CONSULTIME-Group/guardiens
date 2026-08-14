import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Garde anti-régression, règle posée le 14/08/2026 :
 * dans le bloc `landing.hero` français, l'idée de proximité ne doit apparaître
 * qu'une seule fois, portée par `title_main`. Le hero est le sommaire du
 * produit : un emplacement porte une dimension, jamais deux fois la même.
 * (Emplacement déplacé le 14/08/2026 : la clé `brand_tagline` a été supprimée,
 * la proximité vit désormais dans le H1 via « du coin ».)
 *
 * La famille de motifs contrôlée : « du coin », « près de chez vous »,
 * « proches de chez vous » (casse ignorée).
 */

const HERO_PATH = path.resolve(process.cwd(), "src/i18n/locales/fr/common.json");

const PROXIMITY_MOTIFS = [/du coin/gi, /près de chez vous/gi, /proches de chez vous/gi];

const flatten = (obj: Record<string, unknown>, prefix = "", acc: Record<string, string> = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value as Record<string, unknown>, full, acc);
    } else if (typeof value === "string") {
      acc[full] = value;
    }
  }
  return acc;
};

describe("landing.hero, une seule mention de proximité", () => {
  const hero = flatten(
    (JSON.parse(fs.readFileSync(HERO_PATH, "utf8")) as any).landing.hero
  );

  it("la famille de motifs n'apparaît qu'une fois au total, dans title_main", () => {
    const hits: string[] = [];
    for (const [key, value] of Object.entries(hero)) {
      for (const motif of PROXIMITY_MOTIFS) {
        const matches = value.match(motif);
        if (matches) hits.push(...matches.map((m) => `${key}: «${m}»`));
      }
    }
    expect(
      hits,
      `la proximité doit être portée une seule fois, par title_main. Occurrences : ${hits.join(", ")}`
    ).toEqual([expect.stringMatching(/^title_main: /)]);
  });
});
