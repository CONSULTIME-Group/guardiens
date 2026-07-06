/**
 * Test RPC get_alma_cultural_fact — vérifie contexte + cooldown 24h.
 *
 * Test d'intégration léger via un mock du client Supabase :
 *  - buildRpcMock permet de simuler un retour cohérent avec le contexte fourni.
 *  - Vérifie le comportement du hook useAlmaCulturalFact (queue quand data).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";

let rpcMock = vi.fn();
const queueWhisperMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (name: string, args: any) => rpcMock(name, args),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    activeRole: "owner",
  }),
}));

vi.mock("@/contexts/AlmaContext", () => ({
  useAlma: () => ({
    queueWhisper: queueWhisperMock,
    frequency: "balanced",
    dismissCurrent: vi.fn(),
    canEmit: () => true,
    currentWhisper: null,
  }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

import { useAlmaCulturalFact } from "@/hooks/useAlmaCulturalFact";

describe("useAlmaCulturalFact", () => {
  beforeEach(() => {
    sessionStorage.clear();
    rpcMock = vi.fn();
    queueWhisperMock.mockReset();
  });

  it("queue un whisper cultural_fact quand la RPC renvoie un fait", async () => {
    rpcMock.mockResolvedValue({
      data: {
        id: "fact-1",
        type: "breed_did_you_know",
        content: "Le Chartreux ronronne entre 25 et 140 Hz.",
        source_url: null,
      },
      error: null,
    });

    renderHook(
      () =>
        useAlmaCulturalFact({
          surface: "sitter_profile",
          context: { animal_species: "cat" },
        }),
      { wrapper },
    );

    await waitFor(() => expect(queueWhisperMock).toHaveBeenCalledTimes(1));
    const whisper = queueWhisperMock.mock.calls[0][0];
    expect(whisper.type).toBe("cultural_fact");
    expect(whisper.audience).toBe("owner");
    expect(whisper.surface).toBe("sitter_profile");
    expect(whisper.message).toContain("Chartreux");
    expect(whisper.metadata?.fact_id).toBe("fact-1");

    // La RPC a bien reçu le contexte
    expect(rpcMock).toHaveBeenCalledWith(
      "get_alma_cultural_fact",
      expect.objectContaining({
        p_user_id: "user-1",
        p_surface: "sitter_profile",
        p_context: expect.objectContaining({ animal_species: "cat" }),
      }),
    );
  });

  it("ne queue rien quand la RPC renvoie null (cooldown 24h côté serveur)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    renderHook(() => useAlmaCulturalFact({ surface: "dashboard" }), { wrapper });

    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    expect(queueWhisperMock).not.toHaveBeenCalled();
  });

  it("évite le double-fetch pour la même surface via sessionStorage", async () => {
    rpcMock.mockResolvedValue({
      data: {
        id: "fact-2",
        type: "social_stat",
        content: "Plus de 2 200 gardiens vérifiés.",
        source_url: null,
      },
      error: null,
    });

    const { unmount } = renderHook(
      () => useAlmaCulturalFact({ surface: "dashboard" }),
      { wrapper },
    );
    await waitFor(() => expect(queueWhisperMock).toHaveBeenCalledTimes(1));
    unmount();

    // Second mount même surface → session flag doit bloquer
    renderHook(() => useAlmaCulturalFact({ surface: "dashboard" }), { wrapper });
    await new Promise((r) => setTimeout(r, 30));
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(queueWhisperMock).toHaveBeenCalledTimes(1);
  });
});
