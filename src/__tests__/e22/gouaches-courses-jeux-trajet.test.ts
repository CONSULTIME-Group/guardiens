/**
 * Lot E22 (25/10/2026, « bah go ça » de Jérémie) : trois gouaches peintes dans
 * la famille des spots existants (courses, jeux de société, trajet). Les
 * courses, les trajets et les parties de jeux ont leur image ; un rempotage
 * de plantes d'intérieur va au jardin plutôt qu'à la nature morte bien-être.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { missionSpotKey } from "@/lib/missionSpot";
import { inferMissionCategory } from "@/lib/missionCategories";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Lot E22, gouaches courses, jeux et trajet", () => {
  it("les fichiers existent en 160 et 480 px", () => {
    for (const key of ["courses", "jeux", "trajet"]) {
      for (const size of ["160", "480"]) {
        expect(existsSync(resolve(process.cwd(), `src/assets/missions/spot-${key}-${size}.webp`))).toBe(true);
      }
    }
  });

  it("chaque thème d'entraide a sa gouache", () => {
    expect(missionSpotKey("errand", "Faire les courses")).toBe("courses");
    expect(missionSpotKey(null, "Un trajet en voiture jusqu'à la gare")).toBe("trajet");
    expect(missionSpotKey(null, "Une partie de belote le dimanche")).toBe("jeux");
    expect(missionSpotKey("company", "Une visite pour discuter")).toBe("bienetre");
  });

  it("un rempotage va au jardin", () => {
    expect(inferMissionCategory("Cherche un coup de main pour rempoter deux monsteras")).toBe("garden");
    expect(missionSpotKey("other", "Cherche un coup de main pour rempoter deux monsteras")).toBe("jardin");
  });

  it("les idées de la page Entraide portent leur propre gouache", () => {
    const src = read("src/components/entraide/EntraideIdeas.tsx");
    expect(src).toContain("courses: spotCourses");
    expect(src).toContain("trajet: spotTrajet");
    expect(src).toContain("jeux: spotJeux");
    expect(src).not.toContain("spotBienetre");
  });
});
