import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { SIT_PROPOSAL_LIMITS } from "@/lib/sitProposal";
import { scheduledPublicationLabel, sentProposalStateLabel } from "@/components/sits/owner/SentProposalsBlock";

/**
 * Lot I3 : « en priorité, puis tous les gardiens », suivi des propositions
 * côté propriétaire, lien vers la proposition dans « Mes candidatures ».
 */
describe("Lot I3, priorité puis publication", () => {
  const sql = readFileSync("supabase/prepared-migrations/20261011170000_sit_proposal_priority.sql", "utf8");

  it("la durée affichée est le miroir de sit_proposal_limits()", () => {
    expect(sql).toContain(`'priority_hours', ${SIT_PROPOSAL_LIMITS.priorityHours}`);
    expect(sql).toContain(`'expiry_days', ${SIT_PROPOSAL_LIMITS.expiryDays}`);
  });

  it("la publication automatique est planifiée et réservée au serveur", () => {
    expect(sql).toContain("'publish-due-proposal-sits'");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.publish_due_proposal_sits() FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("DROP FUNCTION IF EXISTS public.create_sit_proposal(uuid, uuid, text);");
  });

  it("états lisibles des propositions envoyées", () => {
    const now = new Date("2026-10-11T10:00:00Z");
    expect(sentProposalStateLabel({ status: "sent", expires_at: "2026-10-14T10:00:00Z" }, now)).toBe("Envoyée, 3 jours pour répondre");
    expect(sentProposalStateLabel({ status: "viewed", expires_at: "2026-10-11T20:00:00Z" }, now)).toBe("Vue, dernier jour pour répondre");
    expect(sentProposalStateLabel({ status: "sent", expires_at: "2026-10-10T10:00:00Z" }, now)).toBe("Expirée sans réponse");
    expect(sentProposalStateLabel({ status: "applied", expires_at: null }, now)).toContain("A dit oui");
  });

  it("échéance affichée à l'heure de Paris", () => {
    expect(scheduledPublicationLabel("2026-10-13T12:37:00Z")).toBe(
      "Sans oui d'ici là, publication automatique le 13 octobre à 14 h 37.",
    );
    expect(scheduledPublicationLabel(null)).toBe("");
  });

  it("le choix de visibilité, le suivi propriétaire et le lien gardien sont branchés", () => {
    const dialog = readFileSync("src/components/sits/owner/ProposeSitDialog.tsx", "utf8");
    const view = readFileSync("src/components/sits/views/OwnerSitView.tsx", "utf8");
    const mine = readFileSync("src/pages/MesCandidatures.tsx", "utf8");
    expect(dialog).toContain("en priorité, puis tous les gardiens");
    expect(dialog).toContain("createSitProposal(sit.id, sitter.id, message, publishAfter)");
    expect(view).toContain("<SentProposalsBlock");
    expect(mine).toContain("to={`/propositions/${proposalId}`}");
  });

  it("aucun tiret de ponctuation dans les textes du lot", () => {
    for (const file of [
      "src/components/sits/owner/SentProposalsBlock.tsx",
      "src/components/sits/owner/ProposeSitDialog.tsx",
      "supabase/prepared-migrations/20261011170000_sit_proposal_priority.sql",
    ]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/[—–]/);
    }
  });
});
