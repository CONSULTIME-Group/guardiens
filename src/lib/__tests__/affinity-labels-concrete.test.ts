import { describe, it, expect } from "vitest";
import { computeAffinityResultFull } from "../affinityScore";

/**
 * RÈGLE DES LIBELLÉS (décision de Jérémie, 21/08/2026) : chaque phrase
 * produite par le moteur nomme la chose concrète issue des données du
 * couple. Une phrase qui pourrait s'appliquer à n'importe qui n'apprend
 * rien à personne (« Expérience avec vos animaux », « Même rythme de vie »,
 * « 2 intérêts communs » sont interdits).
 *
 * Méthode : on injecte des valeurs SENTINELLES dans le couple et on exige
 * de les retrouver dans les phrases. Aucune liste de gabarits figés n'est
 * utilisée ici : si le moteur redevient générique, les sentinelles
 * disparaissent des phrases et le test échoue.
 */

describe("règle des libellés : chaque phrase nomme la donnée du couple", () => {
  it("animaux, couverture totale : les espèces sont nommées", () => {
    const r = computeAffinityResultFull(
      { pets: [{ species: "dog" }, { species: "cat" }] },
      { animal_types: ["Chiens", "Chats"] },
    );
    const phrase = r.matched.find((m) => m.startsWith("A déjà gardé"));
    expect(phrase).toBeDefined();
    expect(phrase).toContain("chiens");
    expect(phrase).toContain("chats");
  });

  it("animaux, couverture partielle : ce qui manque est nommé", () => {
    const r = computeAffinityResultFull(
      { pets: [{ species: "dog" }, { species: "cat" }] },
      { animal_types: ["Chats"] },
    );
    const phrase = r.matched.find((m) => m.startsWith("A déjà gardé"));
    expect(phrase).toBeDefined();
    expect(phrase).toContain("vos chats");
    expect(phrase).toContain("pas vos chiens");
  });

  it("animaux, aucune couverture : l'explication nomme les espèces", () => {
    const r = computeAffinityResultFull(
      { pets: [{ species: "horse" }] },
      { animal_types: ["Chiens"] },
    );
    expect(r.explanation.some((e) => e.includes("chevaux"))).toBe(true);
  });

  it("présence : le fait déclaré est nommé, et change avec la déclaration", () => {
    const owner = { presence_expected: "Télétravail OK" };
    const full = computeAffinityResultFull(owner, { work_during_sit: "full_remote" });
    const flexible = computeAffinityResultFull(owner, { work_during_sit: "flexible" });
    expect(full.matched.some((m) => m.includes("Télétravaille"))).toBe(true);
    expect(flexible.matched.some((m) => m.includes("congés") || m.includes("flexibles"))).toBe(true);
    // Deux déclarations différentes ne produisent pas la même phrase.
    expect(full.matched).not.toEqual(flexible.matched);
  });

  it("rythme : la valeur commune est nommée", () => {
    const r = computeAffinityResultFull(
      { life_pace: "calme" },
      { life_pace: "calme" },
    );
    expect(r.matched).toContain("Rythme calme, comme vous");
  });

  it("langues : la langue commune est nommée", () => {
    const r = computeAffinityResultFull(
      { languages: ["Espagnol"] },
      { languages: ["Espagnol"] },
    );
    expect(r.matched.some((m) => m.includes("espagnol"))).toBe(true);
  });

  it("intérêts : les intérêts communs sont nommés (sentinelle)", () => {
    const sentinelle = "ZZZ Sentinelle Quantique";
    const r = computeAffinityResultFull(
      { interests: [sentinelle, "Lecture"] },
      { interests: [sentinelle, "Lecture"] },
    );
    const phrase = r.matched.find((m) => m.endsWith("en commun"));
    expect(phrase).toBeDefined();
    expect(phrase).toContain(sentinelle);
    expect(phrase).toContain("lecture");
  });

  it("ambiance : le tag qui matche est nommé", () => {
    const r = computeAffinityResultFull(
      { home_ambiance: ["Calme et posé"] },
      { life_pace: "calme" },
    );
    expect(r.matched).toContain("Aime le calme, comme vous");
  });

  it("profil idéal : le type de gardien est nommé", () => {
    const couple = computeAffinityResultFull(
      { preferred_sitter_types: ["Couple"] },
      { sitter_type: "Couple" },
    );
    expect(couple.matched.some((m) => m.includes("Couple"))).toBe(true);
    const xp = computeAffinityResultFull(
      { preferred_sitter_types: ["Gardien·ne expérimenté·e"] },
      { experience_years: "3-5 ans" },
    );
    expect(xp.matched.some((m) => m.includes("expérimenté"))).toBe(true);
  });

  it("véhicule : « Véhiculé » suffit (fait binaire)", () => {
    const r = computeAffinityResultFull(
      { car_required: true },
      { has_vehicle: true },
    );
    expect(r.matched.some((m) => m.startsWith("Véhiculé"))).toBe(true);
  });

  it("besoins spéciaux : la compétence couverte est nommée", () => {
    const r = computeAffinityResultFull(
      { pets: [{ species: "dog", special_needs: "insuline quotidienne" }] },
      { special_animal_skills: ["Injection insuline / diabète"] },
    );
    expect(r.matched.some((m) => m.includes("injection insuline"))).toBe(true);
  });

  it("distance : les kilomètres sont nommés", () => {
    const r = computeAffinityResultFull(
      { distance_km: 12 },
      {},
    );
    expect(r.matched).toContain("À 12 km de chez vous");
  });
});

describe("distance, 9e critère (décision du 21/08/2026)", () => {
  const owner = { life_pace: "calme" };
  const sitter = { life_pace: "calme" };

  it("paliers : 30/60/100 km, jamais 0 point", () => {
    const at = (km: number) =>
      computeAffinityResultFull({ ...owner, distance_km: km }, sitter);
    // Même couple, seule la distance varie : le score doit baisser par palier.
    expect(at(10).score).toBeGreaterThan(at(45).score);
    expect(at(45).score).toBeGreaterThan(at(80).score);
    expect(at(80).score).toBeGreaterThan(at(150).score);
    // Au-delà de 100 km : 0,25 point, jamais 0 (le rayon déclaré le couvre).
    const loin = computeAffinityResultFull({ distance_km: 150 }, {});
    expect(loin.score).toBe(25);
    expect(loin.total).toBe(1);
  });

  it("distance inconnue : critère hors dénominateur, jamais pénalisant", () => {
    const sans = computeAffinityResultFull(owner, sitter);
    const nul = computeAffinityResultFull({ ...owner, distance_km: null }, sitter);
    expect(sans.score).toBe(nul.score);
    expect(sans.total).toBe(nul.total);
    // Distance connue proche : le score monte.
    const proche = computeAffinityResultFull({ ...owner, distance_km: 5 }, sitter);
    expect(proche.score).toBeGreaterThan(sans.score);
  });
});
