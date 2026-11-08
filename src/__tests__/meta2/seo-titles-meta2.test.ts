import { describe, expect, it } from "vitest";
import {
  TITLE_MAX,
  TITLE_SUFFIX,
  buildBreedTitle,
  buildMissionTitle,
  buildSitTitle,
  formatCityName,
  mentionsCity,
  tidyTitle,
} from "@/lib/seoTitle";

/**
 * Lot SEO-META2 (08/11/2026). Cas réels relevés en base le 08/11/2026 :
 * annonces publiées, besoins d'entraide publics, fiches de races.
 */
const full = (body: string) => `${body}${TITLE_SUFFIX}`;

describe("formatCityName", () => {
  it("remet la casse usuelle des communes saisies en minuscules ou en majuscules", () => {
    expect(formatCityName("barjols")).toBe("Barjols");
    expect(formatCityName("PLECHATEL")).toBe("Plechatel");
    expect(formatCityName("SIROS")).toBe("Siros");
    expect(formatCityName("Saint vulbas")).toBe("Saint Vulbas");
  });
  it("gère l'élision et les petits mots", () => {
    expect(formatCityName("Vabres l'abbaye")).toBe("Vabres l'Abbaye");
    expect(formatCityName("Vallon pont d’arc")).toBe("Vallon Pont d’Arc");
    expect(formatCityName("saint-didier-au-mont-d'or")).toBe("Saint-Didier-au-Mont-d'Or");
    expect(formatCityName("L'HAŸ-LES-ROSES")).toBe("L'Haÿ-les-Roses");
    expect(formatCityName("la rochelle")).toBe("La Rochelle");
    expect(formatCityName("Autrans-Méaudre en Vercors")).toBe("Autrans-Méaudre en Vercors");
  });
  it("laisse intactes les communes déjà bien écrites", () => {
    for (const c of ["Grandchamp-des-Fontaines", "Quissac-en-Quercy", "Saint Ludger, Québec, Canada", "Brassac 82", "Sainte-Foy-lès-Lyon"]) {
      expect(formatCityName(c)).toBe(c);
    }
  });
  it("renvoie une chaîne vide sans ville", () => {
    expect(formatCityName(null)).toBe("");
    expect(formatCityName("  ")).toBe("");
  });
});

describe("tidyTitle", () => {
  it("retire l'espace avant la virgule et dans les parenthèses", () => {
    expect(tidyTitle("Garde de Aïko , mon border collie")).toBe("Garde de Aïko, mon border collie");
    expect(tidyTitle("Jolie maison avec jardins (Provence verte ) garde d'animaux")).toBe(
      "Jolie maison avec jardins (Provence verte) garde d'animaux",
    );
  });
});

describe("buildSitTitle : ville remise en casse", () => {
  it("affiche la ville en casse usuelle dans le titre", () => {
    expect(buildSitTitle("Une garde de 2 chiens et 1 chat", "Saint vulbas")).toBe("Une garde de 2 chiens et 1 chat à Saint Vulbas");
    expect(buildSitTitle("Garde de Aïko , mon border collie", "Licq Atherey")).toBe("Garde de Aïko, mon border collie à Licq Atherey");
    expect(buildSitTitle("Garde d'animaux (chien,chat, poules, cochons d'Inde)", "Vabres l'abbaye")).toBe("Garde d'animaux à Vabres l'Abbaye");
  });
});

describe("buildMissionTitle : besoins d'entraide", () => {
  const cases: Array<[string, string]> = [
    ["Une ou un gardien pour notre boxette", "Champlemy"],
    ["Lyon 5 Tassin : 1 petit chien éduqué et craintif du 31/12/26 au 2 janvier 2027", "Lyon"],
    ["Travailler les Ânes, faire les clôtures, distribuer le foin en hiver et me remplacer pour que je puisse partir en vacanc", "Queige"],
    ["Pet sitting", "PLEYBEN"],
    ["Cherche un coup de main pour rempoter deux monsteras avec les conseils pour qu’elles ne meurent pas", "Annecy"],
    ["D une personne pouvant s occuper de ma chienne Gaïa lorsque je suis absente", "SIROS"],
    ["J’ai besoin de quelqu’un pour rendre visite à mon chat durant mon absence (vérifier que tout va bien…)", "Bordeaux"],
    ["Pour garder mon chien en mon absence", "Autrans-Méaudre en Vercors"],
    ["Besoin un coin jardin pour mettre en securité mon camping car et mon chat je vis l année", "Beaussais-sur-Mer"],
  ];
  it("tient en 60 caractères avec le suffixe, ville en entier, jamais de parenthèse ouverte", () => {
    for (const [title, city] of cases) {
      const body = buildMissionTitle(title, city);
      expect(full(body).length).toBeLessThanOrEqual(TITLE_MAX);
      expect(mentionsCity(body, formatCityName(city))).toBe(true);
      expect((body.match(/\(/g) ?? []).length).toBe((body.match(/\)/g) ?? []).length);
      expect(body).not.toContain("  ");
    }
  });
  it("garde « Coup de main » quand la forme complète tient", () => {
    expect(buildMissionTitle("Pet sitting", "PLEYBEN")).toBe("Pet sitting · Coup de main à Pleyben");
    expect(buildMissionTitle("Déplacer un petit meuble colonne", "Montargis").length).toBeLessThanOrEqual(48);
  });
  it("ne répète pas la ville déjà dans le titre", () => {
    expect(buildMissionTitle("Plantons ensemble à La Rochelle", "La Rochelle", { label: "projet participatif", separator: ", " }))
      .toBe("Plantons ensemble à La Rochelle");
  });
  it("forme projet participatif quand elle tient", () => {
    expect(buildMissionTitle("Jardin partagé", "Lyon", { label: "projet participatif", separator: ", " }))
      .toBe("Jardin partagé, projet participatif à Lyon");
  });
});

describe("buildBreedTitle : 60 caractères au plus", () => {
  it("garde le gabarit complet quand il tient", () => {
    expect(buildBreedTitle("Carlin")).toBe("Garde de Carlin à domicile : conseils gardien | Guardiens");
    expect(buildBreedTitle("Akita inu")).toBe("Garde d'Akita inu à domicile : conseils gardien | Guardiens");
  });
  it("raccourcit le gabarit, jamais le nom de la race", () => {
    for (const name of [
      "Berger australien", "American staffordshire terrier", "Staffordshire bull terrier",
      "Cavalier king charles", "Berger belge malinois", "Berger belge tervueren", "Âne du cotentin",
    ]) {
      const t = buildBreedTitle(name);
      expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(t).toContain(name);
      expect(t.endsWith(" | Guardiens")).toBe(true);
    }
    expect(buildBreedTitle("Berger australien")).toBe("Garde de Berger australien à domicile | Guardiens");
  });
});
