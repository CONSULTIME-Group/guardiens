/**
 * Lot G1 (11/10/2026) : un besoin qui parle d'animaux pose la question
 * « Comment ça se passe ? ». Quelqu'un s'installe chez la personne : garde
 * proposée, texte et dates repris. Animal gardé chez la personne qui aide,
 * ou passages : coup de main (décision de Jérémie).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  reportsSitLike,
  shouldAskSitMode,
  sitCreateUrl,
  SIT_MODE_AT_HOME_TEXT,
  SIT_MODE_AT_HOME_TITLE,
} from "@/lib/missionSitMode";

describe("G1, ouverture de la question", () => {
  it("tout besoin animaux, même ponctuel", () => {
    expect(shouldAskSitMode({ missionType: "besoin", multiDay: false, category: "animals", sitLike: false })).toBe(true);
  });
  it("garde de plusieurs jours ou vocabulaire de garde", () => {
    expect(shouldAskSitMode({ missionType: "besoin", multiDay: true, category: "house", sitLike: false })).toBe(true);
    expect(shouldAskSitMode({ missionType: "besoin", multiDay: false, category: "other", sitLike: true })).toBe(true);
  });
  it("un coup de main sans animaux passe directement, une offre aussi", () => {
    expect(shouldAskSitMode({ missionType: "besoin", multiDay: false, category: "garden", sitLike: false })).toBe(false);
    expect(shouldAskSitMode({ missionType: "offre", multiDay: true, category: "animals", sitLike: true })).toBe(false);
  });
});

describe("G1, suites", () => {
  it("la garde reprend les dates sous les noms lus par l'annonce", () => {
    expect(sitCreateUrl("2026-12-14", "2026-12-30")).toBe("/sits/create?debut=2026-12-14&fin=2026-12-30");
    expect(sitCreateUrl("2026-12-14T00:00:00.000Z", null)).toBe("/sits/create?debut=2026-12-14");
    expect(sitCreateUrl("", "")).toBe("/sits/create");
  });
  it("modération : signal seulement si quelqu'un s'installe chez la personne", () => {
    expect(reportsSitLike(true, "at_home")).toBe(true);
    expect(reportsSitLike(true, null)).toBe(true);
    expect(reportsSitLike(true, "at_helper")).toBe(false);
    expect(reportsSitLike(true, "visits")).toBe(false);
    expect(reportsSitLike(false, "at_home")).toBe(false);
  });
  it("textes sans tiret, sans rencontre imposée", () => {
    const all = `${SIT_MODE_AT_HOME_TITLE} ${SIT_MODE_AT_HOME_TEXT}`;
    expect(all).not.toMatch(/[–—]/);
    expect(all).not.toMatch(/rencontr/i);
  });
});

describe("G1, branchements", () => {
  const form = readFileSync("src/pages/CreateSmallMission.tsx", "utf8");
  it("le formulaire pose la question sur askSitMode et redirige par sitCreateUrl", () => {
    expect(form).toContain("shouldAskSitMode({ missionType, multiDay: multiDaySit, category, sitLike: !!sitLike })");
    expect(form).toContain("{askSitMode && (");
    expect(form).toContain("navigate(sitCreateUrl(dateNeeded, endDate));");
    expect(form).not.toContain("start: dateNeeded");
  });
  it("l'annonce applique les dates même avec le texte repris d'un besoin", () => {
    const sit = readFileSync("src/pages/CreateSit.tsx", "utf8");
    expect(sit).toContain("sitPrefillAppliedRef.current = true;");
    expect(sit).toContain("(!title || fromMission)");
  });
});
