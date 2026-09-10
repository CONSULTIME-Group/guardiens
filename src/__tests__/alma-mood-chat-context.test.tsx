/**
 * C1 : l'humeur tirée reste disponible pour la conversation même quand le
 * panneau doit se taire. `mood` et `line` pilotent l'affichage, `chatMood`
 * et `chatLine` pilotent ce qui part au modèle.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, activeRole: "owner" }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ in: () => ({ limit: async () => ({ data: [] }) }) }),
      }),
    }),
    functions: { invoke: async () => ({ data: null }) },
    rpc: async () => ({ data: null, error: null }),
  },
}));

import { useAlmaMood } from "@/hooks/useAlmaMood";

const ROW = {
  id: "mood-1",
  mood: "petillante",
  content: "Le soleil donne sur la fenêtre, je suis déjà debout.",
};

describe("useAlmaMood, humeur transmise à la conversation", () => {
  beforeEach(() => {
    sessionStorage.setItem("alma_mood_session", JSON.stringify(ROW));
  });

  it("garde chatMood renseigné avec une conversation ouverte", () => {
    const { result } = renderHook(() =>
      useAlmaMood({ silent: false, conversationOpen: true }),
    );
    expect(result.current.mood).toBeNull();
    expect(result.current.line).toBeNull();
    expect(result.current.chatMood).toBe("petillante");
    expect(result.current.chatLine).toBe(ROW.content);
  });

  it("expose l'humeur à l'affichage quand la conversation est fermée", () => {
    const { result } = renderHook(() =>
      useAlmaMood({ silent: false, conversationOpen: false }),
    );
    expect(result.current.chatMood).toBe("petillante");
  });
});
