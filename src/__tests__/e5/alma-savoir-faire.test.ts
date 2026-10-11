/**
 * Lot E5 (11/10/2026) : Alma invite à remplir les savoir-faire, sans passer
 * devant les gardes.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ALMA_SKILLS_ACTION_LABEL,
  ALMA_SKILLS_OWNER_PHRASE,
  ALMA_SKILLS_SITTER_PHRASE,
  SAVOIR_FAIRE_PATH,
  pickAlmaRail,
} from "@/lib/almaRailPhrase";
import { ALMA_PAGE_LABELS } from "../../../supabase/functions/_shared/alma-page-labels";

const owner = (state: Partial<{ ongoingSit: boolean; pendingApps: boolean; noActiveSit: boolean }>) => ({
  ongoingSit: false, pendingApps: false, noActiveSit: false, ...state,
});

describe("E5, gardien", () => {
  it("sans savoir-faire : invitation et lien direct", () => {
    const r = pickAlmaRail({ variant: "confirmed", hidden: false, profileCompletion: 80, isAvailable: true, skillsMissing: true });
    expect(r.phrase).toBe(ALMA_SKILLS_SITTER_PHRASE);
    expect(r.action).toEqual({ label: ALMA_SKILLS_ACTION_LABEL, href: SAVOIR_FAIRE_PATH });
  });
  it("profil à compléter et disponibilité passent d'abord", () => {
    expect(pickAlmaRail({ variant: "confirmed", hidden: false, profileCompletion: 20, skillsMissing: true }).action).toBeNull();
    expect(pickAlmaRail({ variant: "confirmed", hidden: false, profileCompletion: 80, isAvailable: false, skillsMissing: true }).action).toBeNull();
    expect(pickAlmaRail({ variant: "newSitter", hidden: false, openingCardVisible: true, skillsMissing: true }).action).toBeNull();
  });
  it("avec des savoir-faire ou Alma masquée : rien ne change", () => {
    expect(pickAlmaRail({ variant: "confirmed", hidden: false, profileCompletion: 80, skillsMissing: false }).action).toBeNull();
    expect(pickAlmaRail({ variant: "confirmed", hidden: true, skillsMissing: true }).action).toBeNull();
  });
});

describe("E5, propriétaire : les gardes d'abord", () => {
  it("garde en cours, candidatures, annonce à raconter : phrase de garde", () => {
    for (const state of [{ ongoingSit: true }, { pendingApps: true }, { noActiveSit: true }]) {
      expect(pickAlmaRail({ variant: "owner", hidden: false, ownerState: owner(state), skillsMissing: true }).action).toBeNull();
    }
  });
  it("annonce en ligne et calme : invitation aux savoir-faire", () => {
    const r = pickAlmaRail({ variant: "owner", hidden: false, ownerState: owner({}), skillsMissing: true });
    expect(r.phrase).toBe(ALMA_SKILLS_OWNER_PHRASE);
    expect(r.action?.href).toBe("/profile?section=savoir-faire");
  });
});

describe("E5, textes et branchements", () => {
  it("textes sans tiret, sans « voisin », sans tournure négative", () => {
    for (const text of [ALMA_SKILLS_SITTER_PHRASE, ALMA_SKILLS_OWNER_PHRASE, ALMA_SKILLS_ACTION_LABEL, ALMA_PAGE_LABELS["/petites-missions"]]) {
      expect(text).not.toMatch(/[–—]/);
      expect(text).not.toMatch(/voisin/i);
      expect(text).not.toMatch(/\bne\b|\bpas\b|\bjamais\b|\baucun/i);
    }
  });
  it("les deux tableaux de bord transmettent l'absence de savoir-faire", () => {
    expect(readFileSync("src/components/dashboard/SitterDashboard.tsx", "utf8")).toContain('skillsMissing={competencesCount === 0 && user?.role !== "both" && !helpsWithMissing}');
    expect(readFileSync("src/components/dashboard/OwnerDashboard.tsx", "utf8")).toContain("skillsMissing={!ownerProfileLoading && !ownerProfileLoadError");
  });
  it("Alma suit la décision du 11/10 sur l'aide aux devoirs et la garde d'enfants", () => {
    const prompt = readFileSync("supabase/functions/_shared/alma-system-prompt.ts", "utf8");
    expect(prompt).not.toContain("Jamais la garde d'enfants");
    expect(prompt).toContain("l'échange se fait en temps et en savoir-faire");
    // « gratuit » est réécrit par le filtre de sortie d'Alma : la phrase l'évite.
    expect(prompt).not.toContain("toujours gratuitement");
  });
});
