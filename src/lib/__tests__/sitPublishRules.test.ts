import { describe, it, expect } from "vitest";
import {
  getSitPublishBlockers,
  canPublishSit,
  splitExpectations,
  joinExpectations,
  getDescriptionBlockers,
  getTwoFieldsDescriptionBlockers,
  getSingleBlockDescriptionBlockers,
  MIN_SUB_DESCRIPTION,
  MIN_SINGLE_DESCRIPTION,
  EXPECTATIONS_SEPARATOR,
  getSitPublishRequirements,
  type SitPublishInput,
  type SitPublishTwoFieldsInput,
  type SitPublishSingleBlockInput,
} from "../sitPublishRules";

const text = (n: number) => "a".repeat(n);

/** Annonce complète et publiable en mode deux champs. */
const validTwoFields = (): SitPublishTwoFieldsInput => ({
  descriptionMode: "two-fields",
  title: "Garde de deux chiens",
  startDate: "2026-09-01",
  endDate: "2026-09-10",
  flexibleDates: false,
  absenceReason: text(40),
  sitterExpectations: text(40),
  hasProperty: true,
  galleryPhotoCount: 2,
  petCount: 1,
});

/** Annonce complète et publiable en mode bloc unique. */
const validSingleBlock = (): SitPublishSingleBlockInput => ({
  descriptionMode: "single-block",
  title: "Garde de deux chiens",
  startDate: "2026-09-01",
  endDate: "2026-09-10",
  flexibleDates: false,
  specificExpectations: text(120),
  hasProperty: true,
  galleryPhotoCount: 2,
  petCount: 1,
});

const ids = (input: SitPublishInput) => getSitPublishBlockers(input).map((b) => b.id);

describe("getSitPublishBlockers, cas nominal", () => {
  it("ne bloque rien sur une annonce complète en deux champs", () => {
    expect(getSitPublishBlockers(validTwoFields())).toEqual([]);
    expect(canPublishSit(validTwoFields())).toBe(true);
  });

  it("ne bloque rien sur une annonce complète en bloc unique", () => {
    expect(getSitPublishBlockers(validSingleBlock())).toEqual([]);
    expect(canPublishSit(validSingleBlock())).toBe(true);
  });
});

describe("règle des dates, toujours bloquante", () => {
  it("bloque sans date de début ni date de fin", () => {
    expect(ids({ ...validTwoFields(), startDate: null, endDate: null })).toContain("dates");
  });

  it("bloque même quand les dates flexibles sont cochées", () => {
    const input = { ...validTwoFields(), startDate: "", endDate: "", flexibleDates: true };
    expect(ids(input)).toContain("dates");
    expect(canPublishSit(input)).toBe(false);
  });

  it("bloque quand une seule des deux dates est renseignée", () => {
    expect(ids({ ...validTwoFields(), endDate: null })).toContain("dates");
    expect(ids({ ...validTwoFields(), startDate: null })).toContain("dates");
  });

  it("accepte des dates complètes avec la flexibilité cochée", () => {
    expect(getSitPublishBlockers({ ...validTwoFields(), flexibleDates: true })).toEqual([]);
  });

  it("remonte l'erreur de cohérence des dates fournie par le formulaire", () => {
    const blockers = getSitPublishBlockers({
      ...validTwoFields(),
      dateError: "La date de fin doit être après la date de début.",
    });
    expect(blockers.map((b) => b.id)).toContain("date-error");
    expect(blockers.find((b) => b.id === "date-error")?.label).toContain("date de fin");
  });
});

describe("mode deux champs, les deux valeurs sont obligatoires", () => {
  it("exige 30 caractères sur chacun des deux champs", () => {
    expect(getTwoFieldsDescriptionBlockers(text(29), text(40)).map((b) => b.id)).toEqual([
      "desc-reason",
    ]);
    expect(getTwoFieldsDescriptionBlockers(text(40), text(29)).map((b) => b.id)).toEqual([
      "desc-expectations",
    ]);
    expect(
      getTwoFieldsDescriptionBlockers(text(MIN_SUB_DESCRIPTION), text(MIN_SUB_DESCRIPTION)),
    ).toEqual([]);
  });

  it("bloque un second champ vide, même avec une raison longue", () => {
    const input: SitPublishTwoFieldsInput = {
      ...validTwoFields(),
      absenceReason: text(80),
      sitterExpectations: "",
    };
    expect(ids(input)).toContain("desc-expectations");
    expect(canPublishSit(input)).toBe(false);
  });

  it("bloque les deux champs quand ils sont vides", () => {
    expect(
      getTwoFieldsDescriptionBlockers("", "").map((b) => b.id),
    ).toEqual(["desc-reason", "desc-expectations"]);
  });

  it("n'applique jamais le seuil du bloc unique", () => {
    expect(
      getDescriptionBlockers({
        ...validTwoFields(),
        absenceReason: text(MIN_SINGLE_DESCRIPTION),
        sitterExpectations: text(10),
      }).map((b) => b.id),
    ).toEqual(["desc-expectations"]);
  });
});

describe("mode bloc unique, jamais de découpe", () => {
  it("exige 50 caractères au total", () => {
    expect(getSingleBlockDescriptionBlockers(text(MIN_SINGLE_DESCRIPTION))).toEqual([]);
    expect(getSingleBlockDescriptionBlockers(text(49)).map((b) => b.id)).toEqual(["desc-reason"]);
  });

  it("ne bloque pas un texte contenant un double saut de ligne et une signature courte", () => {
    const production = `${text(200)}${EXPECTATIONS_SEPARATOR}Anne, Alma, Maya et Nina`;
    expect(getSingleBlockDescriptionBlockers(production)).toEqual([]);
    expect(
      getSitPublishBlockers({ ...validSingleBlock(), specificExpectations: production }),
    ).toEqual([]);
  });

  it("ne produit jamais de bloquant sur les attentes", () => {
    const blockers = getSitPublishBlockers({
      ...validSingleBlock(),
      specificExpectations: text(10),
    });
    expect(blockers.map((b) => b.id)).toContain("desc-reason");
    expect(blockers.map((b) => b.id)).not.toContain("desc-expectations");
  });

  it("annonce le seuil de 50 caractères dans son libellé", () => {
    expect(getSingleBlockDescriptionBlockers(text(10))[0].label).toContain(
      `${MIN_SINGLE_DESCRIPTION} caractères minimum`,
    );
  });
});

describe("autres prérequis", () => {
  it("bloque sans logement, sans titre, sans photo, sans animal", () => {
    const empty: SitPublishInput = {
      descriptionMode: "two-fields",
      title: "",
      startDate: "2026-09-01",
      endDate: "2026-09-10",
      absenceReason: text(40),
      sitterExpectations: text(40),
      hasProperty: false,
      galleryPhotoCount: 0,
      propertyPhotoCount: 0,
      petCount: 0,
    };
    expect(ids(empty)).toEqual(["property", "title", "photo", "pets"]);
  });

  it("compte les photos du logement et la couverture, pas seulement la galerie", () => {
    expect(
      ids({ ...validTwoFields(), galleryPhotoCount: 0, propertyPhotoCount: 1 }),
    ).not.toContain("photo");
    expect(
      ids({ ...validTwoFields(), galleryPhotoCount: 0, hasCoverPhoto: true }),
    ).not.toContain("photo");
  });

  it("ne rend jamais l'identité vérifiée bloquante", () => {
    expect(getSitPublishBlockers(validTwoFields())).toEqual([]);
  });

  it("propose une action de correction sur les éléments hors formulaire", () => {
    const blockers = getSitPublishBlockers({ ...validTwoFields(), hasProperty: false });
    expect(blockers.find((b) => b.id === "property")?.action).toBe("/owner-profile");
  });
});

describe("découpe et recomposition des descriptions", () => {
  it("répartit un texte concaténé sur les deux sous-champs", () => {
    expect(splitExpectations(`un${EXPECTATIONS_SEPARATOR}deux`)).toEqual({
      absenceReason: "un",
      sitterExpectations: "deux",
    });
  });

  it("laisse le second sous-champ vide sans séparateur", () => {
    expect(splitExpectations("bloc unique")).toEqual({
      absenceReason: "bloc unique",
      sitterExpectations: "",
    });
  });

  it("recompose sans séparateur orphelin", () => {
    expect(joinExpectations("un", "")).toBe("un");
    expect(joinExpectations("un", "deux")).toBe(`un${EXPECTATIONS_SEPARATOR}deux`);
  });
});

describe("libellés des prérequis, suivant le mode", () => {
  it("liste les deux sous-champs en mode deux champs", () => {
    expect(getSitPublishRequirements("two-fields").map((r) => r.id)).toEqual([
      "property",
      "title",
      "dates",
      "desc-reason",
      "desc-expectations",
      "photo",
      "pets",
    ]);
  });

  it("n'affiche pas les attentes en mode bloc unique et annonce 50 caractères", () => {
    const reqs = getSitPublishRequirements("single-block");
    expect(reqs.map((r) => r.id)).toEqual([
      "property",
      "title",
      "dates",
      "desc-reason",
      "photo",
      "pets",
    ]);
    expect(reqs.find((r) => r.id === "desc-reason")?.label).toContain(
      `${MIN_SINGLE_DESCRIPTION} caractères minimum`,
    );
  });

  it("ne présente plus les dates comme dispensables", () => {
    const dates = getSitPublishRequirements("two-fields").find((r) => r.id === "dates");
    expect(dates?.label).not.toMatch(/flexible/i);
  });
});
