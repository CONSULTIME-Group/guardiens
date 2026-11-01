/**
 * Lots DUR1 et CP1 (01/11/2026).
 * DUR1 : aucune durée annoncée dans les textes du site et des emails
 * (décision de Jérémie du 01/11 : « ça ne sert à rien d'annoncer une durée »).
 * CP1 : la fiche gardien présente la commune comme lieu de vie ; le nouveau
 * mot de passe est proposé à l'enregistrement avec l'adresse du compte.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (statSync(p).isDirectory()) return /__tests__|admin/i.test(f) ? [] : walk(p);
  return /\.(tsx?|json)$/.test(f) && !/(\.test\.|_test\.|Admin)/.test(f) ? [p] : [];
});

const PROMISE = /(en (quelques|deux|trois|cinq|une|[0-9]+) ?minutes?|minutes? suffi|qu'une minute|Dix secondes|30 secondes|Trois minutes|cinq minutes\b(?! à)|2 minutes")/i;
const ALLOWED = /Réessayez dans quelques minutes|à quelques minutes de chez vous|dans 2 minutes, réessayez|1 à 2 minutes|moins de cinq minutes|au plus tôt dans cinq minutes|vingt minutes|prenez 5 minutes|dix minutes|30 minutes|toutes les 15 minutes|trois fois en deux minutes/i;

describe("DUR1, aucune durée annoncée", () => {
  for (const root of ["src/components", "src/pages", "src/hooks", "src/i18n/locales/fr", "supabase/functions/_shared/transactional-email-templates"]) {
    it(root, () => {
      const hits = walk(root).flatMap((f) => readFileSync(f, "utf8").split("\n")
        .filter((l) => PROMISE.test(l) && !ALLOWED.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)).map((l) => `${f}: ${l.trim()}`));
      expect(hits).toEqual([]);
    });
  }
  it("objets des emails d'accueil", () => {
    const s = readFileSync("supabase/functions/_shared/onboarding-j1-subject.ts", "utf8");
    expect(s).not.toMatch(/= .*minute/);
  });
});

describe("CP1", () => {
  it("fiche : commune lue comme lieu de vie, surtitre sans département", () => {
    const s = readFileSync("src/components/profile/ProfileHero.tsx", "utf8");
    expect(s).toContain("Habite à ${placeParts}");
    expect(s).not.toContain("Garde de maisons en ${");
  });
  it("nouveau mot de passe : adresse du compte et new-password", () => {
    const s = readFileSync("src/pages/ResetPassword.tsx", "utf8");
    expect(s).toContain('autoComplete="username"');
    expect(s.match(/getAuthFieldAttrs\("new-password"\)/g)?.length).toBe(2);
  });
});
