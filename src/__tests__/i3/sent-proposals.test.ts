import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { sentProposalStateLabel } from "@/components/sits/owner/SentProposalsBlock";

/**
 * Suite du lot I2 : suivi des propositions côté propriétaire et lien vers la
 * proposition dans « Mes candidatures ». Décision du 11/10/2026 : aucune
 * publication automatique, la garde reste privée tant que le propriétaire
 * ne la publie pas lui-même.
 */
describe("Propositions envoyées et Mes candidatures", () => {
  it("états lisibles des propositions envoyées", () => {
    const now = new Date("2026-10-11T10:00:00Z");
    expect(sentProposalStateLabel({ status: "sent", expires_at: "2026-10-14T10:00:00Z" }, now)).toBe("Envoyée, 3 jours pour répondre");
    expect(sentProposalStateLabel({ status: "viewed", expires_at: "2026-10-11T20:00:00Z" }, now)).toBe("Vue, dernier jour pour répondre");
    expect(sentProposalStateLabel({ status: "sent", expires_at: "2026-10-10T10:00:00Z" }, now)).toBe("Expirée sans réponse");
    expect(sentProposalStateLabel({ status: "applied", expires_at: null }, now)).toContain("A dit oui");
  });

  it("le suivi propriétaire et le lien gardien sont branchés", () => {
    const view = readFileSync("src/components/sits/views/OwnerSitView.tsx", "utf8");
    const mine = readFileSync("src/pages/MesCandidatures.tsx", "utf8");
    expect(view).toContain("<SentProposalsBlock");
    expect(mine).toContain("to={`/propositions/${proposalId}`}");
  });

  it("aucune publication automatique d'une garde proposée", () => {
    const dialog = readFileSync("src/components/sits/owner/ProposeSitDialog.tsx", "utf8");
    const lib = readFileSync("src/lib/sitProposal.ts", "utf8");
    expect(dialog).not.toMatch(/publishAfter|en priorité, puis/);
    expect(lib).not.toMatch(/p_publish_after|priorityHours/);
  });
});
