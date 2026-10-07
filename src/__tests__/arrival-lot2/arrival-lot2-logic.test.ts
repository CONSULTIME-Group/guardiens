import { describe, it, expect, vi } from "vitest";
import {
  afterG1, afterG3, afterN1, afterWelcome, arrivalIntentFor, isExplicitNext, n1Mode, pickFirstSteps, stepsToReach, toggleAnimals,
  ARRIVAL_ANIMALS, ARRIVAL_SITTER_TYPE_OPTIONS, ARRIVAL_WORK_OPTIONS,
} from "@/lib/arrival";
import { SITTER_TYPE_OPTIONS, WORK_DURING_SIT_OPTIONS, SITTER_ANIMAL_TYPES_OPTIONS } from "@/lib/profileMatchingOptions";
import { buildG4Writes } from "@/pages/arrival/ArriveeSavoirFaire";
import { entraideCreateUrl } from "@/pages/arrival/ArriveeEntraide";
import { deriveCategoriesFromCompetences } from "@/lib/skills/categories";

describe("lot 2, enchaînements", () => {
  it("intention : owner, sitter, entraide ; polyvalent sans intention garde la destination", () => {
    expect(arrivalIntentFor("sitter", false)).toBe("sitter");
    expect(arrivalIntentFor("both", true)).toBe("entraide");
    expect(arrivalIntentFor("both", false)).toBeNull();
    expect(afterWelcome(null, "/sits/create?source=signup")).toBe("/sits/create?source=signup");
  });
  it("redirection explicite : reprend après G3 (gardien) et après G1 (entraide)", () => {
    expect(isExplicitNext("/dashboard")).toBe(false);
    expect(isExplicitNext("/annonces/1")).toBe(true);
    expect(afterG3({ flow: "sitter", next: "/annonces/1" })).toBe("/annonces/1");
    expect(afterG3({ flow: "sitter" })).toBe("/arrivee/savoir-faire?flow=sitter");
    expect(afterG1({ flow: "entraide", next: "/annonces/1" })).toBe("/annonces/1");
    expect(afterG1({ flow: "entraide" })).toBe("/arrivee/entraide");
  });
  it("propriétaire : G3 vers N1 sans coup de main, N1 vers l'annonce", () => {
    expect(afterG3({ flow: "owner", sit: "s1" })).toBe("/arrivee/application?flow=owner&sit=s1");
    expect(afterN1({ flow: "owner", sit: "s1" })).toBe("/sits/s1");
    expect(afterN1({ flow: "owner" })).toBe("/dashboard");
  });
});

describe("lot 2, G2", () => {
  it("libellés reliés aux valeurs existantes", () => {
    expect(ARRIVAL_WORK_OPTIONS.map((o) => o.value)).toEqual(WORK_DURING_SIT_OPTIONS.map((o) => o.value));
    expect(ARRIVAL_SITTER_TYPE_OPTIONS.map((o) => o.value)).toEqual(SITTER_TYPE_OPTIONS);
    expect(ARRIVAL_ANIMALS).toEqual(SITTER_ANIMAL_TYPES_OPTIONS);
  });
  it("« Tous » coche l'ensemble", () => {
    expect(toggleAnimals([], ["Tous"])).toEqual(ARRIVAL_ANIMALS);
    expect(toggleAnimals(ARRIVAL_ANIMALS, ARRIVAL_ANIMALS.filter((a) => a !== "Chats"))).not.toContain("Tous");
    expect(toggleAnimals(ARRIVAL_ANIMALS, ARRIVAL_ANIMALS.filter((a) => a !== "Tous"))).toEqual([]);
  });
});

describe("lot 2, G4 et E1", () => {
  it("rien n'est écrit sans choix ; un choix pose available_for_help", () => {
    expect(buildG4Writes([], "")).toBeNull();
    expect(buildG4Writes(["Courses"], "")).toMatchObject({ available_for_help: true, skill_categories: ["coups_de_main"] });
  });
  it("trajets et jeux classés", () => {
    expect(deriveCategoriesFromCompetences(["Trajets en voiture"])).toEqual(["coups_de_main"]);
    expect(deriveCategoriesFromCompetences(["Jeux de société"])).toEqual(["competences"]);
  });
  it("E1 : formulaire existant pré-rempli", () => {
    expect(entraideCreateUrl("Monter une étagère")).toBe("/petites-missions/creer?titre=Monter+une+%C3%A9tag%C3%A8re&description=Monter+une+%C3%A9tag%C3%A8re");
  });
});

describe("lot 2, N1 et G5", () => {
  it("N1 : sauté si abonné ou non pris en charge", () => {
    expect(n1Mode({ support: "unsupported", subscribed: false })).toBe("skip");
    expect(n1Mode({ support: "supported", subscribed: true })).toBe("skip");
    expect(n1Mode({ support: "ios-install", subscribed: false })).toBe("ios-install");
  });
  it("G5b : aucune garde à 30 km, les deux plus proches quelle que soit la distance", () => {
    const r = pickFirstSteps([{ id: "a", distanceKm: 210 }, { id: "b", distanceKm: null }, { id: "c", distanceKm: 75 }, { id: "d", distanceKm: 140 }]);
    expect(r.hasNear).toBe(false);
    expect(r.closest.map((s) => s.id)).toEqual(["c", "d"]);
    expect(r.total).toBe(4);
  });
  it("G5 : meilleure garde à 30 km ou moins", () => {
    const r = pickFirstSteps([{ id: "a", distanceKm: 28 }, { id: "b", distanceKm: 12 }, { id: "c", distanceKm: 40 }]);
    expect(r.best?.id).toBe("b");
    expect(r.nearCount).toBe(2);
  });
  it("étapes exactes pour candidater", () => {
    expect(stepsToReach(25, [5, 10, 20], 40)).toBe(1);
    expect(stepsToReach(10, [5, 10, 10], 40)).toBe(3);
    expect(stepsToReach(45, [10], 40)).toBe(0);
  });
});
