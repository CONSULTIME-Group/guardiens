/**
 * Lot E4 (11/10/2026) : page Entraide selon les maquettes validées.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ENTRAIDE_IDEAS,
  helpersCountLine,
  helpersMore,
  helpersSectionTitle,
  needFormPath,
} from "@/lib/entraideIdeas";

describe("E4, idées", () => {
  it("six idées, titres assez longs pour le formulaire (10 caractères)", () => {
    expect(ENTRAIDE_IDEAS).toHaveLength(6);
    for (const idea of ENTRAIDE_IDEAS) expect(idea.label.length).toBeGreaterThanOrEqual(10);
  });
  it("formulaire prérempli, inscription d'abord pour un visiteur", () => {
    expect(needFormPath(true, "Faire les courses")).toBe("/petites-missions/creer?titre=Faire%20les%20courses");
    expect(needFormPath(false, "Faire les courses")).toBe(`/inscription?redirect=${encodeURIComponent("/petites-missions/creer?titre=Faire%20les%20courses")}`);
    expect(needFormPath(true)).toBe("/petites-missions/creer");
  });
});

describe("E4, chiffres", () => {
  it("phrase d'accroche avec ou sans ville", () => {
    expect(helpersCountLine(78, "Lyon")).toBe("Autour de Lyon, 78 personnes sont prêtes à donner un coup de main.");
    expect(helpersCountLine(1, "Lyon")).toBe("Autour de Lyon, 1 personne est prête à donner un coup de main.");
    expect(helpersCountLine(792, null)).toBe("Sur Guardiens, 792 personnes sont prêtes à donner un coup de main.");
    expect(helpersCountLine(0, "Lyon")).toBeNull();
  });
  it("titre de la section des personnes", () => {
    expect(helpersSectionTitle(78, "Lyon")).toBe("78 personnes prêtes à aider à moins de 30 km de Lyon");
    expect(helpersSectionTitle(0, "Lyon")).toBe("Prêts à aider autour de Lyon");
    expect(helpersSectionTitle(792, null)).toBe("Prêts à aider sur Guardiens");
  });
  it("dépliage : tout le secteur s'il est court, sinon par paliers", () => {
    expect(helpersMore(4, 78, 792, 12)).toEqual({ label: "Voir les 78 personnes", next: 78 });
    expect(helpersMore(78, 78, 792, 12)).toEqual({ label: "Voir 12 de plus", next: 90 });
    expect(helpersMore(4, 3, 792, 12)).toEqual({ label: "Voir 12 de plus", next: 16 });
    expect(helpersMore(4, 792, 792, 12)).toEqual({ label: "Voir 12 de plus", next: 16 });
    expect(helpersMore(10, 10, 10, 12)).toBeNull();
  });
});

describe("E4, branchements", () => {
  const hub = readFileSync("src/pages/EntraideHub.tsx", "utf8");
  it("ordre de la page", () => {
    const order = ["<EntraideHubIntro", "<EntraideIdeas", 'id="entraide-needs-title"', "<EntraideHowItWorks", 'id="entraide-helpers-title"', "<EntraideFaq"];
    const positions = order.map((marker) => hub.indexOf(marker));
    for (const position of positions) expect(position).toBeGreaterThan(-1);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
  it("un seul bouton plein par carte : Je peux et Écrire à en contour", () => {
    const cards = readFileSync("src/components/entraide/EntraideCards.tsx", "utf8");
    expect(cards).toContain('<Button type="button" size="sm" variant="outline" onClick={onCanHelp}');
    expect(cards).toContain('<Button type="button" size="sm" variant="outline" className="mt-4" onClick={contact}');
  });
  it("retour d'inscription : ?contact= ouvre la conversation", () => {
    expect(hub).toContain('searchParams.get("contact")');
    expect(hub).toContain("openHelperConversation(helper, navigate)");
  });
  it("tuiles mesurées", () => {
    expect(hub).toContain('trackEvent("entraide_idea_tile_clicked"');
    expect(readFileSync("src/lib/analytics.ts", "utf8")).toContain('"entraide_idea_tile_clicked"');
  });
});
