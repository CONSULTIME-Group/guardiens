/**
 * Tests unitaires WelcomeBackDigest — 8 variantes déterministes.
 * On teste la logique pure pickVariant + getCopy (pas de rendu réseau).
 */
import { describe, it, expect } from "vitest";
import {
  pickVariant,
  getCopy,
  type DigestSignals,
} from "../WelcomeBackDigest";

const empty: DigestSignals = {
  new_messages: 0,
  new_applications: 0,
  new_sits_nearby: 0,
  new_intl_sitters: 0,
  new_intl_sits: 0,
  is_first_visit: false,
};

describe("WelcomeBackDigest - pickVariant", () => {
  it("owner_first_visit quand is_first_visit=true", () => {
    expect(pickVariant("owner", { ...empty, is_first_visit: true })).toBe(
      "owner_first_visit",
    );
  });

  it("owner_active quand candidatures ou messages", () => {
    expect(pickVariant("owner", { ...empty, new_applications: 2 })).toBe(
      "owner_active",
    );
    expect(pickVariant("owner", { ...empty, new_messages: 1 })).toBe(
      "owner_active",
    );
  });

  it("owner_intl quand nouveaux gardiens et rien d'autre", () => {
    expect(pickVariant("owner", { ...empty, new_intl_sitters: 5 })).toBe(
      "owner_intl",
    );
  });

  it("owner_empty_positive quand aucun signal", () => {
    expect(pickVariant("owner", empty)).toBe("owner_empty_positive");
  });

  it("sitter_first_visit quand is_first_visit=true", () => {
    expect(pickVariant("sitter", { ...empty, is_first_visit: true })).toBe(
      "sitter_first_visit",
    );
  });

  it("sitter_active quand messages ou sits proches", () => {
    expect(pickVariant("sitter", { ...empty, new_sits_nearby: 3 })).toBe(
      "sitter_active",
    );
    expect(pickVariant("sitter", { ...empty, new_messages: 1 })).toBe(
      "sitter_active",
    );
  });

  it("sitter_intl quand nouvelles gardes internationales", () => {
    expect(pickVariant("sitter", { ...empty, new_intl_sits: 2 })).toBe(
      "sitter_intl",
    );
  });

  it("sitter_empty_positive quand aucun signal", () => {
    expect(pickVariant("sitter", empty)).toBe("sitter_empty_positive");
  });
});

describe("WelcomeBackDigest - getCopy", () => {
  const cases = [
    "owner_first_visit",
    "owner_active",
    "owner_intl",
    "owner_empty_positive",
    "sitter_first_visit",
    "sitter_active",
    "sitter_intl",
    "sitter_empty_positive",
  ] as const;

  it("produit du contenu pour chacune des 8 variantes", () => {
    for (const v of cases) {
      const copy = getCopy(v, {
        ...empty,
        new_messages: 2,
        new_applications: 1,
        new_sits_nearby: 3,
        new_intl_sitters: 4,
        new_intl_sits: 5,
      });
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
    }
  });

  it("respecte les règles éditoriales : pas de tiret cadratin, pas de tutoiement, pas d'emoji", () => {
    for (const v of cases) {
      const copy = getCopy(v, { ...empty, new_intl_sitters: 3, new_intl_sits: 3, new_applications: 2, new_messages: 2, new_sits_nearby: 2 });
      const full = `${copy.title} ${copy.body} ${copy.actionLabel ?? ""}`;
      expect(full).not.toContain("—");
      expect(full).not.toMatch(/\btu\b|\bton\b|\btes\b|\bta\b/i);
      // Emojis courants : simple heuristique — pas de caractère hors BMP fréquent
      expect(full).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    }
  });

  it("owner_active singulier vs pluriel", () => {
    const singular = getCopy("owner_active", { ...empty, new_applications: 1 });
    expect(singular.body).toContain("1 nouvelle candidature");
    const plural = getCopy("owner_active", { ...empty, new_applications: 3 });
    expect(plural.body).toContain("3 nouvelles candidatures");
  });

  it("sitter_intl mentionne le nombre exact", () => {
    const copy = getCopy("sitter_intl", { ...empty, new_intl_sits: 7 });
    expect(copy.body).toContain("7");
    expect(copy.actionHref).toBe("/annonces?international=1");
  });
});
