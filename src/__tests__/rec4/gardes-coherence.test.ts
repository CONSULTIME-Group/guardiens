/** Lot REC4 : cohérence des gardes en base (migration 0183) et liens du générateur d'articles. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const sql = read("drizzle/migrations/0183_rec4_gardes_coherence.sql");

describe("REC4, annonce remise en ligne après l'annulation du gardien", () => {
  it("la remise en ligne efface l'auteur et la date de l'annulation", () => {
    expect(sql).toMatch(/status = 'published',\s+accepting_applications = true,\s+cancelled_by = NULL,\s+cancelled_at = NULL/);
  });
  it("le compteur du gardien se lit sur ses avis d'annulation", () => {
    expect(sql).toMatch(/r\.reviewer_id = p_user_id\s+AND r\.review_type = 'annulation'\s+AND r\.cancelled_by_role = 'gardien'/);
    expect(sql).toContain("PERFORM set_config('app.allow_internal_profile_update', 'on', true);");
    expect(sql).toContain("PERFORM set_config('app.allow_internal_profile_update', 'off', true);");
  });
});

describe("REC4, dates passées", () => {
  it("le garde-fou ne vise que le statut publié et laisse passer l'équipe et le serveur", () => {
    expect(sql).toContain("IF NEW.status IS DISTINCT FROM 'published'::sit_status OR NEW.end_date IS NULL THEN");
    expect(sql).toContain("IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN");
    expect(sql).toContain("HINT = 'sit_dates_past'");
  });
  it("une annonce publiée dont la fin vient de passer reste modifiable", () => {
    expect(sql).toMatch(/OLD\.status IS NOT DISTINCT FROM 'published'::sit_status\s+AND NEW\.end_date IS NOT DISTINCT FROM OLD\.end_date/);
  });
  it("le déclencheur se pose sur le statut et la date de fin", () => {
    expect(sql).toContain("BEFORE INSERT OR UPDATE OF status, end_date ON public.sits");
  });
  it("le contrat de production suit la migration", () => {
    const contracts = JSON.parse(read("scripts/db/production-contracts.json"));
    const c = contracts.contracts.find((x: { migration: string }) => x.migration === "0183_rec4_gardes_coherence.sql");
    expect(c?.checks?.length).toBe(2);
  });
});

describe("REC4, liens du générateur d'articles", () => {
  it("les liens internes visent des pages qui existent", () => {
    const fn = read("supabase/functions/generate-longtail-article/index.ts");
    expect(fn).toContain("`/house-sitting/${citySlug}`");
    expect(fn).toContain("'/petites-missions'");
    expect(fn).not.toContain("/coup-de-main");
    expect(fn).not.toContain("`/villes/");
  });
});
