import { describe, it, expect } from "vitest";
import { computeAffinityScore, computeAffinityResultFull } from "../affinityScore";

describe("computeAffinityScore", () => {
  it("renvoie null si moins de 3 critères communs", () => {
    const r = computeAffinityScore(
      { life_pace: "calme" },
      { life_pace: "calme" },
    );
    expect(r).toBeNull();
  });

  it("calcule un score élevé quand tout matche", () => {
    const r = computeAffinityScore(
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture", "Jardinage"],
        presence_expected: "Télétravail OK",
        preferred_sitter_types: ["Retraité·e"],
        home_ambiance: ["Cocon casanier"],
        pets: [{ species: "cat" }],
      },
      {
        life_pace: "calme",
        languages: ["Français", "Anglais"],
        interests: ["Lecture", "Jardinage"],
        work_during_sit: "full_remote",
        sitter_type: "Retraité·e voyageur·euse",
        animal_types: ["cat"],
      },
    );
    expect(r).not.toBeNull();
    expect(r!.score).toBeGreaterThanOrEqual(90);
    expect(r!.total).toBeGreaterThanOrEqual(5);
  });

  it("disqualifie un sitter allergique au chat si l'owner a un chat", () => {
    const r = computeAffinityScore(
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture"],
        pets: [{ species: "cat" }],
      },
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture"],
        animal_types: ["cat"],
        sensitivities: ["Allergie aux chats"],
      },
    );
    expect(r).toBeNull();
  });

  it("ignore les champs absents sans pénaliser", () => {
    const r = computeAffinityScore(
      {
        life_pace: "actif",
        languages: ["Français"],
        interests: ["Randonnée"],
      },
      {
        life_pace: "actif",
        languages: ["Français"],
        interests: ["Randonnée", "Vélo"],
      },
    );
    expect(r).not.toBeNull();
    expect(r!.total).toBe(3);
    expect(r!.score).toBeGreaterThanOrEqual(80);
  });

  it("rythme adjacent donne demi-point", () => {
    const r = computeAffinityScore(
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture"],
      },
      {
        life_pace: "equilibre",
        languages: ["Français"],
        interests: ["Lecture"],
      },
    );
    expect(r).not.toBeNull();
    // 3 critères : rythme 0.5, langue 1, intérêts 0.5 = 2/3 ≈ 67
    expect(r!.score).toBeGreaterThanOrEqual(60);
    expect(r!.score).toBeLessThanOrEqual(75);
  });

  it("disqualifie un sitter qui refuse les chiens si l'owner a un chien", () => {
    const r = computeAffinityScore(
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture"],
        pets: [{ species: "dog" }],
      },
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture"],
        sensitivities: ["Pas de très grands chiens"],
      },
    );
    expect(r).toBeNull();
  });

  it("présence 100% sur place est compatible avec n'importe quel rythme de travail", () => {
    const r = computeAffinityScore(
      {
        presence_expected: "100% sur place",
        life_pace: "calme",
        languages: ["Français"],
      },
      {
        work_during_sit: "on_site",
        life_pace: "calme",
        languages: ["Français"],
      },
    );
    expect(r).not.toBeNull();
    expect(r!.score).toBeGreaterThanOrEqual(90);
  });

  it("ambiance sportif outdoor match avec intérêts sportifs", () => {
    const r = computeAffinityScore(
      {
        home_ambiance: ["Sportif outdoor"],
        life_pace: "actif",
        languages: ["Français"],
        interests: ["Randonnée"],
      },
      {
        life_pace: "actif",
        languages: ["Français"],
        interests: ["Randonnée", "Vélo"],
      },
    );
    expect(r).not.toBeNull();
    expect(r!.matched.some((m) => /ambiance/i.test(m))).toBe(true);
  });

  it("ne plante pas si special_needs est fourni (bonus retiré)", () => {
    const r = computeAffinityScore(
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture"],
        pets: [{ species: "dog", special_needs: "Injections quotidiennes" }],
      },
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture"],
        special_animal_skills: ["Injections"],
      },
    );
    expect(r).not.toBeNull();
    expect(r!.matched.some((m) => /compétence/i.test(m))).toBe(false);
  });

  it("masque le badge sous le seuil de confiance (40 %)", () => {
    // 4 critères communs, presque rien ne matche → score < 40
    const r = computeAffinityResultFull(
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture"],
        presence_expected: "Absences courtes OK",
      },
      {
        life_pace: "actif",
        languages: ["Allemand"],
        interests: ["Vélo"],
        work_during_sit: "out_daytime",
      },
    );
    expect(r).not.toBeNull();
    expect(r!.displayed).toBe(false);
    expect(r!.hiddenReason).toBe("below_threshold");
    expect(computeAffinityScore(
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture"],
        presence_expected: "Absences courtes OK",
      },
      {
        life_pace: "actif",
        languages: ["Allemand"],
        interests: ["Vélo"],
        work_during_sit: "out_daytime",
      },
    )).toBeNull();
  });

  it("pondération : animaux + présence pèsent plus que langues + intérêts", () => {
    // Cas A : animaux + présence matchent, langues + intérêts NON
    const a = computeAffinityResultFull(
      {
        pets: [{ species: "cat" }],
        presence_expected: "Télétravail OK",
        languages: ["Français"],
        interests: ["Lecture"],
      },
      {
        animal_types: ["cat"],
        work_during_sit: "full_remote",
        languages: ["Allemand"],
        interests: ["Vélo"],
      },
    );
    // Cas B : inverse, langues + intérêts matchent, animaux + présence NON
    const b = computeAffinityResultFull(
      {
        pets: [{ species: "cat" }],
        presence_expected: "Absences courtes OK",
        languages: ["Français"],
        interests: ["Lecture"],
      },
      {
        animal_types: ["dog"],
        work_during_sit: "out_daytime",
        languages: ["Français"],
        interests: ["Lecture", "Jardinage"],
      },
    );
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    // Critères durs matchés > nice-to-have matchés
    expect(a!.score).toBeGreaterThan(b!.score);
  });

  it("signale displayed:false avec raison too_few_criteria sous 3 critères communs", () => {
    const r = computeAffinityResultFull(
      { life_pace: "calme", languages: ["Français"] },
      { life_pace: "calme", languages: ["Français"] },
    );
    expect(r).not.toBeNull();
    expect(r!.displayed).toBe(false);
    expect(r!.hiddenReason).toBe("too_few_criteria");
  });
});


