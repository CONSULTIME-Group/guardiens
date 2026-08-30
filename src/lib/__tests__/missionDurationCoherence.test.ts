import { describe, it, expect } from "vitest";
import { durationMismatch, periodDays } from "../missionDurationCoherence";

describe("cohérence période / durée déclarée", () => {
  it("compte les jours bornes incluses", () => {
    expect(periodDays("2026-07-01", "2026-07-01")).toBe(1);
    expect(periodDays("2026-07-01", "2026-07-03")).toBe(3);
    expect(periodDays("2026-07-03", "2026-07-01")).toBeNull();
    expect(periodDays("2026-07-01", null)).toBeNull();
  });

  it("signale 1-2 heures annoncé sur 41 jours et propose plusieurs jours", () => {
    const r = durationMismatch("1-2h", "2026-07-01", "2026-08-10");
    expect(r?.suggested).toBe("several");
    expect(r?.days).toBe(41);
    expect(r?.message).toContain("Plusieurs jours");
  });

  it("signale un week-end annoncé sur 82 jours", () => {
    expect(durationMismatch("weekend", "2026-06-01", "2026-08-21")?.suggested).toBe("several");
  });

  it("propose le week-end sur deux jours", () => {
    expect(durationMismatch("1-2h", "2026-07-04", "2026-07-05")?.suggested).toBe("weekend");
  });

  it("reste silencieux quand la durée tient ou que la période manque", () => {
    expect(durationMismatch("weekend", "2026-07-04", "2026-07-05")).toBeNull();
    expect(durationMismatch("several", "2026-07-01", "2026-08-10")).toBeNull();
    expect(durationMismatch("", "2026-07-01", "2026-08-10")).toBeNull();
    expect(durationMismatch("1-2h", "2026-07-01", null)).toBeNull();
  });
});
