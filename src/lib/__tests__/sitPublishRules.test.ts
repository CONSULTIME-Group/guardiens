import { describe, it, expect } from "vitest";
import {
  getSitPublishBlockers,
  canPublishSit,
  splitExpectations,
  joinExpectations,
  getDescriptionBlockers,
  MIN_SUB_DESCRIPTION,
  MIN_SINGLE_DESCRIPTION,
  EXPECTATIONS_SEPARATOR,
  SIT_PUBLISH_REQUIREMENTS,
  type SitPublishInput,
} from "../sitPublishRules";

const text = (n: number) => "a".repeat(n);

/** Annonce complète et publiable, base des cas de test. */
const validInput = (): SitPublishInput => ({
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

const ids = (input: SitPublishInput) => getSitPublishBlockers(input).map((b) => b.id);

describe("getSitPublishBlockers, cas nominal", () => {
  it("ne bloque rien sur une annonce complète", () => {
    expect(getSitPublishBlockers(validInput())).toEqual([]);
    expect(canPublishSit(validInput())).toBe(true);
  });
});

describe("règle des dates, toujours bloquante", () => {
  it("bloque sans date de début ni date de fin", () => {
    expect(ids({ ...validInput(), startDate: null, endDate: null })).toContain("dates");
  });

  it("bloque même quand les dates flexibles sont cochées", () => {
    const input = { ...validInput(), startDate: "", endDate: "", flexibleDates: true };
    expect(ids(input)).toContain("dates");
    expect(canPublishSit(input)).toBe(false);
  });

  it("bloque quand une seule des deux dates est renseignée", () => {
    expect(ids({ ...validInput(), endDate: null })).toContain("dates");
    expect(ids({ ...validInput(), startDate: null })).toContain("dates");
  });

  it("accepte des dates complètes avec la flexibilité cochée", () => {
    expect(getSitPublishBlockers({ ...validInput(), flexibleDates: true })).toEqual([]);
  });

  it("remonte l'erreur de cohérence des dates fournie par le formulaire", () => {
    const blockers = getSitPublishBlockers({
      ...validInput(),
      dateError: "La date de fin doit être après la date de début.",
    });
    expect(blockers.map((b) => b.id)).toContain("date-error");
    expect(blockers.find((b) => b.id === "date-error")?.label).toContain("date de fin");
  });
});

describe("règle des descriptions, rétrocompatible", () => {
  it("exige 30 caractères sur chaque sous-champ quand les deux sont présents", () => {
    expect(getDescriptionBlockers(text(29), text(40)).map((b) => b.id)).toEqual(["desc-reason"]);
    expect(getDescriptionBlockers(text(40), text(29)).map((b) => b.id)).toEqual([
      "desc-expectations",
    ]);
    expect(getDescriptionBlockers(text(MIN_SUB_DESCRIPTION), text(MIN_SUB_DESCRIPTION))).toEqual([]);
  });

  it("accepte un bloc unique sans séparateur à partir de 50 caractères", () => {
    expect(getDescriptionBlockers(text(MIN_SINGLE_DESCRIPTION), "")).toEqual([]);
    expect(getDescriptionBlockers(text(49), "").map((b) => b.id)).toEqual(["desc-reason"]);
  });

  it("ne rend pas non publiable une annonce existante d'un seul bloc", () => {
    const legacy: SitPublishInput = {
      ...validInput(),
      absenceReason: undefined,
      sitterExpectations: undefined,
      specificExpectations: text(245),
    };
    expect(getSitPublishBlockers(legacy)).toEqual([]);
  });

  it("applique les deux seuils dès que le séparateur est présent", () => {
    const input: SitPublishInput = {
      ...validInput(),
      absenceReason: undefined,
      sitterExpectations: undefined,
      specificExpectations: `${text(40)}${EXPECTATIONS_SEPARATOR}${text(10)}`,
    };
    expect(ids(input)).toContain("desc-expectations");
  });

  it("bloque un texte d'un seul bloc trop court", () => {
    const input: SitPublishInput = {
      ...validInput(),
      absenceReason: undefined,
      sitterExpectations: undefined,
      specificExpectations: text(20),
    };
    expect(ids(input)).toContain("desc-reason");
  });
});

describe("autres prérequis", () => {
  it("bloque sans logement, sans titre, sans photo, sans animal", () => {
    const empty: SitPublishInput = {
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
      ids({ ...validInput(), galleryPhotoCount: 0, propertyPhotoCount: 1 }),
    ).not.toContain("photo");
    expect(
      ids({ ...validInput(), galleryPhotoCount: 0, hasCoverPhoto: true }),
    ).not.toContain("photo");
  });

  it("ne rend jamais l'identité vérifiée bloquante", () => {
    expect(getSitPublishBlockers(validInput())).toEqual([]);
  });

  it("propose une action de correction sur les éléments hors formulaire", () => {
    const blockers = getSitPublishBlockers({ ...validInput(), hasProperty: false });
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

describe("libellés des prérequis", () => {
  it("couvre tous les identifiants de bloquants du formulaire", () => {
    const requirementIds = SIT_PUBLISH_REQUIREMENTS.map((r) => r.id);
    expect(requirementIds).toEqual([
      "property",
      "title",
      "dates",
      "desc-reason",
      "desc-expectations",
      "photo",
      "pets",
    ]);
  });

  it("ne présente plus les dates comme dispensables", () => {
    const dates = SIT_PUBLISH_REQUIREMENTS.find((r) => r.id === "dates");
    expect(dates?.label).not.toMatch(/flexible/i);
  });
});
