import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

/**
 * Garde-fou du constat du 19/08/2026 sur notify-sitters-on-publish :
 * les profils des candidats étaient chargés par lots de 500 UUID dans un
 * `.in()`. L'URL PostgREST dépassait la limite acceptée, le premier lot
 * échouait, et l'erreur n'était pas récupérée (`const { data: rows }` sans
 * `error`, puis `rows ?? []`) : 500 gardiens éligibles disparaissaient en
 * silence à chaque annonce publiée.
 *
 * Deux règles permanentes sur ce fichier :
 *  1. Aucun `.in()` ne dépasse 200 identifiants par lot.
 *  2. Aucun résultat de requête Supabase n'est utilisé sans que l'erreur
 *     soit examinée.
 */

const SRC = readFileSync("supabase/functions/notify-sitters-on-publish/index.ts", "utf8");

/** Résout la valeur numérique d'une constante `const IDENT = 123`. */
function constValue(ident: string): number | null {
  const re = new RegExp(`const\\s+${ident}\\s*=\\s*(\\d+)`);
  const m = SRC.match(re);
  return m ? Number(m[1]) : null;
}

describe("notify-sitters-on-publish : lots et erreurs", () => {
  it("aucun lot `.in()` ne dépasse 200 identifiants", () => {
    const sliceRe = /\.slice\(\s*\w+\s*,\s*\w+\s*\+\s*(\w+)\s*\)/g;
    const idents = [...SRC.matchAll(sliceRe)].map((m) => m[1]);
    expect(idents.length).toBeGreaterThan(0);
    for (const ident of idents) {
      const value = constValue(ident);
      expect(value, `taille de lot ${ident} non résoluble`).not.toBeNull();
      expect(value!, `lot ${ident} = ${value}, au delà de 200`).toBeLessThanOrEqual(200);
      expect(value!).toBeGreaterThanOrEqual(1);
    }
  });

  it("chaque appel Supabase awaité est lié et examine l'erreur", () => {
    const awaited = SRC.match(/await\s+supabase\.(from|rpc|functions)/g) ?? [];
    const bound = [
      ...SRC.matchAll(/const\s*\{([^}]*)\}\s*=\s*await\s+supabase\.(from|rpc|functions)/g),
    ];
    expect(awaited.length).toBeGreaterThan(0);
    expect(
      bound.length,
      "des appels Supabase awaités ne sont pas liés à un résultat",
    ).toBe(awaited.length);
    for (const b of bound) {
      expect(
        /\berror\b/.test(b[1]),
        `résultat utilisé sans examiner l'erreur : const { ${b[1].trim()} }`,
      ).toBe(true);
    }
  });

  it("le cas fautif d'origine ne revient pas : lot de 500 sans erreur récupérée", () => {
    expect(SRC).not.toContain("= 500");
    expect(SRC).not.toMatch(/const\s*\{\s*data:\s*rows\s*\}\s*=\s*await\s+supabase/);
  });
});
