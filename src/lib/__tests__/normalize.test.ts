import { describe, it, expect } from "vitest";
import { normalize, normalizeStrict, slugify, looseEquals, looseIncludes } from "../normalize";

describe("normalize", () => {
  it("strips accents and lowercases", () => {
    expect(normalize("Rhône")).toBe("rhone");
    expect(normalize("Île-de-France")).toBe("ile-de-france");
    expect(normalize("ÉCULLY")).toBe("ecully");
  });

  it("handles null/undefined safely", () => {
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
    expect(normalize("")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(normalize("  Lyon  ")).toBe("lyon");
  });
});

describe("normalizeStrict", () => {
  it("replaces ligatures and special chars", () => {
    expect(normalizeStrict("Œuf")).toBe("oeuf");
    expect(normalizeStrict("Bæta")).toBe("baeta");
    expect(normalizeStrict("Straße")).toBe("strasse");
  });
});

describe("slugify", () => {
  it("creates URL-safe slugs", () => {
    expect(slugify("Saint-Étienne / 42")).toBe("saint-etienne-42");
    expect(slugify("Île de Ré")).toBe("ile-de-re");
    expect(slugify("L'Œuf & Cie")).toBe("l-oeuf-cie");
  });
});

describe("looseEquals", () => {
  it("matches case/accent-insensitively", () => {
    expect(looseEquals("Rhône", "rhone")).toBe(true);
    expect(looseEquals("LYON", "lyon")).toBe(true);
    expect(looseEquals("Lyon", "Paris")).toBe(false);
  });
});

describe("looseIncludes", () => {
  it("partial matches normalised", () => {
    expect(looseIncludes("Provence-Alpes-Côte d'Azur", "alpes")).toBe(true);
    expect(looseIncludes("Auvergne-Rhône-Alpes", "RHONE")).toBe(true);
    expect(looseIncludes("Bretagne", "alpes")).toBe(false);
  });
});
