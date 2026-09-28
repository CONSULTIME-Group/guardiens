import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("drizzle/migrations/0030_admin_signals_s1.sql"), "utf8");
const untapped = readFileSync(resolve("supabase/functions/nudge-untapped-cities/index.ts"), "utf8");
const block = (name: string) => {
  const i = sql.indexOf(`${name} AS`);
  expect(i, name).toBeGreaterThan(-1);
  return sql.slice(i, sql.indexOf("), ", i + 10) + 1 || undefined);
};

describe("Lot S1, signaux admin", () => {
  it("A : detect_stale_drafts écarte les annonces déjà publiées ou dépubliées", () => {
    const fn = sql.slice(sql.indexOf("FUNCTION public.detect_stale_drafts"), sql.indexOf("FUNCTION public.normalize_admin_signal_severity"));
    expect(fn).toMatch(/s\.published_at IS NULL/);
    expect(fn).toMatch(/s\.unpublished_at IS NULL/);
    expect(fn).toMatch(/s\.last_unpublished_reason IS NULL/);
    expect(fn).toMatch(/>= current_date/);
  });

  it("A : stale_draft résolu si publiée, supprimée, datée au passé ou déjà publiée une fois", () => {
    expect(sql).toMatch(/signal_type = 'stale_draft' AND EXISTS \(\s*SELECT 1 FROM public\.sits si WHERE si\.id = s\.entity_id AND si\.status <> 'draft'/);
    const b = block("stale_draft_obsolete");
    expect(b).toMatch(/NOT EXISTS \(SELECT 1 FROM public\.sits/);
    expect(b).toMatch(/< current_date/);
    expect(b).toMatch(/si\.published_at IS NOT NULL/);
    expect(b).toMatch(/si\.unpublished_at IS NOT NULL/);
    expect(b).toMatch(/si\.last_unpublished_reason IS NOT NULL/);
  });

  it("B : city_coverage_gap jamais critique (création, trigger, rafraîchissement)", () => {
    expect(untapped).not.toMatch(/sitters_count === 0 \? "critical"/);
    expect(untapped).toMatch(/signal_type: "city_coverage_gap",[\s\S]{0,120}severity: "warning"/);
    expect(sql).toMatch(/NEW\.signal_type = 'city_coverage_gap' AND NEW\.severity = 'critical' THEN\s*NEW\.severity := 'warning'/);
    expect(sql).not.toMatch(/THEN 'critical' ELSE 'warning'/);
  });

  it("C : résolutions automatiques ajoutées et branchées", () => {
    for (const name of [
      "nurturing_single_run_recovered",
      "pending_application_sit_closed",
      "discussion_sit_settled",
      "digest_queue_cleared",
      "owner_sit_confirmed",
    ]) {
      expect(sql).toMatch(new RegExp(`UNION ALL SELECT \\* FROM ${name}`));
    }
    expect(block("nurturing_single_run_recovered")).toMatch(/r\.started_at > s\.detected_at[\s\S]*r\.status = 'success'[\s\S]*'errors' = '0'/);
    expect(block("pending_application_sit_closed")).toMatch(/NOT IN \('published', 'confirmed', 'in_progress'\)/);
    expect(block("discussion_sit_settled")).toMatch(/si\.status <> 'published'/);
  });
});
