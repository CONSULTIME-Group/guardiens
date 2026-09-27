import { describe, it, expect, vi, beforeEach } from "vitest";
import hookSrc from "@/hooks/useRecentPublishedSits?raw";

const sitsRows = [
  { id: "s1", user_id: "u1", title: "Garde de deux chats à Lyon" },
  { id: "s2", user_id: "u2", title: "Garde de trois chiens à Joigny" },
];
let failCoords = false;

vi.mock("@/integrations/supabase/client", () => {
  const sitsChain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "or", "order"]) sitsChain[m] = () => sitsChain;
  sitsChain.limit = async () => ({ data: sitsRows, error: null });
  return {
    supabase: {
      from: (table: string) => {
        if (table === "sits") return sitsChain;
        return {
          select: () => ({
            in: async () =>
              failCoords
                ? { data: null, error: { message: "permission denied" } }
                : { data: [{ id: "u1", latitude_approx: 45.7, longitude_approx: 4.8 }], error: null },
          }),
        };
      },
    },
  };
});

import { QueryClient } from "@tanstack/react-query";
import { useRecentPublishedSits } from "@/hooks/useRecentPublishedSits";

async function run() {
  // Récupère la queryFn sans monter de composant.
  const spy = vi.fn();
  const qc = new QueryClient();
  const opts = (useRecentPublishedSits as unknown as { toString(): string }) && null;
  void opts; void spy;
  const mod = await import("@tanstack/react-query");
  const original = mod.useQuery;
  let fn: (() => Promise<unknown>) | undefined;
  vi.spyOn(mod, "useQuery").mockImplementation(((o: { queryFn: () => Promise<unknown> }) => { fn = o.queryFn; return {} as never; }) as never);
  useRecentPublishedSits();
  (mod.useQuery as unknown as { mockRestore(): void }).mockRestore();
  void original; void qc;
  return fn!();
}

describe("useRecentPublishedSits, visiteur non connecté", () => {
  beforeEach(() => { failCoords = false; });

  it("aucune sélection embarquée profiles! dans le hook", () => {
    expect(hookSrc).not.toMatch(/profiles!/);
    expect(hookSrc).toContain("public_profiles");
  });

  it("coordonnées approchées rattachées aux annonces", async () => {
    const rows = (await run()) as Array<{ id: string; owner: unknown }>;
    expect(rows).toHaveLength(2);
    expect(rows[0].owner).toEqual({ latitude: 45.7, longitude: 4.8 });
    expect(rows[1].owner).toBeNull();
  });

  it("échec de la requête de coordonnées : la liste reste pleine", async () => {
    failCoords = true;
    const rows = (await run()) as Array<{ id: string; owner: unknown }>;
    expect(rows.map((r) => r.id)).toEqual(["s1", "s2"]);
    expect(rows.every((r) => r.owner === null)).toBe(true);
  });
});
