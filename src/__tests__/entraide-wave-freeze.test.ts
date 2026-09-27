import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  countFreezingResponses,
  shouldSendNextWave,
  PENDING_RESPONSE_GRACE_DAYS,
  WAVE_MAX_COUNT,
} from "../../supabase/functions/_shared/mission-wave";

const now = new Date("2026-09-27T16:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const due = (rows: { status: string; created_at: string }[]) =>
  shouldSendNextWave(
    { status: "open", wave_count: 1, last_wave_at: "2026-09-22T10:00:00Z", response_count: countFreezingResponses(rows, now) },
    now,
  );

describe("critère d'arrêt des vagues", () => {
  it("constantes", () => {
    expect(PENDING_RESPONSE_GRACE_DAYS).toBe(5);
    expect(WAVE_MAX_COUNT).toBe(5);
  });
  it("une réponse withdrawn ne gèle plus la diffusion", () => {
    expect(due([{ status: "withdrawn", created_at: daysAgo(1) }])).toBe(true);
  });
  it("une réponse pending de 6 jours ne gèle plus la diffusion", () => {
    expect(due([{ status: "pending", created_at: daysAgo(6) }])).toBe(true);
  });
  it("une réponse pending de 2 jours gèle la diffusion", () => {
    expect(due([{ status: "pending", created_at: daysAgo(2) }])).toBe(false);
  });
  it("une réponse accepted gèle la diffusion quelle que soit son ancienneté", () => {
    for (const d of [0, 6, 40, 400]) expect(due([{ status: "accepted", created_at: daysAgo(d) }])).toBe(false);
    expect(due([{ status: "accepted", created_at: daysAgo(30) }, { status: "pending", created_at: daysAgo(10) }])).toBe(false);
  });
  it("le passage horaire filtre pending et accepted", () => {
    const src = readFileSync("supabase/functions/notify-mission-wave/index.ts", "utf8");
    expect(src).toContain('.in("status", ["pending", "accepted"])');
    expect(src).toContain("response_count: freezing");
  });
});
