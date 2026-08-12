import { describe, it, expect } from "vitest";
import {
  PHOTO_JOURNEY_STEPS,
  PHOTO_JOURNEY_INTRO,
  getPhotoJourneySteps,
  photoJourneyProgress,
} from "@/lib/photoJourney";

describe("photoJourney", () => {
  it("expose cinq écrans dans l'ordre produit", () => {
    expect(PHOTO_JOURNEY_STEPS.map((s) => s.id)).toEqual([
      "exterior",
      "living",
      "bedroom",
      "pets",
      "surroundings",
    ]);
  });

  it("saute l'écran animaux sans animal enregistré", () => {
    expect(getPhotoJourneySteps(false)).toHaveLength(4);
    expect(getPhotoJourneySteps(true)).toHaveLength(5);
  });

  it("donne un pourquoi à chaque écran", () => {
    PHOTO_JOURNEY_STEPS.forEach((s) => expect(s.why.length).toBeGreaterThan(10));
  });

  it("bannit tiret cadratin, demi-cadratin et emoji", () => {
    const all = [PHOTO_JOURNEY_INTRO, ...PHOTO_JOURNEY_STEPS.flatMap((s) => [s.title, s.why, s.hint, s.caption])];
    all.forEach((t) => {
      expect(t).not.toMatch(/[—–]/);
      expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
    });
  });

  it("borne la progression", () => {
    expect(photoJourneyProgress(0, 5)).toBe(0);
    expect(photoJourneyProgress(5, 5)).toBe(100);
    expect(photoJourneyProgress(9, 5)).toBe(100);
    expect(photoJourneyProgress(0, 0)).toBe(0);
  });
});
