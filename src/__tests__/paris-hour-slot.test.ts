import { describe, it, expect } from "vitest";
import { parisHourSlot } from "../../supabase/functions/_shared/paris-hour";

describe("parisHourSlot", () => {
  it("heure d'été : 06:00 UTC vaut 08:00 à Paris", () => {
    expect(parisHourSlot(new Date("2026-07-31T06:00:00Z"))).toBe("08:00");
  });

  it("heure d'été : 10:30 UTC vaut 12:00 à Paris", () => {
    expect(parisHourSlot(new Date("2026-07-31T10:30:00Z"))).toBe("12:00");
  });

  it("heure d'hiver : 07:00 UTC vaut 08:00 à Paris", () => {
    expect(parisHourSlot(new Date("2026-12-15T07:00:00Z"))).toBe("08:00");
  });

  it("heure d'hiver : 17:00 UTC vaut 18:00 à Paris", () => {
    expect(parisHourSlot(new Date("2026-12-15T17:00:00Z"))).toBe("18:00");
  });

  it("minuit Paris : 22:30 UTC en été vaut 00:00", () => {
    expect(parisHourSlot(new Date("2026-07-31T22:30:00Z"))).toBe("00:00");
  });

  it("23h Paris : 21:30 UTC en été vaut 23:00", () => {
    expect(parisHourSlot(new Date("2026-07-31T21:30:00Z"))).toBe("23:00");
  });

  it("ne contient jamais de suffixe localisé ni d'heure hors plage", () => {
    for (let h = 0; h < 24; h++) {
      const value = parisHourSlot(new Date(Date.UTC(2026, 6, 31, h, 0, 0)));
      expect(value).toMatch(/^(0\d|1\d|2[0-3]):00$/);
      expect(value).not.toContain(" ");
    }
  });
});
