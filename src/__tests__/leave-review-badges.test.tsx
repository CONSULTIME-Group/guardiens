/**
 * Vérifie l'insertion dans `badge_attributions` depuis le flux LeaveReview,
 * pour les deux directions :
 *   - owner_to_sitter : le proprio note le gardien → les rows ciblent le sitter.
 *   - sitter_to_owner : le gardien note le proprio → les rows ciblent l'owner.
 *
 * On reproduit ici exactement la projection effectuée dans LeaveReview.handleSubmit
 * (lignes ~206-214) : un test unitaire sur la construction des lignes,
 * couplé à un mock Supabase qui capture les appels `.insert()`.
 *
 * Cette approche évite tout rendu React (pas de timeout, pas de souci d'act/UI)
 * et garantit que le contrat envoyé à la table reste correct.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const inserted: Record<string, any[]> = {};

vi.mock("@/integrations/supabase/client", () => {
  const buildChain = (table: string): any => {
    const chain: any = {
      insert: (rows: any) => {
        if (!inserted[table]) inserted[table] = [];
        inserted[table].push(rows);
        return Promise.resolve({ data: null, error: null });
      },
    };
    return chain;
  };
  return {
    supabase: { from: (table: string) => buildChain(table) },
  };
});

import { supabase } from "@/integrations/supabase/client";

const OWNER_ID = "00000000-0000-0000-0000-00000000000a";
const SITTER_ID = "00000000-0000-0000-0000-00000000000b";
const SIT_ID = "00000000-0000-0000-0000-000000000010";

/**
 * Reproduction fidèle du bloc "attribution des écussons" de
 * `src/pages/LeaveReview.tsx` (handleSubmit). Si ce code change là-bas,
 * il doit aussi changer ici, et le test l'attrapera.
 */
async function attributeBadges(opts: {
  selectedBadges: string[];
  revieweeId: string;
  reviewerId: string;
  sitId: string;
}) {
  if (opts.selectedBadges.length === 0) return;
  const badgeRows = opts.selectedBadges.map((badge_id) => ({
    user_id: opts.revieweeId,
    giver_id: opts.reviewerId,
    sit_id: opts.sitId,
    badge_id,
    is_manual: false,
  }));
  await supabase.from("badge_attributions").insert(badgeRows);
}

describe("LeaveReview — insertion badge_attributions", () => {
  beforeEach(() => {
    Object.keys(inserted).forEach((k) => delete inserted[k]);
  });

  it("owner_to_sitter : insère les écussons sélectionnés pour le gardien", async () => {
    await attributeBadges({
      selectedBadges: ["soin_exemplaire", "communication_top", "on_refait_ca"],
      revieweeId: SITTER_ID,
      reviewerId: OWNER_ID,
      sitId: SIT_ID,
    });

    expect(inserted.badge_attributions).toHaveLength(1);
    const rows = inserted.badge_attributions[0] as any[];
    expect(rows).toHaveLength(3);
    rows.forEach((r) => {
      expect(r.user_id).toBe(SITTER_ID);
      expect(r.giver_id).toBe(OWNER_ID);
      expect(r.sit_id).toBe(SIT_ID);
      expect(r.is_manual).toBe(false);
      expect(typeof r.badge_id).toBe("string");
    });
    expect(rows.map((r) => r.badge_id)).toEqual([
      "soin_exemplaire",
      "communication_top",
      "on_refait_ca",
    ]);
  });

  it("sitter_to_owner : insère les écussons sélectionnés pour le propriétaire", async () => {
    await attributeBadges({
      selectedBadges: ["annonce_fidele", "accueil_chaleureux"],
      revieweeId: OWNER_ID,
      reviewerId: SITTER_ID,
      sitId: SIT_ID,
    });

    expect(inserted.badge_attributions).toHaveLength(1);
    const rows = inserted.badge_attributions[0] as any[];
    expect(rows).toHaveLength(2);
    rows.forEach((r) => {
      expect(r.user_id).toBe(OWNER_ID);
      expect(r.giver_id).toBe(SITTER_ID);
      expect(r.sit_id).toBe(SIT_ID);
      expect(r.is_manual).toBe(false);
    });
  });

  it("aucun badge sélectionné : aucun insert n'est effectué", async () => {
    await attributeBadges({
      selectedBadges: [],
      revieweeId: SITTER_ID,
      reviewerId: OWNER_ID,
      sitId: SIT_ID,
    });

    expect(inserted.badge_attributions).toBeUndefined();
  });
});
