import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Garde anti-régression, règle posée le 16/08/2026 :
 * le vocabulaire marketing « local » (et ses équivalents traduits) ne doit
 * plus apparaître dans les chaînes de la landing, de la page de connexion
 * et de la page urgence, dans les trois langues. Le positionnement est
 * national, le réseau s'organise par affinité autant que par proximité.
 *
 * Exceptions explicites :
 * - le silo SEO « Guides locaux » (liens et mentions du nom du silo),
 * - les emplacements SEO (meta, h2) bloqués par le garde-fou SEO en attente
 *   d'arbitrage au cas par cas,
 * - les libellés fonctionnels de localisation (aucun dans ce périmètre à ce
 *   jour ; « géolocalisés » n'est de toute façon pas matché par \blocal).
 *
 * Hors périmètre volontaire : « près de chez vous » et les autres expressions
 * de proximité qui sont des mots-clés de recherche, ainsi que les pages hors
 * landing / connexion / urgence (petites missions, pricing, fiches ville).
 */

const LOCALES_DIR = path.resolve(process.cwd(), "src/i18n/locales");
const LANGS = ["fr", "en", "es"] as const;
type Lang = (typeof LANGS)[number];

const SCOPED_PREFIX = /^(landing|login_page|emergency_page)\./;

const FORBIDDEN: Record<Lang, RegExp[]> = {
  fr: [/\blocal(e|s)?\b/i, /\blocaux\b/i, /hyper-local/i],
  en: [/\blocals?\b/i, /hyper-local/i],
  es: [/\blocal(es)?\b/i, /hiperlocal/i],
};

/** Clés exemptées, avec la raison. Toute nouvelle entrée doit être arbitrée. */
const EXCEPTIONS: Record<string, string> = {
  "landing.cities.all_guides": "silo « Guides locaux » conservé (lien vers /guides)",
  "landing.what_is.body_5": "mention du nom du silo « Guides locaux »",
  "emergency_page.further2_title": "silo « Guides locaux » conservé (carte lien)",
  "emergency_page.owner_title": "h2, bloqué par le garde-fou SEO, arbitrage en attente",
  "emergency_page.meta_description": "meta description, bloquée par le garde-fou SEO, arbitrage en attente",
};

const flatten = (
  obj: Record<string, unknown>,
  prefix = "",
  acc: Record<string, string> = {},
) => {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "string") acc[`${full}[${i}]`] = item;
        else if (item && typeof item === "object") {
          flatten(item as Record<string, unknown>, `${full}[${i}]`, acc);
        }
      });
    } else if (value && typeof value === "object") {
      flatten(value as Record<string, unknown>, full, acc);
    } else if (typeof value === "string") {
      acc[full] = value;
    }
  }
  return acc;
};

describe("vocabulaire « local » proscrit sur landing, connexion et urgence", () => {
  for (const lng of LANGS) {
    it(`${lng} : aucune occurrence hors exceptions`, () => {
      const flat = flatten(
        JSON.parse(
          fs.readFileSync(path.join(LOCALES_DIR, lng, "common.json"), "utf8"),
        ),
      );
      const hits: string[] = [];
      for (const [key, value] of Object.entries(flat)) {
        if (!SCOPED_PREFIX.test(key)) continue;
        if (key in EXCEPTIONS) continue;
        for (const motif of FORBIDDEN[lng]) {
          const matches = value.match(motif);
          if (matches) hits.push(`${key}: «${matches[0]}»`);
        }
      }
      expect(
        hits,
        `vocabulaire « local » résiduel en ${lng} : ${hits.join(", ")}`,
      ).toEqual([]);
    });
  }

  it("les exceptions existent toujours en FR (sinon la liste se périmètre)", () => {
    const fr = flatten(
      JSON.parse(
        fs.readFileSync(path.join(LOCALES_DIR, "fr", "common.json"), "utf8"),
      ),
    );
    const missing = Object.keys(EXCEPTIONS).filter((k) => !(k in fr));
    expect(
      missing,
      `exceptions sans clé FR correspondante : ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
