/**
 * Lot ERRFIX du 31/10/2026 : admin_site_health en 500 « canceling statement
 * due to statement timeout » (57014) sur /admin, le 30/10/2026. Le rôle
 * authenticated plafonne une requête à 8 s, et admin_cron_health lisait tout
 * cron_run_log trois fois (43 933 lignes, environ 45 000 pages par appel).
 * Verrou : le journal se lit par tâche suivie, sur l'index (edge_name,
 * started_at DESC), jamais en entier.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const raw = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0112_errfix_admin_cron_health_lateral.sql"),
  "utf8",
);
/** Le SQL exécuté, sans les commentaires de ligne. */
const sql = raw.replace(/--[^\n]*/g, "");

describe("admin_cron_health, lecture bornée du journal des tâches", () => {
  it("redéfinit admin_cron_health sans balayer tout cron_run_log", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.admin_cron_health\(\)/);
    expect(sql).not.toMatch(/DISTINCT ON \(edge_name\)/);
    expect(sql).not.toMatch(/ROW_NUMBER\(\) OVER \(PARTITION BY edge_name/);
    expect(sql).not.toMatch(/FROM public\.cron_run_log GROUP BY edge_name/);
  });

  it("trois lectures LATERAL par tâche, chacune bornée par edge_name", () => {
    const laterals = sql.match(/LEFT JOIN LATERAL \(/g) ?? [];
    expect(laterals).toHaveLength(3);
    const filtered = sql.match(/WHERE l\.edge_name = c\.edge_name/g) ?? [];
    expect(filtered).toHaveLength(3);
    expect(sql).toMatch(/ORDER BY l\.started_at DESC LIMIT 1/);
    expect(sql).toMatch(/ORDER BY l\.started_at DESC LIMIT 3/);
    expect(sql).toMatch(/l\.started_at >= now\(\) - interval '7 days'/);
  });

  it("garde les règles d'état, le contrôle d'accès et les droits", () => {
    expect(sql).toMatch(/RAISE EXCEPTION 'Not authorized'/);
    expect(sql).toMatch(/WHEN COALESCE\(rs\.failed_7d, 0\) >= 1 THEN 'degraded'/);
    expect(sql).toMatch(/'failed_in_last_3', COALESCE\(e\.failed_in_last_3, 0\)/);
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_cron_health() FROM PUBLIC, anon;");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.admin_cron_health() TO authenticated, service_role;",
    );
  });

  it("indexe started_at pour les échecs des 24 dernières heures", () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_cron_run_log_started_at\s+ON public\.cron_run_log \(started_at DESC\)/);
  });
});
