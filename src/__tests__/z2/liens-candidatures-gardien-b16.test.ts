/**
 * Lot Z2, audit B-16 (13/10/2026) : les liens gardien vers ses candidatures
 * mènent tous à /mes-candidatures, qui explique l'état de chaque annonce.
 * /sits en espace gardien transformait une annonce non publiée en carte
 * « indisponible ».
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SITTER_APPLICATIONS_PATH } from "@/lib/sitterApplicationsLink";

const read = (p: string) => readFileSync(p, "utf8");

describe("B-16, une seule adresse pour les candidatures du gardien", () => {
  it("l'adresse est celle de la barre de navigation gardien", () => {
    expect(SITTER_APPLICATIONS_PATH).toBe("/mes-candidatures");
    expect(read("src/lib/navModel.ts")).toContain('to: "/mes-candidatures"');
    expect(read("src/App.tsx")).toContain('path="/mes-candidatures"');
  });

  it("« À faire » du tableau de bord gardien", () => {
    const src = read("src/components/dashboard/SitterDashboard.tsx");
    expect(src).toContain('label: "Candidatures en attente de réponse", to: SITTER_APPLICATIONS_PATH');
    expect(src).not.toMatch(/key: "apps"[^}]*to: "\/sits"/);
  });

  it("bouton fixe mobile « Mes candidatures »", () => {
    const src = read("src/components/dashboard/sitter/SitterMobileStickyCTA.tsx");
    expect(src).toContain("to = SITTER_APPLICATIONS_PATH;");
    expect(src).not.toContain('to = "/sits";');
  });
});
