import { describe, expect, it } from "vitest";
import { missionSpotKey } from "@/lib/missionSpot";
import cardsSrc from "@/components/entraide/EntraideCards.tsx?raw";
import missionCardSrc from "@/components/missions/connected/MissionCard.tsx?raw";

describe("lot P3, gouache d'un besoin sans photo", () => {
  it.each([
    ["animals", "Nourrir mes deux chats", "chat"],
    ["animals", "Sortir mon chien le soir", "chien"],
    ["animals", "Nourrir et sortir des chevaux", "poules"],
    ["garden", "Tondre la pelouse", "jardin"],
    ["garden", "Récolter les pommes du verger", "verger"],
    ["house", "Monter une étagère", "bricolage"],
    ["errand", "Courses au marché samedi", "courses"],
    ["transport", "Trajet jusqu'à la gare", "trajet"],
    ["company", "Partie de Scrabble", "jeux"],
  ])("%s, « %s » : %s", (category, title, key) => {
    expect(missionSpotKey(category, title)).toBe(key);
  });

  it("catégorie absente ou « other » : déduite du titre", () => {
    expect(missionSpotKey(null, "Garder mon chat pendant mes vacances")).toBe("chat");
    expect(missionSpotKey("other", "Un coup de main pour coudre des rideaux")).toBe("bienetre");
  });

  it("les cartes ne retombent plus sur une carte vide ni une initiale", () => {
    expect(cardsSrc).toContain('data-testid="need-card-spot"');
    expect(cardsSrc).toContain('data-testid="need-row-spot"');
    expect(cardsSrc).not.toContain("categoryInitial(");
  });

  it("MissionCard lit les gouaches en 480 px, plus les PNG de 1 024 px", () => {
    expect(missionCardSrc).not.toMatch(/spot-[a-z]+\.png/);
    expect(missionCardSrc).toContain("MISSION_SPOT_LARGE[missionSpotKey(");
  });
});
