/**
 * Lot E9 (11/10/2026) : un besoin qui parle d'animaux pose la question
 * « Comment ça se passe ? ». Quelqu'un s'installe chez la personne : garde
 * proposée, texte et dates repris. Animal gardé chez la personne qui aide,
 * ou passages : coup de main (décision de Jérémie).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  reportsSitLike,
  shouldApplyMissionDates,
  shouldAskSitMode,
  sitCreateUrl,
  sitPrefillNote,
  SIT_MODE_AT_HOME_TEXT,
  SIT_MODE_AT_HOME_TITLE,
} from "@/lib/missionSitMode";
import { inferMissionCategory } from "@/lib/missionCategories";

describe("E9, ouverture de la question", () => {
  it("tout besoin animaux, même ponctuel", () => {
    expect(shouldAskSitMode({ missionType: "besoin", multiDay: false, titleCategory: "animals", sitLike: false })).toBe(true);
  });
  it("garde de plusieurs jours ou vocabulaire de garde", () => {
    expect(shouldAskSitMode({ missionType: "besoin", multiDay: true, titleCategory: "house", sitLike: false })).toBe(true);
    expect(shouldAskSitMode({ missionType: "besoin", multiDay: false, titleCategory: "other", sitLike: true })).toBe(true);
  });
  it("un animal cité en passant dans la description n'ouvre pas la question", () => {
    expect(inferMissionCategory("Besoin d'un coup de main samedi")).toBe("other");
    expect(inferMissionCategory("Besoin d'un coup de main samedi", "déplacer un canapé, le chat est craintif")).toBe("animals");
  });
  it("un coup de main sans animaux passe directement, une offre aussi", () => {
    expect(shouldAskSitMode({ missionType: "besoin", multiDay: false, titleCategory: "garden", sitLike: false })).toBe(false);
    expect(shouldAskSitMode({ missionType: "offre", multiDay: true, titleCategory: "animals", sitLike: true })).toBe(false);
  });
});

describe("E9, suites", () => {
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
  it("les dates du besoin s'appliquent seulement au texte repris, sans brouillon", () => {
    const base = { prefillTitle: "Garder ma chienne", title: "Garder ma chienne", remoteDraftResumed: false, localDraftRestored: false, startDate: "", endDate: "" };
    expect(shouldApplyMissionDates(base)).toBe(true);
    expect(shouldApplyMissionDates({ ...base, prefillTitle: null })).toBe(false);
    expect(shouldApplyMissionDates({ ...base, remoteDraftResumed: true })).toBe(false);
    expect(shouldApplyMissionDates({ ...base, localDraftRestored: true })).toBe(false);
    expect(shouldApplyMissionDates({ ...base, title: "Ancien brouillon" })).toBe(false);
    expect(shouldApplyMissionDates({ ...base, startDate: "2026-12-01" })).toBe(false);
  });
  it("la note ne promet les dates que si elles existent", () => {
    expect(sitPrefillNote(true)).toBe("Votre texte et vos dates sont repris.");
    expect(sitPrefillNote(false)).toBe("Votre texte est repris.");
  });
  it("textes sans tiret, sans rencontre imposée", () => {
    const all = `${SIT_MODE_AT_HOME_TITLE} ${SIT_MODE_AT_HOME_TEXT} ${sitPrefillNote(true)}`;
    expect(all).not.toMatch(/[–—]/);
    expect(all).not.toMatch(/rencontr/i);
  });
});

describe("E9, branchements", () => {
  const form = readFileSync("src/pages/CreateSmallMission.tsx", "utf8");
  it("le formulaire pose la question sur askSitMode et redirige par sitCreateUrl", () => {
    expect(form).toContain("shouldAskSitMode({ missionType, multiDay: multiDaySit, titleCategory, sitLike: !!sitLike })");
    expect(form).toContain("const titleCategory = useMemo(() => inferMissionCategory(title), [title]);");
    expect(form).toContain("{askSitMode && (");
    expect(form).toContain("navigate(sitCreateUrl(dateNeeded, endDate));");
    expect(form).not.toContain("start: dateNeeded");
  });
  it("l'annonce applique les dates même avec le texte repris d'un besoin", () => {
    const sit = readFileSync("src/pages/CreateSit.tsx", "utf8");
    expect(sit).toContain("missionPrefillTitleRef.current = prefill.title.trim()");
    expect(sit).toContain("if (shouldApplyMissionDates({");
  });
});
