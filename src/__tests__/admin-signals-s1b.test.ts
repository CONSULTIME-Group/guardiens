import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { signalsCountLine } from "@/pages/admin/_components/dashboard/SignalsSection";

const sql = readFileSync(resolve("drizzle/migrations/0031_admin_dashboard_snapshot_sort_s1b.sql"), "utf8");

describe("Lot S1b, snapshot admin", () => {
  it("trie par gravité puis date AVANT le LIMIT 20", () => {
    const i = sql.indexOf("FROM public.admin_signals\n        WHERE resolved_at IS NULL AND severity <> 'info'");
    const sub = sql.slice(i, sql.indexOf("LIMIT 20", i) + 8);
    expect(sub).toMatch(/ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,\s*detected_at DESC\s*LIMIT 20$/);
  });
  it("expose les totaux ouverts et critiques", () => {
    expect(sql).toMatch(/'signals_open_total'/);
    expect(sql).toMatch(/'signals_critical_total'[\s\S]*severity = 'critical'/);
  });
  it("sauvegarde l'ancienne définition pour retour arrière", () => {
    expect(sql).toMatch(/_backup_dashboard_snapshot_s1b_20260928[\s\S]*pg_get_functiondef/);
  });
  it("ligne de compte", () => {
    expect(signalsCountLine(20, 171, 9)).toBe("20 affichés sur 171, dont 9 critiques.");
    expect(signalsCountLine(3, 3, 1)).toBe("3 signaux ouverts, dont 1 critique.");
    expect(signalsCountLine(0, 0, 0)).toBeNull();
  });
});
