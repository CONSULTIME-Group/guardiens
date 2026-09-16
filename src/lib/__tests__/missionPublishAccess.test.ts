import { describe, it, expect } from "vitest";
import {
  canPublishSmallMission,
  shouldNudgeProfileCompletion,
} from "@/lib/missionPublishAccess";

describe("publication d'un coup de main", () => {
  it("un membre connecté à 10 % de complétion voit le formulaire", () => {
    expect(canPublishSmallMission(true)).toBe(true);
    expect(shouldNudgeProfileCompletion(10)).toBe(true);
  });

  it("un visiteur anonyme ne publie pas", () => {
    expect(canPublishSmallMission(false)).toBe(false);
  });

  it("au-dessus du seuil, aucune invitation à compléter", () => {
    expect(shouldNudgeProfileCompletion(40)).toBe(false);
    expect(shouldNudgeProfileCompletion(85)).toBe(false);
  });
});
