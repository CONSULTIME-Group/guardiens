/**
 * Vérifie l'insertion dans `badge_attributions` depuis le flux LeaveReview,
 * pour les deux directions (owner_to_sitter / sitter_to_owner).
 *
 * Mock Supabase :
 *   - Spy `insertSpy` créé via `vi.hoisted` → partagé proprement avec `vi.mock`
 *     (qui est hoisté lui aussi) sans état module mutable global.
 *   - Réinitialisé via `mockReset()` en `beforeEach` → flux déterministe,
 *     pas de fuite entre tests.
 *   - Le mock ne fait QUE ce qui est testé : `from(table).insert(rows)`.
 *     Pas de chaîne `.select/.eq/.maybeSingle` : aucun effet de bord parasite.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { insertSpy, fromSpy } = vi.hoisted(() => {
  const insertSpy = vi.fn(async (_rows: unknown) => ({ data: null, error: null }));
  const fromSpy = vi.fn((_table: string) => ({ insert: insertSpy }));
  return { insertSpy, fromSpy };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: fromSpy },
}));

import { supabase } from "@/integrations/supabase/client";
import { buildBadgeAttributionRows } from "@/lib/buildBadgeAttributionRows";

const OWNER_ID = "00000000-0000-0000-0000-00000000000a";
const SITTER_ID = "00000000-0000-0000-0000-00000000000b";
const SIT_ID = "00000000-0000-0000-0000-000000000010";

/**
 * Orchestration utilisant la fonction utilitaire partagée avec
 * `src/pages/LeaveReview.tsx`. Si la logique de construction change,
 * ce test l'attrapera car il importe le même module.
 */
async function attributeBadges(opts: {
  selectedBadges: string[];
  revieweeId: string;
  reviewerId: string;
  sitId: string;
}) {
  const rows = buildBadgeAttributionRows(opts);
  if (rows.length === 0) return;
  await supabase.from("badge_attributions").insert(rows);
}

/** Récupère le dernier appel d'insert sur la table donnée, ou undefined. */
function lastInsertOn(table: string): any[] | undefined {
  const call = fromSpy.mock.calls.findIndex(([t]) => t === table);
  if (call === -1) return undefined;
  // Chaque appel `from()` correspond à l'appel `insert()` immédiatement suivant.
  return insertSpy.mock.calls[call]?.[0] as any[] | undefined;
}

describe("LeaveReview — insertion badge_attributions", () => {
  beforeEach(() => {
    fromSpy.mockClear();
    insertSpy.mockClear();
  });

  it("owner_to_sitter : insère les écussons sélectionnés pour le gardien", async () => {
    const badges = ["soin_exemplaire", "communication_top", "on_refait_ca"];
    await attributeBadges({
      selectedBadges: badges,
      revieweeId: SITTER_ID,
      reviewerId: OWNER_ID,
      sitId: SIT_ID,
    });

    expect(fromSpy).toHaveBeenCalledExactlyOnceWith("badge_attributions");
    expect(insertSpy).toHaveBeenCalledTimes(1);

    const rows = lastInsertOn("badge_attributions")!;
    expect(rows).toHaveLength(badges.length);

    rows.forEach((r, i) => {
      expect(r).toEqual({
        user_id: SITTER_ID,
        giver_id: OWNER_ID,
        sit_id: SIT_ID,
        badge_id: badges[i],
        is_manual: false,
      });
      expect(r.giver_id).not.toBe(r.user_id);
      expect(r.badge_id).toMatch(/^[a-z0-9_]+$/);
    });

    const ids = rows.map((r) => r.badge_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sitter_to_owner : insère les écussons sélectionnés pour le propriétaire", async () => {
    const badges = ["annonce_fidele", "accueil_chaleureux"];
    await attributeBadges({
      selectedBadges: badges,
      revieweeId: OWNER_ID,
      reviewerId: SITTER_ID,
      sitId: SIT_ID,
    });

    expect(fromSpy).toHaveBeenCalledExactlyOnceWith("badge_attributions");
    expect(insertSpy).toHaveBeenCalledTimes(1);

    const rows = lastInsertOn("badge_attributions")!;
    expect(rows).toHaveLength(badges.length);

    rows.forEach((r, i) => {
      expect(r).toEqual({
        user_id: OWNER_ID,
        giver_id: SITTER_ID,
        sit_id: SIT_ID,
        badge_id: badges[i],
        is_manual: false,
      });
      expect(r.giver_id).not.toBe(r.user_id);
      expect(r.badge_id).toMatch(/^[a-z0-9_]+$/);
    });
  });

  it("respecte l'ordre exact des badges sélectionnés", async () => {
    const badges = ["c_badge", "a_badge", "b_badge"];
    await attributeBadges({
      selectedBadges: badges,
      revieweeId: SITTER_ID,
      reviewerId: OWNER_ID,
      sitId: SIT_ID,
    });
    const rows = lastInsertOn("badge_attributions")!;
    expect(rows.map((r) => r.badge_id)).toEqual(badges);
  });

  it("aucun badge sélectionné : aucun appel à Supabase", async () => {
    await attributeBadges({
      selectedBadges: [],
      revieweeId: SITTER_ID,
      reviewerId: OWNER_ID,
      sitId: SIT_ID,
    });
    expect(fromSpy).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
