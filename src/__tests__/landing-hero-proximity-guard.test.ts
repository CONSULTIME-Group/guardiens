import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const HERO_PATH = path.resolve(process.cwd(), "src/i18n/locales/fr/common.json");

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

describe("landing.hero, proximité locale H1", () => {
  const hero = flatten(
    (JSON.parse(fs.readFileSync(HERO_PATH, "utf8")) as any).landing.hero
  );

  it("présente les gens du coin comme second moteur", () => {
    expect(hero.lede).toContain("les gens du coin se rendent des coups de main");
  });
});
