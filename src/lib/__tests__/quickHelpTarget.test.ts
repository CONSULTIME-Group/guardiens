import { describe, expect, it } from "vitest";
import { quickHelpTarget } from "@/components/landing/QuickHelpSection";
import { sanitizeRedirect } from "../safeRedirect";

describe("exemples de coups de main", () => {
  it("ouvre directement le formulaire pour un membre", () => {
    expect(quickHelpTarget("Monter un meuble", true)).toBe("/petites-missions/creer?titre=Monter%20un%20meuble");
  });

  it("conserve le titre après inscription pour un visiteur", () => {
    const target = quickHelpTarget("Monter un meuble", false);
    const redirect = new URL(`https://guardiens.fr${target}`).searchParams.get("redirect");
    expect(sanitizeRedirect(redirect)).toBe("/petites-missions/creer?titre=Monter un meuble");
  });
});