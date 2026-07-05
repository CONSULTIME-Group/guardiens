import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Garde-fou éditorial (pivot pricing "gratuit sans deadline", 5 juillet 2026).
 *
 * La promesse publique est :
 *   « Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service. »
 *
 * Ce test bloque toute réintroduction d'une date de bascule tarifaire dans
 * les fichiers pivots (Pricing.tsx, MySubscription.tsx, Cgs.tsx, Observatoire,
 * index.html et public/llms.txt). Les autres surfaces (composants marketing
 * secondaires, articles) sont nettoyées progressivement et ne sont pas
 * verrouillées par ce test.
 */

const ROOT = path.resolve(__dirname, "../..");

const FILES = [
  "src/pages/Pricing.tsx",
  "src/pages/MySubscription.tsx",
  "src/pages/Cgs.tsx",
  "src/pages/Observatoire.tsx",
  "index.html",
  "public/llms.txt",
  "TODO-lovable.md",
];

const FORBIDDEN_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /1er\s+octobre\s+2026/i, reason: "Date de bascule '1er octobre 2026' retirée par le pivot pricing." },
  { pattern: /30\s+septembre\s+2026/i, reason: "Date de bascule '30 septembre 2026' retirée par le pivot pricing." },
  { pattern: /14\s+juillet\s+2026/i, reason: "Date '14 juillet 2026' retirée par le pivot pricing." },
  { pattern: /gratuit\s+jusqu[’']au/i, reason: "Formule 'gratuit jusqu'au ...' interdite : la gratuité n'a pas de date de fin fixée." },
];

describe("Pivot pricing 'gratuit sans deadline' — pages pivots verrouillées", () => {
  for (const file of FILES) {
    for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
      it(`${file} ne contient pas /${pattern.source}/`, () => {
        const src = readFileSync(path.join(ROOT, file), "utf8");
        expect(pattern.test(src), reason).toBe(false);
      });
    }
  }
});
