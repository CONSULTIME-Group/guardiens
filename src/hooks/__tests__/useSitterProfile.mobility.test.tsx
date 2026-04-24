/**
 * Garantit que les toggles "Permis" (has_license) et "Véhicule" (has_vehicle)
 * de l'étape Mobilité sont :
 *   1. correctement envoyés à la table `sitter_profiles` lors d'un saveStep,
 *   2. relus tels quels par le hook après un remount (= cas mobile : utilisateur
 *      ferme l'onglet / change de page puis revient — le hook re-fetch).
 *
 * Régression : sans ce contrat, la sidebar "Mobilité & Rayon" affiche
 * "1 point manquant" même après que l'utilisateur a coché les switches.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ---- Supabase client mock ----
// État simulé de `sitter_profiles` côté serveur. Persiste entre les remounts
// du hook pour vérifier la relecture.
const sitterRow: Record<string, any> = {
  id: "sp-1",
  user_id: "user-1",
  has_license: false,
  has_vehicle: false,
};

const profileRow: Record<string, any> = {
  id: "user-1",
  first_name: "Test",
  last_name: "User",
  city: "Paris",
  postal_code: "75001",
};

const sitterUpdates: any[] = []; // capture des payloads UPDATE

vi.mock("@/integrations/supabase/client", () => {
  const sitterTable = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: { ...sitterRow }, error: null }),
        single: async () => ({ data: { ...sitterRow }, error: null }),
      }),
    }),
    update: (payload: any) => {
      sitterUpdates.push(payload);
      Object.assign(sitterRow, payload);
      return { eq: async () => ({ error: null }) };
    },
    insert: () => ({ select: () => ({ single: async () => ({ data: { id: "sp-1" }, error: null }) }) }),
  });
  const profileTable = () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: { ...profileRow }, error: null }),
        maybeSingle: async () => ({ data: { ...profileRow }, error: null }),
      }),
    }),
    update: () => ({ eq: async () => ({ error: null }) }),
  });
  return {
    supabase: {
      from: (table: string) => (table === "sitter_profiles" ? sitterTable() : profileTable()),
      rpc: async () => ({ data: 60, error: null }),
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "t@t.fr" },
    refreshProfile: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { useSitterProfile } from "@/hooks/useSitterProfile";

describe("useSitterProfile — Permis & Véhicule (Mobilité)", () => {
  beforeEach(() => {
    sitterUpdates.length = 0;
    sitterRow.has_license = false;
    sitterRow.has_vehicle = false;
  });

  it("envoie has_license et has_vehicle à sitter_profiles lors du save", async () => {
    const { result } = renderHook(() => useSitterProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.has_license).toBe(false);
    expect(result.current.data.has_vehicle).toBe(false);

    // L'utilisateur active les deux switches puis clique "Suivant".
    await act(async () => {
      const ok = await result.current.saveStep({ has_license: true, has_vehicle: true });
      expect(ok).toBe(true);
    });

    // Au moins un UPDATE doit contenir les deux champs avec les bonnes valeurs.
    const update = sitterUpdates.find(u => "has_license" in u || "has_vehicle" in u);
    expect(update, "aucun UPDATE n'a inclus has_license/has_vehicle").toBeDefined();
    expect(update.has_license).toBe(true);
    expect(update.has_vehicle).toBe(true);
  });

  it("relit has_license et has_vehicle après remount (cas mobile retour onglet)", async () => {
    // Premier mount : l'utilisateur sauve
    const first = renderHook(() => useSitterProfile());
    await waitFor(() => expect(first.result.current.loading).toBe(false));

    await act(async () => {
      await first.result.current.saveStep({ has_license: true, has_vehicle: true });
    });
    first.unmount();

    // Mobile : nouvel onglet ou rechargement → le hook se remount et refetch.
    const second = renderHook(() => useSitterProfile());
    await waitFor(() => expect(second.result.current.loading).toBe(false));

    expect(second.result.current.data.has_license).toBe(true);
    expect(second.result.current.data.has_vehicle).toBe(true);
  });

  it("la sidebar ne signale plus 'Permis ou véhicule' manquant après coche", async () => {
    const { result } = renderHook(() => useSitterProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Avant : champ manquant détecté
    let missing = result.current.computeMissingFields(result.current.data);
    expect(missing.some(m => m.label === "Permis ou véhicule")).toBe(true);

    // Après save de has_license seul → contrainte levée (license OU vehicle suffit)
    await act(async () => {
      await result.current.saveStep({ has_license: true });
    });
    missing = result.current.computeMissingFields(result.current.data);
    expect(missing.some(m => m.label === "Permis ou véhicule")).toBe(false);
  });
});
