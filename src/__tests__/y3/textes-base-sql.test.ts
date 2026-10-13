/**
 * Lot Y3 : textes stockés en base (articles, FAQ, pages ville et département).
 * Le fichier préparé sauvegarde d'abord les lignes visées (relecture du
 * 13/10/2026, point C), puis ne fait que des UPDATE ciblés et gardés par
 * l'ancien texte (rejouables), et les nouveaux textes suivent la doctrine.
 * Lecture statique du SQL, aucune base touchée.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(
  join(__dirname, "..", "..", "..", "supabase/prepared-migrations/20261013200200_y3_textes_base.sql"),
  "utf8",
);
const code = sql.replace(/^\s*--[^\n]*$/gm, "");
const allStatements = code
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
const BACKUP = "public._backup_y3_textes_20261013";
const backupStatements = allStatements.filter((s) => s.includes(BACKUP));
const statements = allStatements.filter((s) => !s.includes(BACKUP));

/** Nouveaux textes : second membre des replace(), et valeurs posées par SET. */
function newTexts(): string[] {
  const out: string[] = [];
  const pair = /\$y3\$([\s\S]*?)\$y3\$,\s*\$y3\$([\s\S]*?)\$y3\$\)/g;
  let m: RegExpExecArray | null;
  while ((m = pair.exec(code)) !== null) out.push(m[2]);
  const set = /(?:SET|,)\s*(?:question|answer)\s*=\s*\$y3\$([\s\S]*?)\$y3\$/g;
  while ((m = set.exec(code)) !== null) out.push(m[1]);
  return out;
}

describe("Y3 · SQL des textes en base", () => {
  it("sauvegarde rejouable et fermée, avant tout UPDATE", () => {
    expect(backupStatements.length).toBe(3);
    expect(backupStatements[0]).toMatch(/^CREATE TABLE IF NOT EXISTS public\._backup_y3_textes_20261013 AS\s+SELECT /);
    expect(backupStatements[1]).toBe(`ALTER TABLE ${BACKUP} ENABLE ROW LEVEL SECURITY`);
    expect(backupStatements[2]).toBe(`REVOKE ALL ON ${BACKUP} FROM PUBLIC, anon, authenticated`);
    expect(allStatements.slice(0, 3)).toEqual(backupStatements);
    const backup = backupStatements[0];
    for (const t of ["articles", "faq_entries", "seo_department_pages", "seo_city_pages"]) {
      expect(backup).toContain(`FROM public.${t}`);
    }
    // Chaque article et chaque entrée de FAQ réécrits figurent dans la sauvegarde.
    const ids = [...code.matchAll(/WHERE id = '([0-9a-f-]{36})'/g)].map((m) => m[1]);
    expect(ids.length).toBe(11);
    for (const id of ids) expect(backup).toContain(`'${id}'`);
  });

  it("hors sauvegarde, uniquement des UPDATE, chacun avec sa clause WHERE", () => {
    expect(statements.join("\n")).not.toMatch(/\b(DELETE|INSERT|TRUNCATE|DROP|ALTER|CREATE|REVOKE|GRANT)\b/i);
    expect(statements.length).toBeGreaterThan(0);
    for (const s of statements) {
      expect(s, s.slice(0, 80)).toMatch(/^UPDATE public\.(articles|faq_entries|seo_city_pages|seo_department_pages)\b/);
      expect(s, s.slice(0, 80)).toMatch(/\bWHERE\b/);
    }
  });

  it("articles et FAQ : ciblés par identifiant et gardés par l'ancien texte", () => {
    const targeted = statements.filter((s) => /^UPDATE public\.(articles|faq_entries)\b/.test(s));
    expect(targeted.length).toBe(11);
    for (const s of targeted) {
      expect(s).toMatch(/WHERE id = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/);
      expect(s).toMatch(/AND (position\(|question = |slug = )/);
    }
  });

  it("pages ville et département : la garde porte sur l'ancien motif (une seconde exécution ne touche rien)", () => {
    const bulk = statements.filter((s) => /^UPDATE public\.seo_(city|department)_pages\b/.test(s));
    expect(bulk.length).toBe(7);
    for (const s of bulk) expect(s).toMatch(/WHERE \w+ (LIKE|~) /);
  });

  it("les nouveaux textes suivent la doctrine", () => {
    const texts = newTexts();
    expect(texts.length).toBeGreaterThan(20);
    for (const t of texts) {
      expect(t).not.toMatch(/[–—]/);
      expect(t).not.toMatch(/pour les propriétaires/i);
      expect(t).not.toMatch(/\bpensions?\b/i);
      expect(t).not.toMatch(/abonnement|sans engagement|offert/i);
      expect(t).not.toMatch(/60\s*%/);
      expect(t).not.toMatch(/contrairement|pet-sitter/i);
    }
    expect(sql).toContain("Combien coûte Guardiens ?");
    expect(sql).toContain("dont le profil atteint 40 %");
    expect(sql).toContain("Guardiens est gratuit, pour tous les membres.");
  });
});
