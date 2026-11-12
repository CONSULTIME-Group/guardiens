// Lot PR5 (12/11/2026) : les vagues de rendu complet partent tous les 7 jours
// au plus, le filet de sécurité à 14 jours. Prerender refait chaque copie 168 h
// après son dernier rendu : une vague plus fréquente double ce rendu.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "supabase/functions/detect-deploy-and-mark-dirty/index.ts"), "utf8");

describe("PR5, cadence des vagues de rendu", () => {
  it("deux vagues sont séparées de 168 heures au moins", () => {
    expect(src).toMatch(/const MIN_MARK_INTERVAL_HOURS = 168;/);
  });

  it("le filet de sécurité marque une famille après 14 jours sans vague", () => {
    expect(src).toMatch(/const FAMILY_MAX_AGE_DAYS = 14;/);
  });

  it("le délai entre deux vagues reste au moins égal au cycle de 7 jours de Prerender", () => {
    const hours = Number(src.match(/const MIN_MARK_INTERVAL_HOURS = (\d+);/)?.[1]);
    const days = Number(src.match(/const FAMILY_MAX_AGE_DAYS = (\d+);/)?.[1]);
    expect(hours).toBeGreaterThanOrEqual(168);
    expect(days * 24).toBeGreaterThanOrEqual(hours);
  });

  it("le frein et le filet restent branchés sur ces deux constantes", () => {
    expect(src).toContain("hoursSinceLastMark < MIN_MARK_INTERVAL_HOURS");
    expect(src).toContain("days >= FAMILY_MAX_AGE_DAYS");
  });
});
