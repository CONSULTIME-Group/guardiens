// Lot SORT6 (13/11/2026) : l'entraide sollicite les membres vus depuis 30 jours.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("drizzle/migrations/0150_sort6_entraide_membres_presents.sql", "utf8");

describe("audience de l'entraide", () => {
  it("la règle des 30 jours est dans le moteur de vagues et dans le nombre annoncé au formulaire", () => {
    expect(sql.match(/p\.last_seen_at > now\(\) - interval '30 days'/gi)).toHaveLength(2);
    expect(sql.match(/-- sort6_membres_presents/g)).toHaveLength(2);
  });
  it("le plafond de 30 km et le rayon de l'aidant restent en place (lot E20)", () => {
    expect(sql).toContain("AND d.dist <= least(coalesce(p_floor, 30), 30)::double precision");
    expect(sql).toContain("AND d.dist <= public.mutual_aid_radius_km(p.id)::double precision");
    expect(sql).toContain("and d.dist <= least(public.mutual_aid_radius_km(p.id), 30);");
  });
  it("les droits restent ceux de la production : vagues au rôle service, aperçu aux membres connectés", () => {
    expect(sql).not.toMatch(/GRANT[^;]*mission_wave_audience_floor[^;]*TO[^;]*\b(anon|authenticated|PUBLIC)\b/i);
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.mission_wave_audience_preview(double precision, double precision) TO authenticated, service_role;");
  });
  it("aucune donnée modifiée, les sorties gardent leur propre audience", () => {
    expect(sql).not.toMatch(/\b(UPDATE|DELETE FROM|INSERT INTO)\b/);
    expect(sql).not.toMatch(/outing/);
  });
});
