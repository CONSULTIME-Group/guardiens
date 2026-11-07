// Lot PUB1 : dates d'un brouillon conservées à la reprise, quel que soit le
// fuseau de l'appareil (cas Christophe, Concepción, 26/10/2026).
import { afterEach, describe, expect, it } from "vitest";
import { localTodayIso } from "@/lib/localDate";
import { localResumeDateFlags, resumeDraftDates } from "@/lib/sitDraftResume";

const ORIGINAL_TZ = process.env.TZ;
afterEach(() => { process.env.TZ = ORIGINAL_TZ; });

describe("date du jour de l'appareil", () => {
  it("au Chili à 22 h le 7 novembre, la date du jour reste le 7 (UTC est déjà le 8)", () => {
    process.env.TZ = "America/Santiago";
    const instant = new Date("2026-11-08T01:00:00Z");
    expect(instant.toISOString().slice(0, 10)).toBe("2026-11-08");
    expect(localTodayIso(instant)).toBe("2026-11-07");
  });

  it("à Papeete à 20 h le 7 novembre, la date du jour reste le 7", () => {
    process.env.TZ = "Pacific/Tahiti";
    expect(localTodayIso(new Date("2026-11-08T06:00:00Z"))).toBe("2026-11-07");
  });

  it("à Paris, même résultat que le calendrier français", () => {
    process.env.TZ = "Europe/Paris";
    expect(localTodayIso(new Date("2026-11-07T23:30:00Z"))).toBe("2026-11-08");
  });
});

describe("reprise d'un brouillon distant", () => {
  it("garde les dates à venir telles quelles (21/12/2026 au 20/02/2027)", () => {
    expect(resumeDraftDates("2026-12-21", "2027-02-20", "2026-11-07")).toEqual({
      start: "2026-12-21", end: "2027-02-20", cleared: false, hadDates: true,
    });
  });

  it("garde une date de début égale au jour de l'appareil", () => {
    expect(resumeDraftDates("2026-11-07", "2026-11-20", "2026-11-07").start).toBe("2026-11-07");
  });

  it("retire seulement un début passé et garde une fin encore à venir", () => {
    expect(resumeDraftDates("2026-11-01", "2026-11-20", "2026-11-07")).toEqual({
      start: "", end: "2026-11-20", cleared: true, hadDates: true,
    });
  });

  it("un brouillon sans date n'annonce aucune date retirée", () => {
    expect(resumeDraftDates(null, null, "2026-11-07")).toEqual({ start: "", end: "", cleared: false, hadDates: false });
  });

  it("une fin antérieure au début est écartée", () => {
    expect(resumeDraftDates("2026-12-21", "2026-12-10", "2026-11-07").end).toBe("");
  });
});

describe("mesure d'une copie locale restaurée", () => {
  it("une copie sans date ne compte jamais comme dates retirées", () => {
    expect(localResumeDateFlags("", "2026-10-26")).toEqual({ dates_cleared: false, had_dates: false, dates_past: false });
  });

  it("une copie à date passée la signale sans la retirer", () => {
    expect(localResumeDateFlags("2026-10-01", "2026-10-26")).toEqual({ dates_cleared: false, had_dates: true, dates_past: true });
  });
});
