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

describe("landing.hero, entraide entre voisins", () => {
  const landing = flatten(
    (JSON.parse(fs.readFileSync(COMMON_PATH, "utf8")) as any).landing
  );

  it("présente l'entraide entre voisins comme second moteur", () => {
    expect(landing["hero.lede"]).toContain("on s'entraide entre voisins");
  });

  it("n'emploie plus « gens du coin » dans tout le bloc landing", () => {
    const hits = Object.entries(landing)
      .filter(([, value]) => value.includes("gens du coin"))
      .map(([key]) => key);
    expect(
      hits,
      `« gens du coin » résiduel dans landing : ${hits.join(", ")}`
    ).toEqual([]);
  });
});
