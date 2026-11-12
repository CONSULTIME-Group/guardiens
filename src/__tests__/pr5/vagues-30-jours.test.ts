// Lot PR5 (12/11/2026) : les vagues de rendu complet partent tous les 30 jours
// au plus, le filet de sécurité à 30 jours. Prerender refait chaque copie 168 h
// après son dernier rendu : une vague à 7 jours double ce rendu, Prerender propage seul un gabarit en 7 jours.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "supabase/functions/detect-deploy-and-mark-dirty/index.ts"), "utf8");

describe("PR5, cadence des vagues de rendu", () => {
  it("deux vagues sont séparées de 720 heures au moins", () => {
    expect(src).toMatch(/const MIN_MARK_INTERVAL_HOURS = 720;/);
  });

  it("le filet de sécurité marque une famille après 30 jours sans vague", () => {
    expect(src).toMatch(/const FAMILY_MAX_AGE_DAYS = 30;/);
  });

  it("le délai entre deux vagues dépasse le cycle de 7 jours de Prerender", () => {
    const hours = Number(src.match(/const MIN_MARK_INTERVAL_HOURS = (\d+);/)?.[1]);
    const days = Number(src.match(/const FAMILY_MAX_AGE_DAYS = (\d+);/)?.[1]);
    expect(hours).toBeGreaterThan(168);
    expect(days * 24).toBeGreaterThanOrEqual(hours);
  });

  it("le frein et le filet restent branchés sur ces deux constantes", () => {
    expect(src).toContain("hoursSinceLastMark < MIN_MARK_INTERVAL_HOURS");
    expect(src).toContain("days >= FAMILY_MAX_AGE_DAYS");
  });
});
