import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const COMMON_PATH = path.resolve(process.cwd(), "src/i18n/locales/fr/common.json");

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

describe("landing.hero, entraide près de chez soi", () => {
  const landing = flatten(
    (JSON.parse(fs.readFileSync(COMMON_PATH, "utf8")) as any).landing
  );

  it("présente la garde et l'entraide du quotidien", () => {
    expect(landing["hero.title_eyebrow"]).toBe("Garde de maison et entraide");
    expect(landing["hero.title_main"]).toBe("Près de chez vous, il y a toujours quelqu'un.");
    expect(landing["hero.lede"]).toContain("quand vous partez");
    expect(landing["hero.lede"]).toContain("le reste de l'année");
    expect(landing["hero.motto"]).toBe("Tout commence par un échange, et finit par une rencontre.");
  });

  it("n'emploie aucun tiret cadratin ou demi-cadratin dans le hero", () => {
    const hero = Object.entries(landing).filter(([k]) => k.startsWith("hero."));
    for (const [, v] of hero.filter(([k]) => /title_|lede|motto/.test(k))) expect(v).not.toMatch(/[\u2013\u2014]/);
  });

  it("n'emploie le mot « voisin » dans aucune clé landing", () => {
    const hits = Object.entries(landing)
      .filter(([, value]) => /\bvoisin(e|s|age)?\b/i.test(value))
      .map(([key]) => key);
    expect(hits, `« voisin » résiduel dans landing : ${hits.join(", ")}`).toEqual([]);
  });
});
