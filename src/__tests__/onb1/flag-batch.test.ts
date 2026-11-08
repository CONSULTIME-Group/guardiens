/** Lot ONB1 : drapeaux demandés au même instant lus en une seule requête. */
import { describe, it, expect, vi } from "vitest";

const calls: Array<{ table: string; keys: string[] }> = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        in: (_c: string, keys: string[]) => {
          calls.push({ table, keys });
          return Promise.resolve({ data: [{ key: "arrival_v2", enabled: true, applies_since: "2026-11-01T07:44:00Z" }], error: null });
        },
      }),
    }),
  },
}));

import { getFlag } from "@/hooks/useFeatureFlag";

describe("useFeatureFlag, lecture groupée", () => {
  it("deux drapeaux du même instant : une requête, chacun sa valeur, absent = éteint", async () => {
    const [a, b] = await Promise.all([getFlag("arrival_v2"), getFlag("mandatory_affinity_onboarding")]);
    expect(calls).toEqual([{ table: "feature_flags", keys: ["arrival_v2", "mandatory_affinity_onboarding"] }]);
    expect(a).toEqual({ enabled: true, appliesSince: "2026-11-01T07:44:00Z" });
    expect(b).toEqual({ enabled: false, appliesSince: null });
    await getFlag("arrival_v2");
    expect(calls).toHaveLength(1);
  });
});
