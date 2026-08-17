import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Garde-fou du lexique de marque dans les trois dictionnaires :
 *
 * 1. l'idée de « voisin » est proscrite dans toutes les langues,
 * 2. la gratuité présentée comme promesse perpétuelle est proscrite,
 * 3. une notion de marque a une seule formulation par langue.
 */

const LOCALES = path.resolve(process.cwd(), "src/i18n/locales");
const LANGS = ["fr", "en", "es"] as const;

const read = (lng: string) =>
  JSON.parse(fs.readFileSync(path.join(LOCALES, `${lng}/common.json`), "utf8"));

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

const dicts = Object.fromEntries(LANGS.map((l) => [l, flatten(read(l))])) as Record<
  (typeof LANGS)[number],
  Record<string, string>
>;

const FORBIDDEN = [
  /nachbar/i,
  /neighbou?r/i,
  /\bvecin[oa]s?\b/i,
  // « vicino a lei » (près de chez vous) est légitime : seul le voisinage l'est pas.
  /tra vicini|vicin[oi] di casa/i,
  /\bvoisin(e|s|age)?\b/i,
  /free forever/i,
  /gratis para siempre/i,
  /gratis per sempre/i,
  /für immer kostenlos/i,
  /\bà vie\b/i,
];

/** Notions verrouillées : une clé de référence, et ses clés jumelles. */
const LOCKED_GROUPS: Record<string, string[]> = {
  entraide: ["nav.small_missions", "footer.links.small_missions", "landing.alma_tips.types.mutual_aid_tip"],
  journal: ["nav.news", "footer.links.articles", "news.title", "news.breadcrumb"],
  guides: [
    "nav.guides",
    "footer.sections.local_guides",
    "news.categories.guide_local",
    "guides.breadcrumb",
    "guides.title",
    "guide_detail.breadcrumb",
    "public_listings.local_guides",
  ],
  pros: ["nav.pros", "footer.links.pet_pros"],
  owner: ["pricing.owner_card.label", "register_page.roles.owner_label"],
  sitter: ["pricing.sitter_card.label", "register_page.roles.sitter_label"],
  publish: ["landing.hero.cta_member_owner", "pricing.owner_card.cta", "pricing.final_cta.cta_owner"],
};

describe("lexique de marque", () => {
  it("aucune langue n'emploie l'idée de voisin ni la gratuité perpétuelle", () => {
    const offenders: string[] = [];
    for (const lng of LANGS) {
      for (const [key, value] of Object.entries(dicts[lng])) {
        for (const rule of FORBIDDEN) {
          if (rule.test(value)) offenders.push(`${lng}:${key}`);
        }
      }
    }
    expect(offenders, `formulations proscrites : ${offenders.slice(0, 20).join(", ")}`).toEqual([]);
  });

  it("une notion de marque a une seule formulation par langue", () => {
    const offenders: string[] = [];
    for (const [notion, keys] of Object.entries(LOCKED_GROUPS)) {
      for (const lng of LANGS) {
        const values = new Set(keys.map((k) => dicts[lng][k]).filter(Boolean));
        if (values.size > 1) offenders.push(`${lng}:${notion} = ${[...values].join(" | ")}`);
      }
    }
    expect(offenders, `formulations divergentes : ${offenders.join(", ")}`).toEqual([]);
  });

  it("le titre et la description de la home existent dans les cinq langues", () => {
    for (const lng of LANGS) {
      expect(dicts[lng]["landing.meta_title"], lng).toBeTruthy();
      expect(dicts[lng]["landing.meta_description"], lng).toBeTruthy();
    }
    expect(dicts.en["landing.meta_title"]).not.toBe(dicts.fr["landing.meta_title"]);
  });
});
