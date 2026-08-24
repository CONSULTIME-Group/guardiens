import { describe, it, expect } from "vitest";
import {
  departmentIn,
  departmentInCapitalized,
  departmentOf,
  rewriteDepartmentMention,
} from "@/lib/departmentGrammar";
import { DEPT_NAMES } from "@/lib/departments";

/**
 * Verrou de la grammaire des départements : la table est exhaustive et
 * écrite à la main, aucune forme ne doit être devinée à l'exécution.
 */

const CASES: Array<[string, string, string]> = [
  // nom, locatif, génitif
  ["Ain", "dans l'Ain", "de l'Ain"],
  ["Aisne", "dans l'Aisne", "de l'Aisne"],
  ["Allier", "dans l'Allier", "de l'Allier"],
  ["Alpes-de-Haute-Provence", "dans les Alpes-de-Haute-Provence", "des Alpes-de-Haute-Provence"],
  ["Hautes-Alpes", "dans les Hautes-Alpes", "des Hautes-Alpes"],
  ["Alpes-Maritimes", "dans les Alpes-Maritimes", "des Alpes-Maritimes"],
  ["Ardèche", "en Ardèche", "d'Ardèche"],
  ["Ardennes", "dans les Ardennes", "des Ardennes"],
  ["Ariège", "en Ariège", "d'Ariège"],
  ["Aube", "dans l'Aube", "de l'Aube"],
  ["Aude", "dans l'Aude", "de l'Aude"],
  ["Aveyron", "dans l'Aveyron", "de l'Aveyron"],
  ["Bouches-du-Rhône", "dans les Bouches-du-Rhône", "des Bouches-du-Rhône"],
  ["Calvados", "dans le Calvados", "du Calvados"],
  ["Cantal", "dans le Cantal", "du Cantal"],
  ["Charente", "en Charente", "de Charente"],
  ["Charente-Maritime", "en Charente-Maritime", "de Charente-Maritime"],
  ["Cher", "dans le Cher", "du Cher"],
  ["Corrèze", "en Corrèze", "de Corrèze"],
  ["Corse-du-Sud", "en Corse-du-Sud", "de Corse-du-Sud"],
  ["Haute-Corse", "en Haute-Corse", "de Haute-Corse"],
  ["Côte-d'Or", "en Côte-d'Or", "de Côte-d'Or"],
  ["Côtes-d'Armor", "dans les Côtes-d'Armor", "des Côtes-d'Armor"],
  ["Creuse", "en Creuse", "de Creuse"],
  ["Dordogne", "en Dordogne", "de Dordogne"],
  ["Doubs", "dans le Doubs", "du Doubs"],
  ["Drôme", "dans la Drôme", "de la Drôme"],
  ["Eure", "dans l'Eure", "de l'Eure"],
  ["Eure-et-Loir", "en Eure-et-Loir", "d'Eure-et-Loir"],
  ["Finistère", "dans le Finistère", "du Finistère"],
  ["Gard", "dans le Gard", "du Gard"],
  ["Haute-Garonne", "en Haute-Garonne", "de Haute-Garonne"],
  ["Gers", "dans le Gers", "du Gers"],
  ["Gironde", "en Gironde", "de Gironde"],
  ["Hérault", "dans l'Hérault", "de l'Hérault"],
  ["Ille-et-Vilaine", "en Ille-et-Vilaine", "d'Ille-et-Vilaine"],
  ["Indre", "dans l'Indre", "de l'Indre"],
  ["Indre-et-Loire", "en Indre-et-Loire", "d'Indre-et-Loire"],
  ["Isère", "en Isère", "d'Isère"],
  ["Jura", "dans le Jura", "du Jura"],
  ["Landes", "dans les Landes", "des Landes"],
  ["Loir-et-Cher", "en Loir-et-Cher", "de Loir-et-Cher"],
  ["Loire", "dans la Loire", "de la Loire"],
  ["Haute-Loire", "en Haute-Loire", "de Haute-Loire"],
  ["Loire-Atlantique", "en Loire-Atlantique", "de Loire-Atlantique"],
  ["Loiret", "dans le Loiret", "du Loiret"],
  ["Lot", "dans le Lot", "du Lot"],
  ["Lot-et-Garonne", "en Lot-et-Garonne", "de Lot-et-Garonne"],
  ["Lozère", "en Lozère", "de Lozère"],
  ["Maine-et-Loire", "en Maine-et-Loire", "de Maine-et-Loire"],
  ["Manche", "dans la Manche", "de la Manche"],
  ["Marne", "dans la Marne", "de la Marne"],
  ["Haute-Marne", "en Haute-Marne", "de Haute-Marne"],
  ["Mayenne", "en Mayenne", "de Mayenne"],
  ["Meurthe-et-Moselle", "en Meurthe-et-Moselle", "de Meurthe-et-Moselle"],
  ["Meuse", "dans la Meuse", "de la Meuse"],
  ["Morbihan", "dans le Morbihan", "du Morbihan"],
  ["Moselle", "en Moselle", "de Moselle"],
  ["Nièvre", "dans la Nièvre", "de la Nièvre"],
  ["Nord", "dans le Nord", "du Nord"],
  ["Oise", "dans l'Oise", "de l'Oise"],
  ["Orne", "dans l'Orne", "de l'Orne"],
  ["Pas-de-Calais", "dans le Pas-de-Calais", "du Pas-de-Calais"],
  ["Puy-de-Dôme", "dans le Puy-de-Dôme", "du Puy-de-Dôme"],
  ["Pyrénées-Atlantiques", "dans les Pyrénées-Atlantiques", "des Pyrénées-Atlantiques"],
  ["Hautes-Pyrénées", "dans les Hautes-Pyrénées", "des Hautes-Pyrénées"],
  ["Pyrénées-Orientales", "dans les Pyrénées-Orientales", "des Pyrénées-Orientales"],
  ["Bas-Rhin", "dans le Bas-Rhin", "du Bas-Rhin"],
  ["Haut-Rhin", "dans le Haut-Rhin", "du Haut-Rhin"],
  ["Rhône", "dans le Rhône", "du Rhône"],
  ["Haute-Saône", "en Haute-Saône", "de Haute-Saône"],
  ["Saône-et-Loire", "en Saône-et-Loire", "de Saône-et-Loire"],
  ["Sarthe", "dans la Sarthe", "de la Sarthe"],
  ["Savoie", "en Savoie", "de Savoie"],
  ["Haute-Savoie", "en Haute-Savoie", "de Haute-Savoie"],
  ["Paris", "à Paris", "de Paris"],
  ["Seine-Maritime", "en Seine-Maritime", "de Seine-Maritime"],
  ["Seine-et-Marne", "en Seine-et-Marne", "de Seine-et-Marne"],
  ["Yvelines", "dans les Yvelines", "des Yvelines"],
  ["Deux-Sèvres", "dans les Deux-Sèvres", "des Deux-Sèvres"],
  ["Somme", "dans la Somme", "de la Somme"],
  ["Tarn", "dans le Tarn", "du Tarn"],
  ["Tarn-et-Garonne", "en Tarn-et-Garonne", "de Tarn-et-Garonne"],
  ["Var", "dans le Var", "du Var"],
  ["Vaucluse", "dans le Vaucluse", "du Vaucluse"],
  ["Vendée", "en Vendée", "de Vendée"],
  ["Vienne", "dans la Vienne", "de la Vienne"],
  ["Haute-Vienne", "en Haute-Vienne", "de Haute-Vienne"],
  ["Vosges", "dans les Vosges", "des Vosges"],
  ["Yonne", "dans l'Yonne", "de l'Yonne"],
  ["Territoire de Belfort", "dans le Territoire de Belfort", "du Territoire de Belfort"],
  ["Essonne", "dans l'Essonne", "de l'Essonne"],
  ["Hauts-de-Seine", "dans les Hauts-de-Seine", "des Hauts-de-Seine"],
  ["Seine-Saint-Denis", "en Seine-Saint-Denis", "de Seine-Saint-Denis"],
  ["Val-de-Marne", "dans le Val-de-Marne", "du Val-de-Marne"],
  ["Val-d'Oise", "dans le Val-d'Oise", "du Val-d'Oise"],
  ["Guadeloupe", "en Guadeloupe", "de Guadeloupe"],
  ["Martinique", "en Martinique", "de Martinique"],
  ["Guyane", "en Guyane", "de Guyane"],
  ["La Réunion", "à La Réunion", "de La Réunion"],
  ["Mayotte", "à Mayotte", "de Mayotte"],
  ["Polynésie française", "en Polynésie française", "de Polynésie française"],
  ["Nouvelle-Calédonie", "en Nouvelle-Calédonie", "de Nouvelle-Calédonie"],
];

describe("departmentGrammar", () => {
  it("couvre les 101 départements de la table de référence", () => {
    for (const name of Object.values(DEPT_NAMES)) {
      expect(departmentIn(name), `locatif manquant pour ${name}`).not.toBe(name);
      expect(departmentOf(name), `génitif manquant pour ${name}`).not.toBe(name);
    }
  });

  it.each(CASES)("%s : locatif et génitif conformes", (name, locatif, genitif) => {
    expect(departmentIn(name)).toBe(locatif);
    expect(departmentOf(name)).toBe(genitif);
  });

  it("met une majuscule initiale pour un début de phrase", () => {
    expect(departmentInCapitalized("Rhône")).toBe("Dans le Rhône");
    expect(departmentInCapitalized("Haute-Savoie")).toBe("En Haute-Savoie");
    expect(departmentInCapitalized("Ain")).toBe("Dans l'Ain");
    expect(departmentInCapitalized("La Réunion")).toBe("À La Réunion");
    expect(departmentInCapitalized("Paris")).toBe("À Paris");
  });

  it("retourne le nom seul, sans article inventé, pour un nom inconnu", () => {
    expect(departmentIn("Atlantide")).toBe("Atlantide");
    expect(departmentInCapitalized("Atlantide")).toBe("Atlantide");
    expect(departmentOf("Atlantide")).toBe("Atlantide");
    expect(departmentIn(null)).toBe("");
    expect(departmentOf(undefined)).toBe("");
  });

  describe("rewriteDepartmentMention", () => {
    it("répare une préposition fautive suivie du nom", () => {
      expect(rewriteDepartmentMention("Garde chien et chat dans Ain : gardiens de confiance à domicile", "Ain"))
        .toBe("Garde chien et chat dans l'Ain : gardiens de confiance à domicile");
      expect(rewriteDepartmentMention("House-sitting en Rhône : gardiens et annonces", "Rhône"))
        .toBe("House-sitting dans le Rhône : gardiens et annonces");
      expect(rewriteDepartmentMention("Garde d'animaux et house sitting dans le Savoie", "Savoie"))
        .toBe("Garde d'animaux et house sitting en Savoie");
      expect(rewriteDepartmentMention("Garde chien et chat dans Haute-Savoie", "Haute-Savoie"))
        .toBe("Garde chien et chat en Haute-Savoie");
    });

    it("répare un nom nu sans préposition", () => {
      expect(rewriteDepartmentMention("Garde d'animaux Rhône : gardiens de confiance à domicile | Guardiens", "Rhône"))
        .toBe("Garde d'animaux dans le Rhône : gardiens de confiance à domicile | Guardiens");
      expect(rewriteDepartmentMention("Garde d'animaux Puy-de-Dôme : gardiens de confiance à domicile | Guardiens", "Puy-de-Dôme"))
        .toBe("Garde d'animaux dans le Puy-de-Dôme : gardiens de confiance à domicile | Guardiens");
    });

    it("laisse intacte une mention déjà correcte", () => {
      const ok1 = "Garde d'animaux et house sitting en Ariège";
      expect(rewriteDepartmentMention(ok1, "Ariège")).toBe(ok1);
      const ok2 = "House-sitting en Polynésie française : gardiens et annonces";
      expect(rewriteDepartmentMention(ok2, "Polynésie française")).toBe(ok2);
      const ok3 = "Garde d'animaux et house sitting à La Réunion";
      expect(rewriteDepartmentMention(ok3, "La Réunion")).toBe(ok3);
      const ok4 = "Garde d'animaux dans les Ardennes : gardiens à domicile | Guardiens";
      expect(rewriteDepartmentMention(ok4, "Ardennes")).toBe(ok4);
    });

    it("répare plusieurs occurrences dans la même chaîne", () => {
      expect(
        rewriteDepartmentMention("Garde dans Drôme, vétérinaires dans Drôme", "Drôme")
      ).toBe("Garde dans la Drôme, vétérinaires dans la Drôme");
    });

    it("couvre les cas limites : génitif intact, nom composé protégé, déterminant non doublé", () => {
      const cases: Array<[string, string, string]> = [
        // département, entrée, sortie attendue
        ["Haute-Savoie", "Garde chien et chat dans Haute-Savoie : gardiens", "Garde chien et chat en Haute-Savoie : gardiens"],
        ["Rhône", "Garde d'animaux Rhône : gardiens de confiance", "Garde d'animaux dans le Rhône : gardiens de confiance"],
        ["Rhône", "Faites garder votre chat dans Rhône par un gardien", "Faites garder votre chat dans le Rhône par un gardien"],
        ["Ain", "Garde chien et chat dans Ain : gardiens", "Garde chien et chat dans l'Ain : gardiens"],
        ["Polynésie française", "les communes de Polynésie française", "les communes de Polynésie française"],
        ["Polynésie française", "House-sitting à Tahiti et en Polynésie française", "House-sitting à Tahiti et en Polynésie française"],
        ["Loire", "Depuis la Haute-Loire jusqu'à Saint-Étienne", "Depuis la Haute-Loire jusqu'à Saint-Étienne"],
        ["Loire", "Guardiens couvre Saint-Étienne, Loire-Atlantique exclue", "Guardiens couvre Saint-Étienne, Loire-Atlantique exclue"],
        ["Rhône", "Les Bouches-du-Rhône et le Rhône", "Les Bouches-du-Rhône et le Rhône"],
        ["Savoie", "Le lac d'Annecy en Haute-Savoie et la Savoie", "Le lac d'Annecy en Haute-Savoie et la Savoie"],
        ["Rhône", "Garde d'animaux Rhone : gardiens", "Garde d'animaux Rhone : gardiens"],
      ];
      for (const [dept, input, expected] of cases) {
        expect(rewriteDepartmentMention(input, dept)).toBe(expected);
      }
    });

    it("ne touche à rien si le nom est inconnu ou le texte vide", () => {
      const text = "Garde d'animaux dans le Finistère";
      expect(rewriteDepartmentMention(text, "Atlantide")).toBe(text);
      expect(rewriteDepartmentMention(null, "Ain")).toBe("");
      expect(rewriteDepartmentMention(undefined, "Ain")).toBe("");
      expect(rewriteDepartmentMention(text, null)).toBe(text);
    });
  });
});
