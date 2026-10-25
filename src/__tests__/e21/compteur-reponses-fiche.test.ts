/**
 * Correctif E21 (25/10/2026, contrôle en ligne) : la fiche d'un besoin disait
 * « Vous seriez la première réponse » à un visiteur alors que la liste de
 * /petites-missions affichait « 1 « Je peux » » pour le même besoin. Un
 * visiteur ou un membre qui n'est pas l'auteur lit seulement sa propre réponse
 * dans small_mission_responses : la fiche lit aussi public_mission_response_counts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { responsesLine, visibleResponseCount } from "@/lib/missionNotifiedCount";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Nombre de « Je peux » sur la fiche", () => {
  it("prend le plus grand des deux comptes", () => {
    expect(visibleResponseCount(0, 1)).toBe(1);
    expect(visibleResponseCount(2, 1)).toBe(2);
    expect(visibleResponseCount(0, null)).toBe(0);
    expect(responsesLine(visibleResponseCount(0, 1))).toBe("1 personne a dit « Je peux »");
  });

  it("la fiche lit la vue publique pour ses deux lignes", () => {
    const src = read("src/pages/SmallMissionDetail.tsx");
    expect(src).toContain("useMissionResponseCount(missionUuid)");
    expect(src).not.toContain("responsesCount={responses.length}");
    expect(src).not.toContain("{responsesLine(responses.length)}");
    expect(read("src/lib/missionNotifiedCount.ts")).toContain('.from("public_mission_response_counts")');
  });
});
