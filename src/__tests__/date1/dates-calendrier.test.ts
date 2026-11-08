// Lot DATE1 (08/11/2026) : une date du calendrier (colonne `date` de la base)
// se lit au bon jour quel que soit le fuseau de l'appareil. new Date("2026-12-20")
// la lit à minuit UTC : à l'ouest de Greenwich, la veille s'affichait.
// Rejouer sous plusieurs fuseaux : node scripts/test-tz.mjs.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { calendarDate, compareCalendarDates, daysBetween, daysFromToday, isOngoingDay, isPastDay } from "@/lib/calendarDate";
import { bootDateLabel, bootUrgencyLabel, buildBootSitModel } from "@/boot/bootSitView";

describe("calendarDate", () => {
  it("donne minuit local du jour écrit, quel que soit le fuseau", () => {
    const d = calendarDate("2026-12-20");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 11, 20, 0]);
    expect(format(calendarDate("2026-12-20"), "d MMMM yyyy", { locale: fr })).toBe("20 décembre 2026");
  });
  it("laisse passer une Date et lit un horodatage complet comme new Date", () => {
    const x = new Date(2026, 0, 1, 15);
    expect(calendarDate(x)).toBe(x);
    expect(calendarDate("2026-12-20T10:00:00Z").getTime()).toBe(new Date("2026-12-20T10:00:00Z").getTime());
    expect(Number.isNaN(calendarDate("n'importe quoi").getTime())).toBe(true);
  });
});

describe("écarts en jours du calendrier", () => {
  it("compte des jours entiers, y compris à travers un changement d'heure", () => {
    expect(daysBetween("2026-12-20", "2026-12-27")).toBe(7);
    expect(daysBetween("2027-03-27", "2027-03-29")).toBe(2);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
    expect(daysBetween("2026-12-27", "2026-12-20")).toBe(-7);
    expect(daysBetween(null, "2026-12-20")).toBeNull();
  });
  it("part du jour de l'appareil, pas de l'heure UTC", () => {
    // 7 novembre 2026, 21 h sur l'appareil : quel que soit son fuseau, c'est le 7.
    const evening = new Date(2026, 10, 7, 21, 0, 0);
    expect(daysFromToday("2026-11-07", evening)).toBe(0);
    expect(daysFromToday("2026-11-08", evening)).toBe(1);
    expect(isPastDay("2026-11-06", evening)).toBe(true);
    expect(isPastDay("2026-11-07", evening)).toBe(false);
  });
});

describe("garde en cours et tri (lot DATE1b)", () => {
  it("le dernier jour de la garde compte comme en cours, toute la journée", () => {
    const lateEvening = new Date(2026, 11, 18, 23, 30);
    expect(isOngoingDay("2026-12-05", "2026-12-18", lateEvening)).toBe(true);
    expect(isOngoingDay("2026-12-05", "2026-12-17", lateEvening)).toBe(false);
    expect(isOngoingDay("2026-12-19", "2026-12-25", lateEvening)).toBe(false);
    expect(isOngoingDay(null, "2026-12-25", lateEvening)).toBe(false);
  });
  it("trie les dates du calendrier, absentes en dernier", () => {
    const list = ["2026-12-20", null, "2026-11-30", "2027-01-02"];
    expect([...list].sort(compareCalendarDates)).toEqual(["2026-11-30", "2026-12-20", "2027-01-02", null]);
  });
});

describe("fiche affichée avant son code", () => {
  it("dates, durée et urgence au bon jour", () => {
    expect(bootDateLabel("2026-12-20", "2026-12-27")).toBe("Du 20 décembre au 27 décembre 2026 · 8 jours");
    const now = new Date(2026, 11, 13, 23, 30).getTime();
    expect(bootUrgencyLabel("2026-12-14", now)).toBe("Commence demain");
    expect(bootUrgencyLabel("2026-12-13", now)).toBe("Commence aujourd'hui");
    expect(bootUrgencyLabel("2026-12-12", now)).toBeNull();
  });
  it("une garde qui finit aujourd'hui reste affichée", () => {
    const now = new Date(2026, 11, 27, 22).getTime();
    const data = (end: string) => ({
      sit: [{ status: "published", accepting_applications: true, dates_hidden: false, title: "Garde", city: "Papeete", start_date: "2026-12-20", end_date: end }],
      owner: [{ city: "Papeete" }], property: [{ type: "house", photos: [] }],
      gallery: [{ photo_url: "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/u/owner-gallery/a.webp" }],
    });
    expect(buildBootSitModel(data("2026-12-27"), now)).not.toBeNull();
    expect(buildBootSitModel(data("2026-12-26"), now)).toBeNull();
  });
});

/**
 * Verrou : aucun new Date() appliqué à une colonne date du calendrier, nulle
 * part dans src/ (chantier DATE1 clos le 08/11/2026). REMAINING reste vide.
 */
const CALENDAR_COLUMN = /new Date\([^)]*\b(start_date|end_date|date_needed|exchange_date|photo_date|date_of_birth|new_start_date|new_end_date|old_start_date|old_end_date|effective_on|published_on|last_active_on|startDate|endDate|dateNeeded)\b[^)]*\)/g;
const REMAINING: Record<string, number> = {};

describe("verrou : dates du calendrier lues par calendarDate", () => {
  const files = execSync("git ls-files src", { encoding: "utf8" })
    .split("\n")
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("__tests__"));
  const count = (f: string) =>
    readFileSync(f, "utf8")
      .split("\n")
      .filter((l) => !/T00:00|T12:00|\+ ?"T/.test(l))
      .reduce((n, l) => n + (l.match(CALENDAR_COLUMN)?.length ?? 0), 0);

  it("aucun nouveau fichier ne lit une date du calendrier avec new Date", () => {
    const offenders = files.filter((f) => !(f in REMAINING) && count(f) > 0);
    expect(offenders).toEqual([]);
  });
  it("aucune exception en attente", () => {
    expect(REMAINING).toEqual({});
  });
});
