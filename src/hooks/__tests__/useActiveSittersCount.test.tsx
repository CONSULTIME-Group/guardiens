/**
 * Test 9 — Compteur public de gardiens.
 *
 * Le chiffre affiché doit être celui des gardiens réellement consultables
 * (profil gardien ET complétion >= 40), pas le total des profils en base.
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// 6 profils gardiens, dont 2 sous le seuil de complétion.
const SITTERS = ["s1", "s2", "s3", "s4", "s5", "s6"];
const COMPLETION: Record<string, number> = { s1: 90, s2: 70, s3: 41, s4: 39, s5: 10, s6: 40 };
// Profils non gardiens, ils ne doivent jamais être comptés.
const OTHERS = { o1: 100, o2: 80 };

vi.mock("@/integrations/supabase/client", () => {
  const build = (table: string) => {
    let min = 0;
    const chain: any = {
      select: () => chain,
      gte: (_c: string, v: number) => { min = v; return chain; },
      range: async () => {
        if (table === "public_sitter_profiles") {
          return { data: SITTERS.map((user_id) => ({ user_id })), error: null };
        }
        const all: Record<string, number> = { ...COMPLETION, ...OTHERS };
        const rows = Object.entries(all)
          .filter(([, c]) => c >= min)
          .map(([id]) => ({ id }));
        return { data: rows, error: null };
      },
    };
    return chain;
  };
  return { supabase: { from: (t: string) => build(t) } };
});

import { useActiveSittersCount } from "@/hooks/useActiveSittersCount";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
};

describe("useActiveSittersCount", () => {
  it("ne compte que les gardiens consultables (complétion >= 40)", async () => {
    const { result } = renderHook(() => useActiveSittersCount(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // s1, s2, s3, s6 : 4 gardiens. Ni s4/s5 (sous le seuil), ni o1/o2 (non gardiens).
    expect(result.current.data).toBe(4);
  });

  it("ne renvoie pas le total des profils en base", async () => {
    const { result } = renderHook(() => useActiveSittersCount(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).not.toBe(SITTERS.length);
    expect(result.current.data).not.toBe(SITTERS.length + Object.keys(OTHERS).length);
  });
});
