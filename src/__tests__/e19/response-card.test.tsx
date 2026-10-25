/**
 * Lot E19 : la carte de réponse vue par le demandeur porte l'écusson
 * Identité vérifiée (VerifiedBadge) et l'ancienneté « Membre depuis ».
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";

vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  });
  return { supabase: { from: () => chain } };
});
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/missions/MissionBadgesReceived", () => ({ default: () => null }));

import MissionResponseCard from "@/components/missions/MissionResponseCard";
import { memberSinceLabel, responderTrust } from "@/lib/responderTrust";

afterEach(cleanup);

const response = (responder: Record<string, unknown>) => ({
  id: "r1",
  responder_id: "u1",
  message: "Je peux passer samedi matin.",
  status: "pending",
  created_at: "2026-10-20T09:00:00Z",
  helpful_count: 0,
  responder,
});

const renderCard = (responder: Record<string, unknown>) =>
  render(
    <MemoryRouter>
      <MissionResponseCard
        response={response(responder)}
        isAuthor
        currentUserId="owner"
        missionOwnerId="owner"
        processing={false}
        onSelect={vi.fn()}
        onDecline={vi.fn()}
        onOpenMessages={vi.fn()}
      />
    </MemoryRouter>,
  );

describe("carte de réponse", () => {
  it("montre l'écusson et l'ancienneté", () => {
    renderCard({ first_name: "Hugo", avatar_url: null, identity_verified: true, created_at: "2025-03-14T10:00:00Z" });
    expect(screen.getByTestId("response-verified").textContent).toContain("Identité vérifiée");
    expect(screen.getByTestId("response-member-since").textContent).toBe("Membre depuis mars 2025");
  });

  it("montre l'ancienneté seule pour une identité non vérifiée", () => {
    renderCard({ first_name: "Hugo", avatar_url: null, identity_verified: false, created_at: "2026-10-01T10:00:00Z" });
    expect(screen.queryByTestId("response-verified")).toBeNull();
    expect(screen.getByTestId("response-member-since").textContent).toBe("Membre depuis octobre 2026");
  });

  it("reste sobre sans donnée", () => {
    renderCard({ first_name: "Hugo", avatar_url: null });
    expect(screen.queryByTestId("response-trust")).toBeNull();
  });
});

describe("logique", () => {
  it("lit identité et date", () => {
    expect(responderTrust({ identity_verified: true, created_at: "2026-05-13T00:00:00Z" }))
      .toEqual({ verified: true, memberSince: "Membre depuis mai 2026" });
    expect(memberSinceLabel("pas une date")).toBeNull();
  });

  it("les deux listes de réponses lisent identity_verified et created_at dans public_profiles", () => {
    for (const file of ["src/pages/SmallMissionDetail.tsx", "src/components/missions/ProjetOwnerResponses.tsx"]) {
      expect(readFileSync(file, "utf8")).toContain('.select("id, first_name, avatar_url, identity_verified, created_at")');
    }
  });
});
