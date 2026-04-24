import { describe, it, expect, vi } from "vitest";
import {
  HERO_BANK,
  getCategoryFallbackImage,
  getSitterHeroImage,
  getSitterHeroSelection,
  getCategoryByBankIndex,
  type HeroCategoryName,
} from "./heroBank";

describe("heroBank — fallback cohérent par catégorie", () => {
  const categories: HeroCategoryName[] = ["animals", "home", "mutual_aid", "village"];

  it("getCategoryFallbackImage retourne une image valide pour chaque catégorie", () => {
    for (const cat of categories) {
      const url = getCategoryFallbackImage(cat);
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
      // Le fallback doit appartenir à la bonne catégorie thématique.
      const idx = HERO_BANK.indexOf(url);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(getCategoryByBankIndex(idx)).toBe(cat);
    }
  });

  it("sitterId vide ou null : tombe sur le fallback de la catégorie 'animals'", () => {
    const sel1 = getSitterHeroSelection(null);
    const sel2 = getSitterHeroSelection(undefined);
    const sel3 = getSitterHeroSelection("");
    for (const sel of [sel1, sel2, sel3]) {
      expect(sel.fellBack).toBe(true);
      expect(sel.category).toBe("animals");
      expect(typeof HERO_BANK[sel.index]).toBe("string");
      expect(HERO_BANK[sel.index].length).toBeGreaterThan(0);
    }
  });

  it("sitterId valide en conditions normales : pas de fallback", () => {
    const sel = getSitterHeroSelection("a1b2c3d4-1234-5678-9012-abcdef012345");
    expect(sel.fellBack).toBe(false);
    expect(typeof HERO_BANK[sel.index]).toBe("string");
    expect(HERO_BANK[sel.index].length).toBeGreaterThan(0);
  });

  it("force un asset corrompu en mémoire : la sélection retombe sur le fallback de la même catégorie", () => {
    // On corrompt UNE image cible précise pour démontrer le fallback thématique.
    // L'index est calculé à l'avance pour cet ID donné.
    const targetId = "corrupted-id-test";
    const original = getSitterHeroSelection(targetId);
    expect(original.fellBack).toBe(false);

    const originalUrl = HERO_BANK[original.index];
    // Mock : on simule un asset manquant en réécrivant l'élément du tableau.
    const mutableBank = HERO_BANK as unknown as string[];
    mutableBank[original.index] = "";
    try {
      const after = getSitterHeroSelection(targetId);
      expect(after.fellBack).toBe(true);
      // Catégorie identique → cohérence thématique préservée.
      expect(after.category).toBe(original.category);
      // Le fallback doit être un asset VALIDE.
      expect(HERO_BANK[after.index].length).toBeGreaterThan(0);
      // Et il doit appartenir à la même catégorie thématique.
      expect(getCategoryByBankIndex(after.index)).toBe(original.category);
    } finally {
      // Restauration impérative pour ne pas polluer les autres tests.
      mutableBank[original.index] = originalUrl;
    }
  });

  it("getSitterHeroImage retourne toujours une URL non vide, même sans ID", () => {
    expect(getSitterHeroImage(null).length).toBeGreaterThan(0);
    expect(getSitterHeroImage(undefined).length).toBeGreaterThan(0);
    expect(getSitterHeroImage("").length).toBeGreaterThan(0);
  });
});
