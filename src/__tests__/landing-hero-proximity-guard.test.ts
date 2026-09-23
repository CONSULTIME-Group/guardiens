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

  it("présente l'entraide près de chez soi comme second moteur", () => {
    expect(landing["hero.lede"]).toContain("on s'entraide près de chez soi");
  });

  it("n'emploie le mot « voisin » dans aucune clé landing", () => {
    const hits = Object.entries(landing)
      .filter(([, value]) => /\bvoisin(e|s|age)?\b/i.test(value))
      .map(([key]) => key);
    expect(hits, `« voisin » résiduel dans landing : ${hits.join(", ")}`).toEqual([]);
  });
});
