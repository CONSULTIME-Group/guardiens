/**
 * Verrous sur l'exclusivité des tags d'ambiance (décision du 23/08/2026).
 *
 * La règle déterministe « le dernier tag déclaré l'emporte » est commune
 * au formulaire (OwnerStepRules, OnboardingAffinity) et à la migration de
 * nettoyage des profils existants. Si la carte des conflits diverge des
 * options du formulaire, ce test casse.
 */
import { describe, it, expect } from "vitest";
import {
  HOME_AMBIANCE_CONFLICTS,
  HOME_AMBIANCE_SCORED_OPTIONS,
  resolveAmbianceConflicts,
} from "../profileMatchingOptions";

describe("HOME_AMBIANCE_CONFLICTS", () => {
  it("ne référence que des tags scorés existants", () => {
    for (const [tag, conflicts] of Object.entries(HOME_AMBIANCE_CONFLICTS)) {
      expect(HOME_AMBIANCE_SCORED_OPTIONS).toContain(tag);
      for (const c of conflicts) {
        expect(HOME_AMBIANCE_SCORED_OPTIONS).toContain(c);
      }
    }
  });

  it("est strictement symétrique", () => {
    for (const [tag, conflicts] of Object.entries(HOME_AMBIANCE_CONFLICTS)) {
      for (const c of conflicts) {
        expect(HOME_AMBIANCE_CONFLICTS[c], `${c} doit déclarer ${tag} en retour`).toContain(tag);
      }
    }
  });

  it("ne déclare pas contradictoires Campagne et Famille animée", () => {
    expect(HOME_AMBIANCE_CONFLICTS["Campagne"]).toBeUndefined();
    expect(HOME_AMBIANCE_CONFLICTS["Famille animée"]).toBeUndefined();
  });
});

describe("resolveAmbianceConflicts", () => {
  it("rend le tableau inchangé sans contradiction", () => {
    const tags = ["Campagne", "Calme et posé", "Cocon casanier", "Urbain"];
    const r = resolveAmbianceConflicts(tags);
    expect(r.value).toEqual(tags);
    expect(r.removed).toEqual([]);
  });

  it("le dernier tag déclaré l'emporte (sport après calme)", () => {
    const r = resolveAmbianceConflicts(["Calme et posé", "Sportif outdoor"]);
    expect(r.value).toEqual(["Sportif outdoor"]);
    expect(r.removed).toEqual(["Calme et posé"]);
  });

  it("le dernier tag déclaré l'emporte (calme après sport)", () => {
    const r = resolveAmbianceConflicts(["Sportif outdoor", "Cocon casanier"]);
    expect(r.value).toEqual(["Cocon casanier"]);
    expect(r.removed).toEqual(["Sportif outdoor"]);
  });

  it("un gagnant côté calme conserve les deux tags calmes", () => {
    const r = resolveAmbianceConflicts(["Sportif outdoor", "Cocon casanier", "Calme et posé"]);
    expect(r.value).toEqual(["Cocon casanier", "Calme et posé"]);
    expect(r.removed).toEqual(["Sportif outdoor"]);
  });

  it("un gagnant côté sport retire tous les tags calmes", () => {
    const r = resolveAmbianceConflicts(["Calme et posé", "Campagne", "Cocon casanier", "Sportif outdoor"]);
    expect(r.value).toEqual(["Campagne", "Sportif outdoor"]);
    expect(r.removed).toEqual(["Calme et posé", "Cocon casanier"]);
  });

  it("préserve les tags d'environnement et l'ordre relatif", () => {
    const r = resolveAmbianceConflicts(["Bord de mer", "Calme et posé", "Sportif outdoor", "Maison de vacances"]);
    expect(r.value).toEqual(["Bord de mer", "Sportif outdoor", "Maison de vacances"]);
  });

  it("un tableau vide ou sans tag en conflit passe tel quel", () => {
    expect(resolveAmbianceConflicts([]).value).toEqual([]);
    expect(resolveAmbianceConflicts(["Urbain", "Montagne"]).removed).toEqual([]);
  });
});
