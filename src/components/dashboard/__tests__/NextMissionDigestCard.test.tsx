import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NextMissionDigestCard from "../NextMissionDigestCard";

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: any[]) => trackEventMock(...args),
}));

let mockFrequency: "silent" | "balanced" | "talkative" = "balanced";
vi.mock("@/hooks/useAlmaFrequency", () => ({
  useAlmaFrequency: () => ({ frequency: mockFrequency, loading: false, setFrequency: vi.fn() }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

let prefValue: boolean | undefined = true;
vi.mock("@/integrations/supabase/client", () => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: { new_mission_digest: prefValue } }),
  };
  return {
    supabase: {
      from: () => chain,
    },
  };
});

const renderCard = () =>
  render(
    <MemoryRouter>
      <NextMissionDigestCard />
    </MemoryRouter>,
  );

describe("NextMissionDigestCard", () => {
  beforeEach(() => {
    trackEventMock.mockReset();
    mockFrequency = "balanced";
    prefValue = true;
  });

  it("affiche la carte et émet next_mission_digest_card_seen si opt-in", async () => {
    renderCard();
    await waitFor(() => expect(screen.getByText(/Prochain fil d'entraide/)).toBeInTheDocument());
    expect(trackEventMock).toHaveBeenCalledWith("next_mission_digest_card_seen", {});
  });

  it("masque la carte si alma_frequency = silent", async () => {
    mockFrequency = "silent";
    renderCard();
    await waitFor(() => {
      expect(screen.queryByText(/Prochain fil d'entraide/)).not.toBeInTheDocument();
    });
    expect(trackEventMock).not.toHaveBeenCalledWith("next_mission_digest_card_seen", expect.anything());
  });

  it("masque la carte si new_mission_digest = false", async () => {
    prefValue = false;
    renderCard();
    await waitFor(() => {
      expect(screen.queryByText(/Prochain fil d'entraide/)).not.toBeInTheDocument();
    });
  });
});
