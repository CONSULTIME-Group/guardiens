import { describe, it, expect } from "vitest";
import { computeAffinityScore, computeAffinityResultFull } from "../affinityScore";

describe("computeAffinityScore", () => {
  it("n'élimine jamais : 1 critère commun → score calculé, chiffre masqué (non fiable)", () => {
    // Doctrine lot affinité août 2026 : ON TRIE, ON N'ÉLIMINE JAMAIS.
    // computeAffinityScore retourne toujours un résultat ; seul le chiffre
    // affiché dépend de la fiabilité.
    const r = computeAffinityScore(
      { life_pace: "calme" },
      { life_pace: "calme" },
    );
    expect(r).not.toBeNull();
    expect(r!.displayed).toBe(false);
    expect(r!.scoreReliable).toBe(false);
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

  it("allergie au chat déclarée : pas d'élimination en liste, exclusion en distribution", () => {
    const owner = {
      life_pace: "calme",
      languages: ["Français"],
      interests: ["Lecture"],
      pets: [{ species: "cat" }],
    };
    const sitter = {
      life_pace: "calme",
      languages: ["Français"],
      interests: ["Lecture"],
      animal_types: ["cat"],
      sensitivities: ["Allergie aux chats"],
    };
    // Liste : le gardien reste, chiffre masqué, incompatibilité signalée.
    const r = computeAffinityScore(owner, sitter);
    expect(r).not.toBeNull();
    expect(r!.hasDeclaredIncompatibility).toBe(true);
    expect(r!.displayed).toBe(false);
    expect(r!.hiddenReason).toBe("disqualified");
    // Distribution : le refus déclaré est respecté, et seulement ça.
    const d = computeAffinityScore(owner, sitter, { mode: "distribution" });
    expect(d).not.toBeNull();
    expect(d.distributable).toBe(false);
  });

  it("dénominateur dynamique : 3 critères SOFT tous matchés → masqué (no_hard_criterion)", () => {
    // pace + langue + intérêts = 3 critères comparables mais AUCUN critère dur.
    // Depuis juillet 2026 : un badge d'affinité ne peut plus reposer uniquement
    // sur des soft (langues, intérêts, rythme, ambiance).
    const full = computeAffinityResultFull(
      {
        life_pace: "actif",
        languages: ["Français"],
        interests: ["Randonnée", "Vélo"],
      },
      {
        life_pace: "actif",
        languages: ["Français"],
        interests: ["Randonnée", "Vélo"],
      },
    );
    expect(full).not.toBeNull();
    expect(full!.total).toBe(3);
    expect(full!.score).toBe(100);
    expect(full!.displayed).toBe(false);
    expect(full!.hiddenReason).toBe("no_hard_criterion");
  });

  it("3 critères DONT un critère dur (présence) tous matchés = 100 %, affiché", () => {
    const full = computeAffinityResultFull(
      {
        presence_expected: "Absences courtes OK",
        languages: ["Français"],
        interests: ["Randonnée", "Vélo"],
      },
      {
        work_during_sit: "full_remote",
        languages: ["Français"],
        interests: ["Randonnée", "Vélo"],
      },
    );
    expect(full).not.toBeNull();
    expect(full!.total).toBe(3);
    expect(full!.score).toBe(100);
    expect(full!.displayed).toBe(true);
  });

  it("rythme adjacent + langue + intérêt commun (que du soft) → masqué", () => {
    const r = computeAffinityResultFull(
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
    expect(r!.displayed).toBe(false);
    expect(r!.hiddenReason).toBe("no_hard_criterion");
  });

  it("cohérence : profil owner partiel (3 critères) et sitter complet, tout matché = 100 %", () => {
    // Reproduit le bug /annonces vs /annonces/:slug : quand la vue détail
    // ne récupère que 3 critères owner et la vue liste en récupère 7, le
    // score doit rester identique (100 %) si tous les critères mesurables
    // matchent. La normalisation dynamique le garantit.
    const r = computeAffinityResultFull(
      {
        pets: [{ species: "cat" }],
        presence_expected: "Télétravail OK",
        preferred_sitter_types: ["Retraité·e"],
      },
      {
        animal_types: ["cat"],
        work_during_sit: "full_remote",
        sitter_type: "Retraité·e voyageur·euse",
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture"],
      },
    );
    expect(r).not.toBeNull();
    expect(r!.total).toBe(3);
    expect(r!.score).toBe(100);
    expect(r!.displayed).toBe(true);
  });


  it("refus des grands chiens déclaré : incompatibilité signalée, jamais d'élimination en liste", () => {
    // Sans race renseignée, la prudence s'applique : le refus est respecté
    // en distribution, le gardien reste listé en affichage. Le refus est
    // remonté même si le gardien n'a pas déclaré ses espèces (animal_types
    // vide) : un refus déclaré reste un refus.
    const owner = {
      life_pace: "calme",
      languages: ["Français"],
      interests: ["Lecture"],
      pets: [{ species: "dog" }],
    };
    const sitter = {
      life_pace: "calme",
      languages: ["Français"],
      interests: ["Lecture"],
      sensitivities: ["Pas de très grands chiens"],
    };
    const r = computeAffinityScore(owner, sitter);
    expect(r).not.toBeNull();
    expect(r!.hasDeclaredIncompatibility).toBe(true);
    expect(r!.hiddenReason).toBe("disqualified");
    const d = computeAffinityScore(owner, sitter, { mode: "distribution" });
    expect(d).not.toBeNull();
    expect(d.distributable).toBe(false);
  });

  it("« 100% sur place » sort du dénominateur : compatible par construction, rien à noter (défaut 1a)", () => {
    const r = computeAffinityResultFull(
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
    // pace(1) + langue(1) : la présence n'entre plus en compte.
    expect(r!.total).toBe(2);
    expect(r!.score).toBe(100);
    expect(r!.matched.some((m) => /présent|Absent/i.test(m))).toBe(false);
  });


  it("ambiance sportif outdoor match avec intérêts sportifs", () => {
    const r = computeAffinityResultFull(
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
    const r = computeAffinityResultFull(
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
    // Doctrine : le score sous le seuil reste calculé (tri), seul le chiffre
    // est masqué. computeAffinityScore ne retourne plus jamais null en liste.
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
    )).not.toBeNull();
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

  it("signale displayed:false avec raison no_hard_criterion quand aucun critère dur n'est évaluable", () => {
    const r = computeAffinityResultFull(
      { life_pace: "calme" },
      { life_pace: "calme" },
    );
    expect(r).not.toBeNull();
    expect(r!.displayed).toBe(false);
    expect(r!.hiddenReason).toBe("no_hard_criterion");
  });




  it("aucune espèce couverte : score bas affiché, gardien JAMAIS éliminé ni masqué", () => {
    // Doctrine : no_animal_species_match n'existe plus comme cause
    // d'exclusion ni de masquage. Le gardien moins pertinent descend dans
    // le tri avec un chiffre honnête, l'explication porte l'information.
    const r = computeAffinityResultFull(
      { pets: [{ species: "cat" }], life_pace: "calme", languages: ["Français"] },
      { animal_types: ["dog"], life_pace: "calme", languages: ["Français"] },
    );
    expect(r).not.toBeNull();
    // animaux 0/2 + rythme 1 + langue 1 = 2/4 = 50 %
    expect(r!.score).toBe(50);
    expect(r!.displayed).toBe(true);
    expect(r!.hiddenReason).toBeNull();
    expect(r!.explanation).toContain("Ne déclare pas d'expérience avec vos animaux");
    // Doctrine : pas un refus déclaré, donc distribuable (alertes incluses).
    expect(r!.distributable).toBe(true);
    expect(computeAffinityScore(
      { pets: [{ species: "cat" }], life_pace: "calme", languages: ["Français"] },
      { animal_types: ["dog"], life_pace: "calme", languages: ["Français"] },
    )).not.toBeNull();
  });

  it("garde-fou accompagnants : accepts_sitter_pets='no' + travels_with_own_animals=true = disqualification", () => {
    const r = computeAffinityResultFull(
      {
        pets: [{ species: "cat" }],
        accepts_sitter_pets: "no",
        life_pace: "calme",
        languages: ["Français"],
      },
      {
        animal_types: ["cat"],
        travels_with_own_animals: true,
        life_pace: "calme",
        languages: ["Français"],
      },
    );
    expect(r).not.toBeNull();
    expect(r!.hiddenReason).toBe("sitter_pets_not_accepted");
  });

  it("garde-fou accompagnants enfants : accepts='no' + travels=true", () => {
    const r = computeAffinityResultFull(
      { accepts_sitter_children: "no", life_pace: "calme", languages: ["Français"] },
      { travels_with_children: true, life_pace: "calme", languages: ["Français"] },
    );
    expect(r).not.toBeNull();
    expect(r!.hiddenReason).toBe("sitter_children_not_accepted");
  });

  it("accepts_sitter_pets='discuss' + travels=true : pas de disqualification mais note", () => {
    const r = computeAffinityResultFull(
      {
        pets: [{ species: "cat" }],
        accepts_sitter_pets: "discuss",
        presence_expected: "Télétravail OK",
        life_pace: "calme",
      },
      {
        animal_types: ["cat"],
        travels_with_own_animals: true,
        work_during_sit: "full_remote",
        life_pace: "calme",
      },
    );
    expect(r).not.toBeNull();
    expect(r!.hiddenReason).toBeNull();
    expect(r!.notes?.some((n) => /discuter/i.test(n))).toBe(true);
  });

  it("score 100 % : tous les critères évalués matchent (dénominateur dynamique)", () => {
    const r = computeAffinityScore(
      {
        pets: [{ species: "cat" }, { species: "cat" }],
        presence_expected: "Télétravail OK",
        preferred_sitter_types: ["Retraité·e"],
        home_ambiance: ["Cocon casanier"],
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture", "Jardinage"],
      },
      {
        animal_types: ["cat", "dog"],
        work_during_sit: "full_remote",
        sitter_type: "Retraité·e voyageur·euse",
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture", "Jardinage"],
      },
    );
    expect(r).not.toBeNull();
    expect(r!.score).toBe(100);
  });

  it("expansion NAC : gardien 'NAC' matche owner avec rongeur (pas de no_animal_species_match)", () => {
    const r = computeAffinityResultFull(
      {
        pets: [{ species: "rodent" }],
        presence_expected: "Télétravail OK",
        life_pace: "calme",
      },
      {
        animal_types: ["NAC"],
        work_during_sit: "full_remote",
        life_pace: "calme",
      },
    );
    expect(r).not.toBeNull();
    expect(r!.hiddenReason).not.toBe("no_animal_species_match");
    expect(r!.displayed).toBe(true);
    expect(r!.matched.some((m) => /animaux|expérience/i.test(m))).toBe(true);
  });

  it("no_hard_criterion : uniquement soft (langues + intérêts + ambiance) → masqué", () => {
    const r = computeAffinityResultFull(
      {
        home_ambiance: ["Cocon casanier"],
        languages: ["Français"],
        interests: ["Lecture", "Jardinage"],
      },
      {
        life_pace: "calme",
        languages: ["Français"],
        interests: ["Lecture", "Jardinage"],
      },
    );
    expect(r).not.toBeNull();
    expect(r!.displayed).toBe(false);
    expect(r!.hiddenReason).toBe("no_hard_criterion");
  });
});

describe("règles lot affinité 20/08/2026", () => {
  it("propriétaire sans animaux : critère animaux hors dénominateur, couple évaluable", () => {
    // Cas réel : Catherine (4584ccd1-58ef-4625-a414-72d49fca936b), 0 animal
    // enregistré, 2 critères évaluables. Avant : NULL sur tout le vivier,
    // Top 3 vide. Une garde sans animaux est une garde légitime.
    const r = computeAffinityResultFull(
      { life_pace: "calme", languages: ["Français"], pets: [] },
      { lifestyle: ["Tranquille / casanier"], languages: ["Français"] },
    );
    expect(r).not.toBeNull();
    expect(r.total).toBe(2);
    expect(r.score).toBe(100);
  });

  it("propriétaire sans animaux : le vivier entier reste classable, Top 3 toujours servi", () => {
    const owner = { life_pace: "calme", languages: ["Français"], pets: [] as { species?: string }[] };
    const pool = [
      { lifestyle: ["Tranquille / casanier"], languages: ["Français"] },
      { lifestyle: ["Sportif / grandes balades"], languages: ["Français"] },
      { languages: ["Anglais"] },
      { lifestyle: ["Famille", "Lève-tôt"], languages: ["Français", "Anglais"] },
    ];
    const scored = pool
      .map((s) => computeAffinityResultFull(owner, s))
      .sort((a, b) => b.score - a.score);
    expect(scored.length).toBe(pool.length); // personne n'est éliminé
    expect(scored.slice(0, 3)).toHaveLength(3); // Top 3 jamais vide
    expect(scored[0].score).toBeGreaterThanOrEqual(scored[2].score);
  });

  it("booléens à false = non renseigné : neutre, hors dénominateur, jamais pénalisant", () => {
    // farm_animals_ok false ne ferme PAS la porte aux chevaux si
    // animal_types les déclare (39 profils à true contre 84 « Chevaux »).
    const withFalse = computeAffinityResultFull(
      { pets: [{ species: "horse" }], life_pace: "calme", languages: ["Français"] },
      { animal_types: ["Chevaux"], farm_animals_ok: false, lifestyle: ["Tranquille / casanier"], languages: ["Français"] },
    );
    expect(withFalse.score).toBe(100);
    expect(withFalse.matched).toContain("A déjà gardé des chevaux");
    // travels_with_own_animals false ne déclenche aucun refus.
    const r = computeAffinityResultFull(
      { accepts_sitter_pets: "no", life_pace: "calme" },
      { travels_with_own_animals: false, lifestyle: ["Tranquille / casanier"] },
    );
    expect(r.hasDeclaredIncompatibility).toBe(false);
  });

  it("critère véhicule : voiture requise + véhicule déclaré = points, sinon neutre sans masquage", () => {
    const ownerBase = { car_required: true, life_pace: "calme", languages: ["Français"] };
    const withCar = computeAffinityResultFull(ownerBase, {
      has_vehicle: true, lifestyle: ["Tranquille / casanier"], languages: ["Français"],
    });
    expect(withCar.matched).toContain("Véhiculé, comme vous le souhaitez");
    const withoutCar = computeAffinityResultFull(ownerBase, {
      has_vehicle: false, has_license: false, lifestyle: ["Tranquille / casanier"], languages: ["Français"],
    });
    // Silence neutre (défaut 3, 20/08/2026) : le critère sort du
    // dénominateur, le score BRUT n'est pas pénalisé. C'est le score de
    // tri, pondéré par la confiance, qui fait descendre le profil muet,
    // et l'explication reste affichée (c'est elle qui porte l'info).
    expect(withoutCar.score).toBe(withCar.score);
    expect(withoutCar.sortScore).toBeLessThan(withCar.sortScore);
    expect(withoutCar.explanation.some((e) => /véhicule/i.test(e))).toBe(true);
    // Le permis seul compte comme mobilité déclarée.
    const licenseOnly = computeAffinityResultFull(ownerBase, {
      has_license: true, lifestyle: ["Tranquille / casanier"], languages: ["Français"],
    });
    expect(licenseOnly.matched).toContain("Véhiculé, comme vous le souhaitez");
    // Voiture non requise : le critère sort du dénominateur.
    const notRequired = computeAffinityResultFull(
      { car_required: false, life_pace: "calme" },
      { has_vehicle: true, lifestyle: ["Tranquille / casanier"] },
    );
    expect(notRequired.total).toBe(1);
  });

  it("défaut 1 : un gardien totalement silencieux n'obtient plus 100 %", () => {
    // Cas mesuré le 20/08/2026 : 362 gardiens sans AUCUNE déclaration
    // obtenaient 100 % chez un propriétaire « 100% sur place », car la
    // présence, compatible par construction, leur donnait 2/2.
    const r = computeAffinityResultFull(
      { presence_expected: "100% sur place", life_pace: "calme", languages: ["Français"] },
      {},
    );
    expect(r.total).toBe(0);
    expect(r.score).toBe(0);
    expect(r.confidence).toBe(0);
    expect(r.sortScore).toBe(0);
  });

  it("défaut 1b : le tri utilise le score pondéré par la confiance, pas le score brut", () => {
    const owner = {
      pets: [{ species: "dog" }],
      life_pace: "calme",
      languages: ["Français"],
      interests: ["Randonnée"],
    };
    // Gardien presque vide : une seule langue commune, score brut 100.
    const silencieux = computeAffinityResultFull(owner, { languages: ["Français"] });
    // Gardien documenté : animaux + langue matchés, un intérêt commun,
    // rythme opposé déclaré, score brut 70.
    const documente = computeAffinityResultFull(owner, {
      animal_types: ["Chiens"],
      languages: ["Français"],
      interests: ["Randonnée"],
      life_pace: "actif",
    });
    expect(silencieux.score).toBe(100);
    expect(documente.score).toBe(70);
    // Le chiffre affiché reste le score brut ; le CLASSEMENT inverse l'ordre.
    expect(documente.sortScore).toBeGreaterThan(silencieux.sortScore);
  });

  it("défaut 2 : beaucoup de tags d'ambiance ne gonflent plus le poids du critère", () => {
    // Mesuré : un propriétaire à 7 tags faisait peser l'ambiance 7 contre 2
    // pour les animaux. Le critère pèse désormais 1, moyenne des tags.
    const unTag = computeAffinityResultFull(
      { home_ambiance: ["Calme et posé"], languages: ["Français"] },
      { life_pace: "calme", languages: ["Français"] },
    );
    const cinqTags = computeAffinityResultFull(
      {
        home_ambiance: ["Calme et posé", "Cocon casanier", "Sportif outdoor", "Campagne", "Famille animée"],
        languages: ["Français"],
      },
      { life_pace: "calme", languages: ["Français"] },
    );
    // Même nombre de critères évalués : le dénominateur ne gonfle pas.
    expect(cinqTags.total).toBe(unTag.total);
    // Les points sont la moyenne par tag : (1+1+0+0+0,5)/5 = 0,5 sur 1.
    expect(unTag.score).toBe(100);
    expect(cinqTags.score).toBe(75);
  });


  it("présence : repli sur availability_during quand work_during_sit est vide", () => {
    const r = computeAffinityResultFull(
      { presence_expected: "Télétravail OK" },
      { availability_during: "En télétravail" },
    );
    expect(r.matched).toContain("Télétravaille, donc présent en journée");
  });

  it("rythme : lifestyle prime, life_pace en repli, mixte actif+calme = équilibré", () => {
    // lifestyle actif + life_pace contradictoire : lifestyle fait foi.
    const r1 = computeAffinityResultFull(
      { life_pace: "actif" },
      { lifestyle: ["Sportif / grandes balades"], life_pace: "calme" },
    );
    expect(r1.matched).toContain("Rythme actif, comme vous");
    // lifestyle vide : repli sur life_pace.
    const r2 = computeAffinityResultFull(
      { life_pace: "calme" },
      { lifestyle: [], life_pace: "calme" },
    );
    expect(r2.matched).toContain("Rythme calme, comme vous");
    // mixte actif + calme : rythme équilibré, match avec un owner équilibré.
    const r3 = computeAffinityResultFull(
      { life_pace: "equilibre" },
      { lifestyle: ["Sportif / grandes balades", "Tranquille / casanier"] },
    );
    expect(r3.matched).toContain("Rythme équilibré, comme vous");
  });
});

describe("règle des deux côtés (20/08/2026)", () => {
  it("« Sans préférence » seul : le critère profil idéal sort du dénominateur et de la confiance", () => {
    const sitter = { life_pace: "calme" };
    const sans = computeAffinityResultFull(
      { life_pace: "calme", preferred_sitter_types: ["Sans préférence"] },
      sitter,
    );
    const vide = computeAffinityResultFull({ life_pace: "calme" }, sitter);
    expect(sans.total).toBe(vide.total);
    expect(sans.score).toBe(vide.score);
    expect(sans.confidence).toBe(vide.confidence);
    // Résidu technique historique : même traitement.
    const legacy = computeAffinityResultFull(
      { life_pace: "calme", preferred_sitter_types: ["no_preference"] },
      sitter,
    );
    expect(legacy.total).toBe(vide.total);
  });

  it("« Gardien·ne expérimenté·e » : satisfait par experience_years déclaré hors Débutant", () => {
    const owner = { preferred_sitter_types: ["Gardien·ne expérimenté·e"] };
    const ok = computeAffinityResultFull(owner, { experience_years: "3-5 ans" });
    expect(ok.total).toBe(1);
    expect(ok.score).toBe(100);
    expect(ok.matched).toContain("Gardien expérimenté, comme vous le demandez");
    // « Débutant » déclaré : évalué, pas satisfait.
    const debutant = computeAffinityResultFull(owner, { experience_years: "Débutant" });
    expect(debutant.total).toBe(1);
    expect(debutant.score).toBe(0);
    expect(debutant.matched).not.toContain("Gardien expérimenté, comme vous le demandez");
    // Rien de déclaré : critère hors dénominateur, jamais pénalisant.
    const silence = computeAffinityResultFull(owner, {});
    expect(silence.total).toBe(0);
  });

  it("« Débutant·e motivé·e » : seul « Débutant » explicite matche, le silence reste neutre", () => {
    const owner = { preferred_sitter_types: ["Débutant·e motivé·e"] };
    const ok = computeAffinityResultFull(owner, { experience_years: "Débutant" });
    expect(ok.total).toBe(1);
    expect(ok.matched).toContain("Débutant motivé, comme vous le demandez");
    const senior = computeAffinityResultFull(owner, { experience_years: "5+ ans" });
    expect(senior.total).toBe(1);
    expect(senior.score).toBe(0);
    // Le vide n'est pas débutant : critère non évalué.
    const silence = computeAffinityResultFull(owner, {});
    expect(silence.total).toBe(0);
  });

  it("« Télétravailleur·euse » : full/partial remote matchent, repli availability_during", () => {
    const owner = { preferred_sitter_types: ["Télétravailleur·euse"] };
    const full = computeAffinityResultFull(owner, { work_during_sit: "full_remote" });
    expect(full.matched).toContain("Télétravailleur, comme vous le souhaitez");
    const partial = computeAffinityResultFull(owner, { work_during_sit: "partial_remote" });
    expect(partial.matched).toContain("Télétravailleur, comme vous le souhaitez");
    const onSite = computeAffinityResultFull(owner, { work_during_sit: "on_site" });
    expect(onSite.total).toBe(1);
    expect(onSite.score).toBe(0);
    // Repli availability_during, même résolution que le critère présence.
    const fallback = computeAffinityResultFull(owner, { availability_during: "En télétravail" });
    expect(fallback.matched).toContain("Télétravailleur, comme vous le souhaitez");
  });

  it("« Étudiant·e » et « Indépendant·e » : descriptives, hors dénominateur et confiance", () => {
    const sitter = { life_pace: "calme" };
    const desc = computeAffinityResultFull(
      { life_pace: "calme", preferred_sitter_types: ["Étudiant·e", "Indépendant·e"] },
      sitter,
    );
    const vide = computeAffinityResultFull({ life_pace: "calme" }, sitter);
    expect(desc.total).toBe(vide.total);
    expect(desc.confidence).toBe(vide.confidence);
  });

  it("préférences mixtes : scorable évalué même si une descriptive est cochée", () => {
    const r = computeAffinityResultFull(
      { preferred_sitter_types: ["Étudiant·e", "Couple"] },
      { sitter_type: "Couple" },
    );
    expect(r.total).toBe(1);
    expect(r.matched).toContain("Couple, comme vous le souhaitez");
  });

  it("alias d'ambiance : « Cosy » est scoré comme « Cocon casanier »", () => {
    const alias = computeAffinityResultFull(
      { home_ambiance: ["Cosy"] },
      { life_pace: "calme" },
    );
    const canon = computeAffinityResultFull(
      { home_ambiance: ["Cocon casanier"] },
      { life_pace: "calme" },
    );
    expect(alias.matched).toContain("Aime le cocooning, comme vous");
    expect(alias.score).toBe(canon.score);
    expect(alias.confidence).toBe(canon.confidence);
  });

  it("tags d'environnement : descriptifs, hors dénominateur et confiance", () => {
    const sitter = { life_pace: "calme" };
    const env = computeAffinityResultFull(
      { life_pace: "calme", home_ambiance: ["Urbain", "Montagne", "Bord de mer"] },
      sitter,
    );
    const vide = computeAffinityResultFull({ life_pace: "calme" }, sitter);
    expect(env.total).toBe(vide.total);
    expect(env.confidence).toBe(vide.confidence);
  });

  it("alias + canonique dédupliqués : « Calme » et « Calme et posé » comptent une seule fois", () => {
    const doublon = computeAffinityResultFull(
      { home_ambiance: ["Calme", "Calme et posé"] },
      { life_pace: "calme" },
    );
    const seul = computeAffinityResultFull(
      { home_ambiance: ["Calme et posé"] },
      { life_pace: "calme" },
    );
    expect(doublon.score).toBe(seul.score);
  });
});



