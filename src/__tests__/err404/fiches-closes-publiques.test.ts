/**
 * Lot ERR404 (rapport d'erreurs de pages du 22 au 29/10/2026, option A) :
 * gardes expirées passées et besoins clos lisibles par un visiteur, noindex,
 * sans toucher aux listes (public_small_missions reste « open »).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isIndexableEntraideMission } from "../../../supabase/functions/_shared/entraideMissionIndexability.js";

const read = (p: string) => readFileSync(p, "utf8");
const sql = read("supabase/migrations/20261029170000_err404_fiches_closes_publiques.sql");

describe("garde expirée", () => {
  it("get_public_sit sert une garde expirée seulement si sa fin est passée", () => {
    expect(sql).toMatch(/sits\.status::text = 'expired' AND sits\.end_date IS NOT NULL AND sits\.end_date < current_date/);
  });
  it("brouillons et annulées restent privés", () => {
    expect(sql).not.toMatch(/ARRAY\[[^\]]*'draft'/);
    expect(sql).not.toMatch(/ARRAY\[[^\]]*'cancelled'/);
  });
  it("la page range « expired » parmi les gardes closes (200, noindex)", () => {
    const page = read("src/pages/PublicSitDetail.tsx");
    expect(page).toMatch(/CLOSED_STATUSES = \[[^\]]*"expired"/);
    expect(page).toMatch(/const isIndexable = !isClosedSit/);
  });
});

describe("besoin terminé ou clos", () => {
  it("vue dédiée limitée à completed et cancelled, masquages modération conservés", () => {
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.public_closed_small_missions/);
    expect(sql).toMatch(/status IN \('completed'::small_mission_status, 'cancelled'::small_mission_status\)/);
    expect(sql).toMatch(/moderation_hidden_at IS NULL\) AND \(hidden_at IS NULL/);
    expect(sql).toMatch(/GRANT SELECT ON public\.public_closed_small_missions TO anon/);
  });
  it("la fiche lit la vue dédiée seulement pour un visiteur sans résultat ouvert", () => {
    const page = read("src/pages/SmallMissionDetail.tsx");
    expect(page).toMatch(/if \(!m && !user\)/);
    expect(page).toMatch(/public_closed_small_missions/);
  });
  it("un besoin clos reste en noindex", () => {
    const base = { slug: "x", description: "a".repeat(250), mission_type: "besoin" };
    expect(isIndexableEntraideMission({ ...base, status: "completed" })).toBe(false);
    expect(isIndexableEntraideMission({ ...base, status: "cancelled" })).toBe(false);
  });
  it("les listes publiques gardent le filtre « open »", () => {
    expect(read("supabase/migrations/20260915151704_67c2ae22-c246-4f57-acbf-8b4f1c72f4d0.sql")).toMatch(/status = 'open'/);
  });
});

describe("ligne de test QA", () => {
  it("retirée de la production, uniquement si non publiée", () => {
    expect(sql).toMatch(/DELETE FROM public\.seo_city_pages WHERE slug = 'test-ville-qa-guardiens' AND published = false/);
  });
});
