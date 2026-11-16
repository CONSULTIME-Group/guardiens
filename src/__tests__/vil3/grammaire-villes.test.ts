import { describe, expect, it } from "vitest";
import { cityAt, cityOf } from "@/lib/cityGrammar";
import { pilotProofLine, pilotIntro, pilotFaq, resolveCityV2 } from "@/data/cityPilotV2";

describe("VIL3, prépositions devant un nom de ville", () => {
  it("élide devant une voyelle et un h muet listé", () => {
    expect(cityOf("Évreux")).toBe("d'Évreux");
    expect(cityOf("Annecy")).toBe("d'Annecy");
    expect(cityOf("Orléans")).toBe("d'Orléans");
    expect(cityOf("Hyères")).toBe("d'Hyères");
    expect(cityOf("Haguenau")).toBe("de Haguenau");
    expect(cityOf("Lyon")).toBe("de Lyon");
  });
  it("contracte l'article des villes en Le et Les, garde La", () => {
    expect(cityAt("Le Havre")).toBe("au Havre");
    expect(cityOf("Le Havre")).toBe("du Havre");
    expect(cityAt("Le Blanc-Mesnil")).toBe("au Blanc-Mesnil");
    expect(cityAt("Les Sables-d'Olonne")).toBe("aux Sables-d'Olonne");
    expect(cityOf("Les Sables-d'Olonne")).toBe("des Sables-d'Olonne");
    expect(cityAt("La Rochelle")).toBe("à La Rochelle");
    expect(cityOf("La Rochelle")).toBe("de La Rochelle");
  });
  it("s'applique aux textes du gabarit v2", () => {
    expect(pilotProofLine("Évreux", 1, 61)).toBe("62 gardiens à proximité d'Évreux, dont 1 en ville");
    expect(pilotProofLine("Le Mans", 0, 4)).toBe("4 gardiens à proximité du Mans");
    expect(pilotProofLine("Le Mans", 3, 0)).toBe("3 gardiens au Mans");
    const v2 = resolveCityV2("le-mans", "Le Mans", null);
    expect(pilotIntro("Le Mans", v2).startsWith("Le home sitting au Mans, c'est")).toBe(true);
    expect(pilotFaq("Le Mans", v2).map((f) => f.q)).toContain("Combien coûte Guardiens au Mans ?");
  });
});
