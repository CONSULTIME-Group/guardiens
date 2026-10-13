/**
 * Lot X2 : « Reporter » un besoin et bannière « date passée ».
 * Règles pures (src/lib/missionReschedule.ts) et gardes statiques.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  addDaysIso,
  buildReschedulePatch,
  daysBetween,
  isMissionDatePassed,
  localIsoDay,
  missionReferenceDate,
  suggestedEndDate,
} from "@/lib/missionReschedule";
import { missionLinkFor } from "../../../supabase/functions/_shared/mission-link";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
// 13 octobre 2026, 10 h (heure locale du test).
const NOW = new Date(2026, 9, 13, 10, 0, 0);

describe("date de référence et bannière (constat C-07)", () => {
  it("la fin de période prime sur la date souhaitée", () => {
    expect(missionReferenceDate({ date_needed: "2026-10-01", end_date: "2026-11-07" })).toBe("2026-11-07");
    expect(missionReferenceDate({ date_needed: "2026-10-01", end_date: null })).toBe("2026-10-01");
    expect(missionReferenceDate({ date_needed: null, end_date: "2026-10-20" })).toBe("2026-10-20");
    expect(missionReferenceDate({ date_needed: null, end_date: null })).toBeNull();
  });

  it("un besoin dont la période court encore n'est pas passé", () => {
    // Cas réel : « garde de chat pendant minimum 2 mois », jusqu'au 07/11.
    expect(isMissionDatePassed({ date_needed: "2026-09-07", end_date: "2026-11-07" }, NOW)).toBe(false);
  });

  it("le jour même reste valable, la veille est passée", () => {
    expect(isMissionDatePassed({ date_needed: "2026-10-13" }, NOW)).toBe(false);
    expect(isMissionDatePassed({ date_needed: "2026-10-12" }, NOW)).toBe(true);
    expect(isMissionDatePassed({ date_needed: "2026-09-01", end_date: "2026-10-12" }, NOW)).toBe(true);
    expect(isMissionDatePassed({ date_needed: null, end_date: null }, NOW)).toBe(false);
  });

  it("calculs de jours", () => {
    expect(localIsoDay(NOW)).toBe("2026-10-13");
    expect(daysBetween("2026-10-10", "2026-10-13")).toBe(3);
    expect(addDaysIso("2026-10-30", 3)).toBe("2026-11-02");
  });
});

describe("nouvelle date (constat E-02 / C-06)", () => {
  it("date obligatoire, à partir d'aujourd'hui", () => {
    expect(buildReschedulePatch({ date_needed: "2026-10-01" }, { start: "" }, NOW)).toEqual({ ok: false, reason: "start_missing" });
    expect(buildReschedulePatch({ date_needed: "2026-10-01" }, { start: "2026-10-12" }, NOW)).toEqual({ ok: false, reason: "start_past" });
    expect(buildReschedulePatch({ date_needed: "2026-10-01" }, { start: "2026-10-13" }, NOW)).toEqual({
      ok: true,
      patch: { date_needed: "2026-10-13", end_date: null },
    });
  });

  it("un besoin sans période garde une fin vide", () => {
    expect(buildReschedulePatch({ date_needed: "2026-10-01", end_date: null }, { start: "2026-10-20", end: "2026-10-25" }, NOW)).toEqual({
      ok: true,
      patch: { date_needed: "2026-10-20", end_date: null },
    });
  });

  it("un besoin avec période garde sa durée par défaut", () => {
    const m = { date_needed: "2026-10-01", end_date: "2026-10-05" };
    expect(suggestedEndDate(m, "2026-10-20")).toBe("2026-10-24");
    expect(buildReschedulePatch(m, { start: "2026-10-20" }, NOW)).toEqual({
      ok: true,
      patch: { date_needed: "2026-10-20", end_date: "2026-10-24" },
    });
  });

  it("une fin saisie est respectée, jamais avant le début", () => {
    const m = { date_needed: "2026-10-01", end_date: "2026-10-05" };
    expect(buildReschedulePatch(m, { start: "2026-10-20", end: "2026-10-28" }, NOW)).toEqual({
      ok: true,
      patch: { date_needed: "2026-10-20", end_date: "2026-10-28" },
    });
    expect(buildReschedulePatch(m, { start: "2026-10-20", end: "2026-10-19" }, NOW)).toEqual({ ok: false, reason: "end_before_start" });
  });

  it("un besoin qui n'avait qu'une fin reçoit un début et une fin le même jour par défaut", () => {
    expect(buildReschedulePatch({ date_needed: null, end_date: "2026-10-01" }, { start: "2026-10-20" }, NOW)).toEqual({
      ok: true,
      patch: { date_needed: "2026-10-20", end_date: "2026-10-20" },
    });
  });
});

describe("gardes statiques", () => {
  const detail = read("src/pages/SmallMissionDetail.tsx");

  it("« Reporter » n'ouvre plus la route absente /editer", () => {
    expect(detail).not.toContain("/editer");
    expect(detail).toContain("RescheduleMissionDialog");
    expect(detail).toContain("onReschedule={() => setRescheduleOpen(true)}");
    // Le clic reste mesuré comme avant.
    expect(detail).toContain('trackEvent("mission_expired_reschedule_clicked"');
  });

  it("la bannière suit la fin de période (même règle que la page Entraide)", () => {
    expect(detail).toContain("isMissionDatePassed(mission)");
    expect(detail).not.toMatch(/new Date\(mission\.date_needed\) < new Date\(\)/);
    expect(read("src/pages/EntraideHub.tsx")).toContain("row.end_date || row.date_needed");
  });

  it("la boîte de dialogue écrit la ligne de l'auteur dans small_missions", () => {
    const dialog = read("src/components/missions/RescheduleMissionDialog.tsx");
    expect(dialog).toContain('.from("small_missions")');
    expect(dialog).toContain(".update(result.patch)");
    expect(dialog).toContain('.eq("user_id", mission.user_id)');
    expect(dialog).toContain('type="date"');
  });

  it("aucun texte avec tiret cadratin ou demi-cadratin", () => {
    for (const f of [
      "src/lib/missionReschedule.ts",
      "src/components/missions/RescheduleMissionDialog.tsx",
      "src/components/missions/ProjetOwnerResponses.tsx",
    ]) {
      expect(read(f)).not.toMatch(/[–—]/);
    }
  });
});

describe("lien des notifications d'un projet (constat C-02)", () => {
  it("un projet mène à /projets/{slug}, un besoin à /petites-missions/{id}", () => {
    expect(missionLinkFor({ id: "p1", slug: "chantier-participatif-de-plantation", category: "projet" })).toBe("/projets/chantier-participatif-de-plantation");
    expect(missionLinkFor({ id: "p1", slug: "", category: "projet" })).toBe("/projets/p1");
    expect(missionLinkFor({ id: "m1", slug: "aide-jardin", category: "garden" })).toBe("/petites-missions/m1");
  });

  it("notify-mission-event construit ses liens avec missionLinkFor", () => {
    const fn = read("supabase/functions/notify-mission-event/index.ts");
    expect(fn).toContain("const missionLink = missionLinkFor(mission)");
    expect(fn).toContain(".select('id, title, user_id, slug, category')");
    expect(fn).not.toContain("const missionLink = `/petites-missions/${mission.id}`");
  });
});
