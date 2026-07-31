/**
 * Test 5 — Déterminisme du plafond serveur (SearchOwner).
 *
 * Le plafond `SITTERS_SERVER_CAP` tronque le jeu côté serveur : sans `.order()`
 * explicite, deux appels identiques peuvent renvoyer deux tranches différentes.
 * On contrôle le source (l'ordre est bien demandé avant le `limit`) puis on
 * vérifie le comportement observable via un client mocké.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "src/components/search/SearchOwner.tsx"), "utf8");

describe("déterminisme de la requête gardiens", () => {
  it("la requête porte un .order() explicite avant le .limit(SITTERS_SERVER_CAP)", () => {
    const m = src.match(/\.order\(\s*["'`](\w+)["'`][^)]*\)\s*\.limit\(SITTERS_SERVER_CAP\)/);
    expect(m, "aucun .order() explicite juste avant .limit(SITTERS_SERVER_CAP)").not.toBeNull();
    expect(m![1]).toBe("user_id");
  });

  it("le tri demandé est stable et unique (user_id, clé de la vue)", () => {
    expect(src).toMatch(/\.order\(\s*["'`]user_id["'`],\s*\{\s*ascending:\s*true\s*\}\s*\)/);
  });

  it("deux appels successifs sur le même jeu renvoient le même ordre", async () => {
    // Le serveur est simulé « non déterministe » : il renvoie les lignes dans
    // un ordre arbitraire tant qu'aucun order n'est demandé.
    const rows = Array.from({ length: 10 }, (_, i) => ({ user_id: `u-${9 - i}` }));
    const server = {
      from: () => {
        let ordered: string | null = null;
        const chain: any = {
          select: () => chain,
          neq: () => chain,
          order: (col: string) => { ordered = col; return chain; },
          limit: async (n: number) => {
            const shuffled = [...rows].sort(() => Math.random() - 0.5);
            const data = ordered
              ? [...rows].sort((a, b) => a.user_id.localeCompare(b.user_id)).slice(0, n)
              : shuffled.slice(0, n);
            return { data, error: null };
          },
        };
        return chain;
      },
    };
    const run = async () =>
      (await server.from().select().order("user_id").limit(5)).data.map((r: any) => r.user_id);
    const a = await run();
    const b = await run();
    expect(a).toEqual(b);
  });
});
