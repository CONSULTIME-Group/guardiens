import { describe, it, expect } from "vitest";
import {
  HERO_BANK,
  DEFAULT_HERO_WEIGHTS,
  getSitterHeroImage,
  getSitterHeroSources,
  getSitterHeroAnchor,
  getCategoryByBankIndex,
  ACTIVE_HERO_INDEXES,
  RETIRED_HERO_FILES,
  isRetiredHeroIndex,
  type HeroCategoryName,
} from "./heroBank";

/**
 * Génère un UUID v4 pseudo-aléatoire mais déterministe via un seed,
 * pour que la suite de tests soit reproductible (pas de flakes).
 */
function makeSeededIds(count: number, seed = 0xc0ffee): string[] {
  let state = seed >>> 0;
  const next = () => {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const parts = Array.from({ length: 4 }, () =>
      next().toString(16).padStart(8, "0")
    );
    ids.push(
      `${parts[0]}-${parts[1].slice(0, 4)}-${parts[1].slice(4)}-${parts[2].slice(
        0,
        4
      )}-${parts[2].slice(4)}${parts[3]}`
    );
  }
  return ids;
}

describe("heroBank — stabilité par sitterId", () => {
  const sampleIds = makeSeededIds(50);

  it("retourne toujours la même image pour un même sitterId", () => {
    for (const id of sampleIds) {
      const a = getSitterHeroImage(id);
      const b = getSitterHeroImage(id);
      const c = getSitterHeroImage(id);
      expect(a).toBe(b);
      expect(b).toBe(c);
    }
  });

  it("retourne toujours la même catégorie pour un même sitterId", () => {
    for (const id of sampleIds) {
      const idx1 = HERO_BANK.indexOf(getSitterHeroImage(id));
      const idx2 = HERO_BANK.indexOf(getSitterHeroImage(id));
      expect(getCategoryByBankIndex(idx1)).toBe(getCategoryByBankIndex(idx2));
    }
  });

  it("retourne toujours le même ancrage et les mêmes sources (desktop+mobile) pour un même sitterId", () => {
    for (const id of sampleIds) {
      expect(getSitterHeroAnchor(id)).toBe(getSitterHeroAnchor(id));
      const s1 = getSitterHeroSources(id);
      const s2 = getSitterHeroSources(id);
      expect(s1.desktop).toBe(s2.desktop);
      expect(s1.mobile).toBe(s2.mobile);
    }
  });

  it("l'image renvoyée correspond bien à la catégorie attendue (cohérence interne)", () => {
    for (const id of sampleIds) {
      const url = getSitterHeroImage(id);
      const idx = HERO_BANK.indexOf(url);
      expect(idx).toBeGreaterThanOrEqual(0);
      const cat = getCategoryByBankIndex(idx);
      expect(["animals", "home", "mutual_aid", "village"]).toContain(cat);
    }
  });
});

describe("heroBank — distribution globale proche des cibles", () => {
  // 10 000 IDs : marge de tolérance ±3 points pour absorber le bruit statistique.
  const SAMPLE_SIZE = 10_000;
  const TOLERANCE_PCT = 3;

  it(`sur ${SAMPLE_SIZE} sitterId, chaque catégorie reste à ±${TOLERANCE_PCT} pts de sa cible (40/20/20/20)`, () => {
    const ids = makeSeededIds(SAMPLE_SIZE);
    const counts: Record<HeroCategoryName, number> = {
      animals: 0,
      home: 0,
      mutual_aid: 0,
      village: 0,
    };

    for (const id of ids) {
      const idx = HERO_BANK.indexOf(getSitterHeroImage(id));
      counts[getCategoryByBankIndex(idx)]++;
    }

    const targets = DEFAULT_HERO_WEIGHTS;
    for (const cat of Object.keys(counts) as HeroCategoryName[]) {
      const actualPct = (counts[cat] / SAMPLE_SIZE) * 100;
      expect(
        Math.abs(actualPct - targets[cat]),
        `Catégorie ${cat}: attendu ~${targets[cat]}%, obtenu ${actualPct.toFixed(2)}%`
      ).toBeLessThanOrEqual(TOLERANCE_PCT);
    }
  });

  it("toutes les images actives sont sélectionnables, aucune image retirée n'est attribuée", () => {
    const ids = makeSeededIds(SAMPLE_SIZE);
    const seen = new Set<number>();
    for (const id of ids) {
      seen.add(HERO_BANK.indexOf(getSitterHeroImage(id)));
    }
    // Sur 10k tirages, on doit voir TOUTES les images actives et aucune retirée.
    expect([...seen].filter((i) => isRetiredHeroIndex(i))).toEqual([]);
    expect(seen.size).toBe(ACTIVE_HERO_INDEXES.length);
  });

  it("respecte des poids personnalisés (ex: 100% animals)", () => {
    const ids = makeSeededIds(2_000);
    const customWeights = { animals: 100, home: 0, mutual_aid: 0, village: 0 };
    for (const id of ids) {
      const idx = HERO_BANK.indexOf(getSitterHeroImage(id, customWeights));
      expect(getCategoryByBankIndex(idx)).toBe("animals");
    }
  });
});

describe("heroBank — illustrations retirées (audit du 11/10/2026)", () => {
  it("42 illustrations retirées, 58 actives, chaque catégorie garde au moins 4 images", () => {
    expect(RETIRED_HERO_FILES.length).toBe(42);
    expect(ACTIVE_HERO_INDEXES.length).toBe(58);
    const perCat: Record<HeroCategoryName, number> = { animals: 0, home: 0, mutual_aid: 0, village: 0 };
    for (const i of ACTIVE_HERO_INDEXES) perCat[getCategoryByBankIndex(i)]++;
    expect(perCat).toEqual({ animals: 40, home: 7, mutual_aid: 4, village: 7 });
  });

  it("un choix explicite d'une illustration retirée reste respecté", () => {
    // hero-02 (index 1) est retirée : le membre qui l'a choisie la garde.
    expect(isRetiredHeroIndex(1)).toBe(true);
    expect(getSitterHeroImage("any-id", undefined, 1)).toBe(HERO_BANK[1]);
  });
});
