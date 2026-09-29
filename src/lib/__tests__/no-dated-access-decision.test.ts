import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Aucune décision d'accès ne dépend d'une date codée en dur : seuls
 * src/lib/constants.ts (définition) et src/lib/pricing.ts peuvent citer
 * isInGracePeriod, isBeforeLaunch, GRACE_END ou FOUNDER_START.
 */
const ALLOWED = new Set(["src/lib/constants.ts", "src/lib/pricing.ts"]);
const FORBIDDEN = /\b(isInGracePeriod|isBeforeLaunch|GRACE_END|FOUNDER_START)\b/;

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "__tests__" || name === "test") continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p.replace(/\\/g, "/"));
    }
  }
  return out;
};

describe("aucune décision d'accès datée", () => {
  it("personne n'importe les helpers datés hors constants.ts et pricing.ts", () => {
    const offenders = walk("src").filter(
      (f) => !ALLOWED.has(f) && FORBIDDEN.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("les fonctions serveur de paiement suivent la règle partagée", () => {
    for (const f of [
      "supabase/functions/create-checkout/index.ts",
      "supabase/functions/create-checkout-session/index.ts",
      "supabase/functions/send-founder-reminder-7/index.ts",
      "supabase/functions/send-founder-reminder-30/index.ts",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src).toContain("if (isFreeAccessForAll())");
      expect(src).not.toMatch(/new Date\("2026-/);
    }
  });
});
