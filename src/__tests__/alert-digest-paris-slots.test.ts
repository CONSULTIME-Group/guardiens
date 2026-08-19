import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  ALERT_DIGEST_TARGET_PARIS_HOURS,
  parisWindowVerdictForHours,
} from "../../supabase/functions/_shared/paris-hour";

/**
 * Garde-fou du constat du 19/08/2026 : send-alert-digest visait 8h en dur
 * (parisWindowVerdict(now, 8)). Les crons de 12h et 18h sortaient toujours
 * en outside_target_hour et leurs destinataires n'ont jamais rien reçu.
 * L'heure cible doit venir du créneau réel d'exécution.
 */

describe("send-alert-digest : créneaux 8h, 12h et 18h, heure de Paris", () => {
  it("les trois créneaux sont 8, 12 et 18", () => {
    expect([...ALERT_DIGEST_TARGET_PARIS_HOURS]).toEqual([8, 12, 18]);
  });

  it("les trois créneaux passent en été (UTC+2)", () => {
    expect(parisWindowVerdictForHours(new Date("2026-08-19T06:30:00Z"), ALERT_DIGEST_TARGET_PARIS_HOURS))
      .toEqual({ run: true, parisHour: 8 });
    expect(parisWindowVerdictForHours(new Date("2026-08-19T10:15:00Z"), ALERT_DIGEST_TARGET_PARIS_HOURS))
      .toEqual({ run: true, parisHour: 12 });
    expect(parisWindowVerdictForHours(new Date("2026-08-19T16:45:00Z"), ALERT_DIGEST_TARGET_PARIS_HOURS))
      .toEqual({ run: true, parisHour: 18 });
  });

  it("les trois créneaux passent en hiver (UTC+1)", () => {
    expect(parisWindowVerdictForHours(new Date("2026-01-19T07:00:00Z"), ALERT_DIGEST_TARGET_PARIS_HOURS))
      .toEqual({ run: true, parisHour: 8 });
    expect(parisWindowVerdictForHours(new Date("2026-01-19T11:00:00Z"), ALERT_DIGEST_TARGET_PARIS_HOURS))
      .toEqual({ run: true, parisHour: 12 });
    expect(parisWindowVerdictForHours(new Date("2026-01-19T17:00:00Z"), ALERT_DIGEST_TARGET_PARIS_HOURS))
      .toEqual({ run: true, parisHour: 18 });
  });

  it("un passage hors créneau sort en outside_target_hour", () => {
    const verdict = parisWindowVerdictForHours(new Date("2026-08-19T07:00:00Z"), ALERT_DIGEST_TARGET_PARIS_HOURS);
    expect(verdict.run).toBe(false);
    expect(verdict.parisHour).toBe(9);
    expect(verdict.reason).toBe("outside_target_hour");
  });

  it("la plage calme prime sur les créneaux", () => {
    const verdict = parisWindowVerdictForHours(new Date("2026-08-19T20:30:00Z"), ALERT_DIGEST_TARGET_PARIS_HOURS);
    expect(verdict.run).toBe(false);
    expect(verdict.reason).toBe("quiet_hours");
  });

  it("send-alert-digest ne vise plus 8h en dur", () => {
    const src = readFileSync("supabase/functions/send-alert-digest/index.ts", "utf8");
    expect(src).toContain("parisWindowVerdictForHours(now, ALERT_DIGEST_TARGET_PARIS_HOURS)");
    expect(src).not.toMatch(/parisWindowVerdict\(now, 8\)/);
  });
});
