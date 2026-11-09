/**
 * Lot CRON2 (09/11/2026) : les tâches des récapitulatifs, écrites en UTC,
 * couvrent les heures de Paris visées en heure d'hiver (UTC+1) et d'été (UTC+2).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ALERT_DIGEST_TARGET_PARIS_HOURS, NEARBY_DAILY_DIGEST_TARGET_PARIS_HOURS } from "../../../supabase/functions/_shared/paris-hour.ts";

const sql = readFileSync("drizzle/migrations/0123_cron_heure_hiver.sql", "utf8");

function utcHours(field: string): number[] {
  return field.split(",").flatMap((p) => {
    const [a, b] = p.split("-").map(Number);
    return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i);
  });
}
const schedule = (job: string) => sql.match(new RegExp(`jobname = '${job}'\\), schedule := '([^']+)'`))![1];
const parisHours = (job: string, offset: number) => utcHours(schedule(job).split(" ")[1]).map((h) => (h + offset) % 24);

describe("récapitulatifs servis été comme hiver", () => {
  it("alerte de 12 h et 18 h : un passage dans le créneau à chaque saison", () => {
    for (const [job, target] of [["alert-digest-12h", 12], ["alert-digest-18h", 18]] as const) {
      expect(ALERT_DIGEST_TARGET_PARIS_HOURS).toContain(target);
      for (const offset of [1, 2]) expect(parisHours(job, offset).filter((h) => h === target), `${job} UTC+${offset}`).toHaveLength(1);
    }
  });

  it("proximité : toutes les heures visées, 9 h à 12 h, à chaque saison", () => {
    for (const offset of [1, 2]) {
      const hours = parisHours("nearby-daily-digest", offset);
      for (const h of NEARBY_DAILY_DIGEST_TARGET_PARIS_HOURS) expect(hours, `UTC+${offset}`).toContain(h);
    }
  });

  it("seul l'horaire change, contrôlé après modification", () => {
    expect(sql).not.toMatch(/command\s*:=/);
    expect(sql).toContain("Horaires des récapitulatifs non conformes après modification");
  });
});
