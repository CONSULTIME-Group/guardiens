import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Verrou SEC du 11/11/2026 : les droits par défaut de la base donnent INSERT,
// UPDATE et DELETE à anon et authenticated sur chaque nouvelle vue. Une vue
// simple devient alors modifiable par PostgREST avec la clé publique
// (public_profiles le 20/09, public_entraide_need_activity le 11/11).
// Règle : toute migration, à partir de 0136, qui crée une vue public.* retire
// ces droits dans le même fichier.
const DIR = join(process.cwd(), "drizzle", "migrations");
const FIRST_GUARDED = 136;
const CREATE_VIEW =
  /CREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.("?)([a-z0-9_]+)\1/gi;

export function viewsWithoutRevoke(sql: string): string[] {
  const missing: string[] = [];
  for (const match of sql.matchAll(CREATE_VIEW)) {
    const view = match[2];
    const revoke = new RegExp(
      `REVOKE\\s+[^;]*\\bDELETE\\b[^;]*\\bON\\s+(?:TABLE\\s+)?public\\."?${view}"?\\s+FROM\\s+[^;]*\\banon\\b[^;]*\\bauthenticated\\b`,
      "i",
    );
    if (!revoke.test(sql)) missing.push(view);
  }
  return missing;
}

describe("vues publiques en lecture seule côté client", () => {
  it("repère une vue créée sans retrait des droits d'écriture", () => {
    expect(viewsWithoutRevoke("CREATE VIEW public.demo AS SELECT 1; GRANT SELECT ON public.demo TO anon;")).toEqual(["demo"]);
    expect(
      viewsWithoutRevoke(
        "CREATE OR REPLACE VIEW public.demo AS SELECT 1; REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.demo FROM anon, authenticated;",
      ),
    ).toEqual([]);
  });

  it("chaque migration récente qui crée une vue retire les droits d'écriture", () => {
    const offenders: string[] = [];
    for (const file of readdirSync(DIR).filter((f) => f.endsWith(".sql"))) {
      const number = Number.parseInt(file.slice(0, 4), 10);
      if (!Number.isFinite(number) || number < FIRST_GUARDED) continue;
      for (const view of viewsWithoutRevoke(readFileSync(join(DIR, file), "utf8"))) {
        offenders.push(`${file} : ${view}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
