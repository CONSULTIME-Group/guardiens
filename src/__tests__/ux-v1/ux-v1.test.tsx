import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { descriptionLengthMessage, MISSION_DESC_MIN, MISSION_DESC_MAX } from "@/components/missions/EditMissionDescriptionDialog";
import { missionHref } from "@/components/sits/OwnerMissionsBlock";
import { ReadStatus } from "@/components/messages/MessageBubble";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(), auth: { getUser: vi.fn() } } }));

describe("UX-V1 · description d'une demande", () => {
  it("valide la longueur avec un message positif", () => {
    expect(descriptionLengthMessage("x".repeat(MISSION_DESC_MIN))).toBeNull();
    expect(descriptionLengthMessage("x".repeat(MISSION_DESC_MAX))).toBeNull();
    const short = descriptionLengthMessage("court")!;
    expect(short).toContain(String(MISSION_DESC_MIN - 5));
    expect(descriptionLengthMessage("x".repeat(MISSION_DESC_MAX + 1))).toContain("plus court");
    expect(`${short}`).not.toMatch(/[—–]|\b(pas|ne |aucun|jamais|sans)\b/i);
  });
});

describe("UX-V1 · mes demandes d'entraide", () => {
  it("lien vers la fiche : slug quand il existe, sinon identifiant", () => {
    expect(missionHref({ id: "abc", slug: "jardin-lyon" })).toBe("/petites-missions/jardin-lyon");
    expect(missionHref({ id: "abc", slug: null })).toBe("/petites-missions/abc");
  });
});

describe("UX-V1 · état de lecture", () => {
  it("écrit Lu ou Envoyé en toutes lettres", () => {
    const { rerender } = render(<ReadStatus readAt={null} />);
    expect(screen.getByTestId("read-status").textContent).toBe("Envoyé");
    rerender(<ReadStatus readAt="2026-10-31T09:00:00Z" />);
    expect(screen.getByTestId("read-status").textContent).toBe("Lu");
  });
});
