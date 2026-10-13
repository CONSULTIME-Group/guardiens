/**
 * Lot X3b (constat C-08) : « Votre demande reste visible » au plus une fois
 * par besoin et par semaine, plus à chaque passage horaire du cron.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  WAVE_EMPTY_NOTIFY_INTERVAL_DAYS,
  waveEmptyNotificationDue,
} from "../../../supabase/functions/_shared/mission-wave";

const NOW = new Date("2026-10-13T12:25:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

describe("waveEmptyNotificationDue", () => {
  it("première fois : la notification part", () => {
    expect(waveEmptyNotificationDue(null, NOW)).toBe(true);
    expect(waveEmptyNotificationDue(undefined, NOW)).toBe(true);
  });
  it("passage suivant, une heure plus tard : rien", () => {
    expect(waveEmptyNotificationDue(hoursAgo(1), NOW)).toBe(false);
    expect(waveEmptyNotificationDue(hoursAgo(6 * 24 + 23), NOW)).toBe(false);
  });
  it("une semaine plus tard : un rappel", () => {
    expect(WAVE_EMPTY_NOTIFY_INTERVAL_DAYS).toBe(7);
    expect(waveEmptyNotificationDue(hoursAgo(7 * 24), NOW)).toBe(true);
  });
  it("date illisible : on s'abstient", () => {
    expect(waveEmptyNotificationDue("pas une date", NOW)).toBe(false);
  });
  it("sur 24 passages horaires, une seule notification", () => {
    let last: string | null = null;
    let sent = 0;
    for (let h = 0; h < 24; h++) {
      const at = new Date(NOW.getTime() + h * 3600_000);
      if (waveEmptyNotificationDue(last, at)) { sent++; last = at.toISOString(); }
    }
    expect(sent).toBe(1);
  });
});

describe("notify-mission-wave", () => {
  const src = readFileSync("supabase/functions/notify-mission-wave/index.ts", "utf8");
  const empty = src.slice(src.indexOf("if (helpers.length === 0)"), src.indexOf("return { sent: 0, wave, empty: true"));
  it("lit la dernière notification du besoin avant d'en écrire une", () => {
    const read = empty.indexOf('.eq("type", "mission_wave_empty")');
    const insert = empty.indexOf('from("notifications").insert(');
    expect(read).toBeGreaterThan(0);
    expect(insert).toBeGreaterThan(read);
    expect(empty).toContain("waveEmptyNotificationDue(lastEmpty?.created_at ?? null, new Date())");
    expect(empty).toContain("!lastEmptyErr &&");
  });
  it("l'email garde sa clé unique par besoin", () => {
    expect(empty).toContain("idempotencyKey: `mission-wave-empty-${missionId}`");
  });
});
