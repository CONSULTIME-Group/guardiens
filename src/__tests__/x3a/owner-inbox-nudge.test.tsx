/**
 * Lot X3a (13/10/2026), constat A-07 : un compte double rôle en espace
 * gardien voit les candidatures reçues sur ses annonces, avec un lien vers
 * l'annonce concernée dans l'espace propriétaire.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";

const h = vi.hoisted(() => ({
  role: "both" as string,
  counts: { unreadCount: 0, ownerInboxCount: 3, sitterActionCount: 0, missionBadgeCount: 0, ownerInboxSitId: "sit-9" as string | null },
  switchRole: vi.fn(),
  calledWith: [] as Array<string | undefined>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", role: h.role }, switchRole: h.switchRole }),
}));
vi.mock("@/hooks/useNavBadgeCounts", () => ({
  useNavBadgeCounts: (id: string | undefined) => {
    h.calledWith.push(id);
    return h.counts;
  },
}));

import OwnerInboxNudge, { ownerInboxNudgeLink, ownerInboxNudgeText } from "@/components/dashboard/sitter/OwnerInboxNudge";

const mount = () =>
  render(
    <MemoryRouter>
      <OwnerInboxNudge />
    </MemoryRouter>,
  );

describe("X3a, A-07 : repère des candidatures reçues en espace gardien", () => {
  beforeEach(() => {
    h.role = "both";
    h.counts = { unreadCount: 0, ownerInboxCount: 3, sitterActionCount: 0, missionBadgeCount: 0, ownerInboxSitId: "sit-9" };
    h.switchRole.mockClear();
    h.calledWith.length = 0;
  });
  afterEach(() => cleanup());

  it("double rôle avec candidatures : texte, lien vers l'annonce, bascule propriétaire", () => {
    mount();
    expect(screen.getByTestId("owner-inbox-nudge").textContent).toContain("3 candidatures attendent votre réponse sur vos annonces.");
    const link = screen.getByRole("link", { name: "Voir dans l'espace propriétaire" });
    expect(link.getAttribute("href")).toBe("/sits/sit-9#candidatures");
    fireEvent.click(link);
    expect(h.switchRole).toHaveBeenCalledWith("owner");
  });

  it("aucune candidature en attente : rien", () => {
    h.counts = { ...h.counts, ownerInboxCount: 0 };
    mount();
    expect(screen.queryByTestId("owner-inbox-nudge")).toBeNull();
  });

  it("compte gardien seul : rien, et aucun compteur demandé", () => {
    h.role = "sitter";
    mount();
    expect(screen.queryByTestId("owner-inbox-nudge")).toBeNull();
    expect(h.calledWith.every((id) => id === undefined)).toBe(true);
  });

  it("textes et liens", () => {
    expect(ownerInboxNudgeText(1)).toBe("Une candidature attend votre réponse sur votre annonce.");
    expect(ownerInboxNudgeLink(null)).toBe("/sits");
    expect(`${ownerInboxNudgeText(1)} ${ownerInboxNudgeText(4)}`).not.toMatch(/[\u2013\u2014]/);
  });

  it("monté sur le tableau de bord gardien, sans lecture propre (cache de la navigation)", () => {
    const dash = readFileSync("src/components/dashboard/SitterDashboard.tsx", "utf8");
    expect(dash).toContain("<OwnerInboxNudge />");
    const nudge = readFileSync("src/components/dashboard/sitter/OwnerInboxNudge.tsx", "utf8");
    expect(nudge).not.toMatch(/supabase/);
    expect(nudge).toContain("useNavBadgeCounts(isBoth ? user?.id : undefined)");
  });
});
