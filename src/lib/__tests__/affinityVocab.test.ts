import { describe, it, expect } from "vitest";
import {
  PRESENCE_EXPECTED_OPTIONS,
  WORK_DURING_SIT_OPTIONS,
  LIFE_PACE_OPTIONS,
  SENSITIVITIES_OPTIONS,
  HOME_AMBIANCE_OPTIONS,
  INTEREST_OPTIONS,
} from "@/lib/profileMatchingOptions";
import {
  PACE_ORDER,
  PRESENCE_EXPECTED_VALUES,
  WORK_DURING_SIT_VALUES,
  HOME_AMBIANCE_SCORED_TAGS,
  ALL_BLOCKING_SENSITIVITIES,
  OUTDOOR_SPORT_INTERESTS,
  RURAL_INTERESTS,
} from "@/lib/affinityVocab";

/**
 * Ces tests bridgent le vocabulaire de scoring (source unique
 * `affinityVocab.ts`) et les listes d'options exposées aux formulaires.
 * Si un libellé dérive d'un côté, un de ces tests casse — évite qu'un
 * critère se dégrade en silence dans le score.
 */
describe("affinityVocab ↔ profileMatchingOptions (cohérence)", () => {
  it("PACE_ORDER : chaque rythme scoré est proposé dans LIFE_PACE_OPTIONS", () => {
    const formValues = LIFE_PACE_OPTIONS.map((o) => o.value);
    for (const p of PACE_ORDER) {
      expect(formValues, `rythme "${p}" absent des options`).toContain(p);
    }
  });

  it("Présence : chaque valeur scorée est proposée dans PRESENCE_EXPECTED_OPTIONS", () => {
    for (const v of PRESENCE_EXPECTED_VALUES) {
      expect(PRESENCE_EXPECTED_OPTIONS, `présence "${v}" absente des options`).toContain(v);
    }
  });

  it("Travail pendant la garde : chaque valeur scorée est proposée dans WORK_DURING_SIT_OPTIONS", () => {
    const formValues = WORK_DURING_SIT_OPTIONS.map((o) => o.value);
    for (const v of WORK_DURING_SIT_VALUES) {
      expect(formValues, `work_during_sit "${v}" absent des options`).toContain(v);
    }
  });

  it("Ambiance foyer : chaque tag scoré est proposé dans HOME_AMBIANCE_OPTIONS", () => {
    for (const tag of HOME_AMBIANCE_SCORED_TAGS) {
      expect(HOME_AMBIANCE_OPTIONS, `ambiance "${tag}" absente des options`).toContain(tag);
    }
  });

  it("Sensibilités bloquantes : chaque libellé est proposé dans SENSITIVITIES_OPTIONS", () => {
    for (const s of ALL_BLOCKING_SENSITIVITIES) {
      expect(SENSITIVITIES_OPTIONS, `sensibilité "${s}" absente des options`).toContain(s);
    }
  });

  it("Intérêts sportifs outdoor : chaque libellé est proposé dans INTEREST_OPTIONS", () => {
    for (const i of OUTDOOR_SPORT_INTERESTS) {
      expect(INTEREST_OPTIONS, `intérêt "${i}" absent des options`).toContain(i);
    }
  });

  it("Intérêts campagne : chaque libellé est proposé dans INTEREST_OPTIONS", () => {
    for (const i of RURAL_INTERESTS) {
      expect(INTEREST_OPTIONS, `intérêt "${i}" absent des options`).toContain(i);
    }
  });
});
