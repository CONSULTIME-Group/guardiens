import { describe, it, expect } from "vitest";
import {
  validateHeroBank,
  DEFAULT_HERO_WEIGHTS,
  HERO_BANK,
} from "./heroBank";

describe("validateHeroBank", () => {
  it("la banque actuelle (100 images, poids 40/20/20/20) est valide", () => {
    const report = validateHeroBank();
    expect(report.ok).toBe(true);
    expect(report.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(report.totalImages).toBe(HERO_BANK.length);
    expect(report.perCategory.animals).toBe(70);
    expect(report.perCategory.home).toBe(10);
    expect(report.perCategory.mutual_aid).toBe(10);
    expect(report.perCategory.village).toBe(10);
  });

  it("rejette tous les poids à 0", () => {
    const report = validateHeroBank({
      animals: 0,
      home: 0,
      mutual_aid: 0,
      village: 0,
    });
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "empty_category")).toBe(true);
  });

  it("signale une catégorie vide quand la banque est trop petite pour la couvrir", () => {
    // Banque tronquée à 75 → la catégorie 'mutual_aid' (81-90) et 'village' (91-100)
    // n'existent plus.
    const report = validateHeroBank(DEFAULT_HERO_WEIGHTS, 75);
    expect(report.ok).toBe(false);
    const codes = report.issues.map((i) => i.code);
    expect(codes).toContain("out_of_bounds");
  });

  it("accepte qu'une catégorie soit vide SI son poids est 0", () => {
    // On retire totalement 'mutual_aid' et 'village' des poids :
    // tronquer la banque à 80 ne devrait plus être bloquant côté trafic,
    // mais reste hors-bornes → erreur 'out_of_bounds' toujours levée.
    const report = validateHeroBank(
      { animals: 80, home: 20, mutual_aid: 0, village: 0 },
      80
    );
    // out_of_bounds reste légitime (intégrité structurelle), mais aucune
    // erreur 'empty_category' ne doit apparaître pour mutual_aid/village.
    const emptyErrors = report.issues.filter(
      (i) => i.code === "empty_category"
    );
    expect(emptyErrors).toEqual([]);
  });

  it("émet un warning quand une catégorie est sous-fournie par rapport à son poids", () => {
    // On augmente massivement le poids de 'home' (10 images) à 80% du trafic.
    // Part physique = 10/100 = 10 % ; part trafic visée = 80 % → ratio 0,125 < 0,5.
    const report = validateHeroBank({
      animals: 10,
      home: 80,
      mutual_aid: 5,
      village: 5,
    });
    const warn = report.issues.find(
      (i) =>
        i.severity === "warning" &&
        i.category === "home" &&
        i.code === "underpopulated"
    );
    expect(warn).toBeDefined();
    expect(warn?.message).toMatch(/sous-fournie/i);
    // Ce n'est pas bloquant : ok reste true.
    expect(report.ok).toBe(true);
  });

  it("émet un warning quand une catégorie occupe >70% de la banque", () => {
    // Banque hypothétique de 100 images, on crée une plage 'animals' de 80
    // images en gardant le reste minimal — on simule via les poids physiques
    // déjà en place. Sur la vraie banque, 'animals' = 70/100 = 70 % pile,
    // donc on vérifie en réduisant la taille totale fictive.
    const report = validateHeroBank(DEFAULT_HERO_WEIGHTS, 90);
    // À 90 images, 'animals' = 70/90 ≈ 77,8 % → warning attendu.
    const warn = report.issues.find(
      (i) => i.code === "overpopulated" && i.category === "animals"
    );
    expect(warn).toBeDefined();
  });

  it("retourne un message clair et lisible pour chaque issue", () => {
    const report = validateHeroBank({
      animals: 10,
      home: 80,
      mutual_aid: 5,
      village: 5,
    });
    for (const issue of report.issues) {
      expect(issue.message.length).toBeGreaterThan(20);
      expect(issue.message).toMatch(/Catégorie|poids|aucune/i);
    }
  });
});
