import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { FOUNDER_START, LAUNCH_DATE, GRACE_END } from "@/lib/constants";

/**
 * Garde-fou éditorial : la promesse publique est
 *   • Lancement public payant : 1er octobre 2026 (après période à 0 € prolongée)
 *   • Statut Fondateur : réservé aux inscrits jusqu'au 30 septembre 2026 inclus
 *   • Gratuité pour TOUS : jusqu'au 30 septembre 2026 inclus
 *   • Tarif gardien (6,99 €/mois) : à partir du 1er octobre 2026
 *
 * Toute mention d'une autre date dans la copie utilisateur ou dans les
 * constantes métier doit faire échouer ce test pour éviter les régressions.
 */

const ROOT = path.resolve(__dirname, "../..");

// Constantes attendues
const EXPECTED = {
  founderStart: "2026-09-30T00:00:00.000Z",
  launchDate: "2026-10-01T00:00:00.000Z",
  graceEnd: "2026-10-01T00:00:00.000Z",
} as const;

// Fichiers où la copie utilisateur expose les dates de gratuité.
const COPY_FILES = [
  "index.html",
  "src/pages/Landing.tsx",
  "src/pages/Pricing.tsx",
  "src/pages/SmallMissionsPublic.tsx",
  "src/pages/Cgs.tsx",
  "src/pages/Privacy.tsx",
  "src/pages/MySubscription.tsx",
  "src/components/subscription/FreeAccountSection.tsx",
  "src/components/marketing/FreePeriodBanner.tsx",
  "src/components/badges/FounderBadge.tsx",
];

// Dates explicitement INTERDITES dans la copie publique.
const FORBIDDEN_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /13\s+mai\s+2026/gi, reason: "Date '13 mai 2026' obsolète, utiliser 30 septembre 2026." },
  { pattern: /30\s+juin\s+2026/gi, reason: "Date '30 juin 2026' obsolète, utiliser 30 septembre 2026." },
  { pattern: /1er\s+juillet\s+2026/gi, reason: "Date '1er juillet 2026' obsolète, utiliser 1er octobre 2026." },
  { pattern: /\b13\s+juin\s+2026\b/gi, reason: "Date '13 juin 2026' obsolète." },
  { pattern: /\b13\s+juillet\s+2026\b/gi, reason: "Date '13 juillet 2026' obsolète, utiliser 30 septembre 2026." },
  { pattern: /\b14\s+juillet\s+2026\b/gi, reason: "Date '14 juillet 2026' obsolète, utiliser 30 septembre 2026." },
  { pattern: /\b15\s+juillet\s+2026\b/gi, reason: "Date '15 juillet 2026' obsolète, utiliser 1er octobre 2026." },
  { pattern: /2026-06-13/g, reason: "Date '2026-06-13' obsolète." },
  { pattern: /2026-06-30/g, reason: "Date '2026-06-30' obsolète, utiliser 2026-09-30." },
  { pattern: /2026-07-01/g, reason: "Date '2026-07-01' obsolète, utiliser 2026-10-01." },
  { pattern: /2026-07-13/g, reason: "Date '2026-07-13' obsolète, utiliser 2026-09-30." },
  { pattern: /2026-07-14/g, reason: "Date '2026-07-14' obsolète, utiliser 2026-09-30." },
  { pattern: /2026-07-15/g, reason: "Date '2026-07-15' obsolète, utiliser 2026-10-01." },
  { pattern: /\b14\s+juillet\s+2027\b/gi, reason: "Année incorrecte (2027)." },
];

const readFile = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("Cohérence des dates de gratuité", () => {
  it("les constantes métier correspondent aux dates publiques", () => {
    expect(FOUNDER_START.toISOString()).toBe(EXPECTED.founderStart);
    expect(LAUNCH_DATE.toISOString()).toBe(EXPECTED.launchDate);
    expect(GRACE_END.toISOString()).toBe(EXPECTED.graceEnd);
  });

  it("la fenêtre de gratuité s'arrête bien le 30 septembre 2026 inclus", () => {
    // GRACE_END est exclusif (1er octobre 00:00 UTC). Le dernier jour gratuit est
    // donc le 30 septembre 2026.
    const lastFreeDay = new Date(GRACE_END.getTime() - 24 * 60 * 60 * 1000);
    expect(lastFreeDay.toISOString().slice(0, 10)).toBe("2026-09-30");
  });

  it("le statut Fondateur précède le lancement public payant", () => {
    expect(FOUNDER_START.getTime()).toBeLessThanOrEqual(LAUNCH_DATE.getTime());
    expect(LAUNCH_DATE.getTime()).toBeLessThanOrEqual(GRACE_END.getTime());
  });

  describe("aucune date obsolète dans la copie utilisateur", () => {
    for (const file of COPY_FILES) {
      it(`${file} ne contient aucune date interdite`, () => {
        const src = readFile(file);
        for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
          const matches = src.match(pattern);
          if (matches) {
            throw new Error(
              `${file} contient ${matches.length} occurrence(s) interdite(s) : "${matches[0]}". ${reason}`
            );
          }
        }
      });
    }
  });

  describe("présence des dates canoniques", () => {
    const REQUIRED_PRESENCE: Record<string, RegExp[]> = {
      "src/pages/Pricing.tsx": [/1er\s+octobre\s+2026/],
      "src/pages/Cgs.tsx": [/30\s+septembre\s+2026/, /1er\s+octobre\s+2026/],
      "src/pages/Landing.tsx": [/30\s+septembre\s+2026/],
    };
    for (const [file, patterns] of Object.entries(REQUIRED_PRESENCE)) {
      it(`${file} mentionne les dates canoniques`, () => {
        const src = readFile(file);
        for (const p of patterns) {
          expect(src, `${file} doit mentionner ${p}`).toMatch(p);
        }
      });
    }
  });

  it("aucun fichier source ne mentionne '30 juin 2026' ou '1er juillet 2026' ou '14 juillet 2026'", () => {
    const exts = new Set([".ts", ".tsx", ".md"]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        const full = path.join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
          walk(full);
        } else if (exts.has(path.extname(entry))) {
          // Exclut le test lui-même (qui contient ces motifs intentionnellement).
          if (full.endsWith("free-period-dates-consistency.test.ts")) continue;
          const content = readFileSync(full, "utf8");
          if (
            /30\s+juin\s+2026/i.test(content) ||
            /1er\s+juillet\s+2026/i.test(content) ||
            /\b14\s+juillet\s+2026\b/i.test(content) ||
            /\b15\s+juillet\s+2026\b/i.test(content)
          ) {
            offenders.push(path.relative(ROOT, full));
          }
        }
      }
    };
    walk(path.join(ROOT, "src"));
    expect(offenders, `Fichiers contenant des dates obsolètes :\n${offenders.join("\n")}`).toEqual([]);
  });
});
