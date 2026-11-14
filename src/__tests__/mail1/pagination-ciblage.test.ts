/**
 * Lot MAIL1 (14/11/2026) : les tables d'exclusion du ciblage des envois groupés
 * se lisent en entier, par pages triées. Sans pagination, la lecture s'arrête
 * à 1 000 lignes et un filtre d'exclusion laisse passer des membres à tort.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("supabase/functions/send-mass-email/index.ts", "utf8");

describe("MAIL1, ciblage des envois groupés", () => {
  it("les cinq tables d'exclusion passent par readAll", () => {
    for (const table of ["subscriptions", "applications", "conversations", "small_missions", "email_preferences"]) {
      expect(src, table).toMatch(new RegExp(`readAll<[^>]+>\\(\\(from, to\\) => serviceClient\\s+\\.from\\("${table}"\\)`));
    }
  });
  it("chaque page est triée et bornée, une erreur arrête l'envoi", () => {
    const helper = src.slice(src.indexOf("export async function readAll"), src.indexOf("export async function readAll") + 700);
    expect(helper).toContain("if (error) throw new Error(`${label} read failed: ${error.message}`);");
    expect(helper).toContain("if (chunk.length < size) break;");
    expect(src.match(/\.order\("(id|user_id)", \{ ascending: true \}\)\s+\.range\(from, to\)/g)?.length).toBe(5);
  });
  it("plus aucune lecture d'exclusion sans pagination", () => {
    expect(src).not.toMatch(/const \{ data: (subs|appSitters|convs|missionAuthors|optOuts) \}/);
  });
});
