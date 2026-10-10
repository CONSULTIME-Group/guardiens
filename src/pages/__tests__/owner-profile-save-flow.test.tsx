/**
 * L6/L7 : aller-retour d'enregistrement de la vraie page OwnerProfile, doubles
 * de test pour le hook de données et le client (aucun compte, aucune écriture).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";

const store = { bio: "Bio initiale" };
const saveStep = vi.fn();

vi.mock("@/hooks/useOwnerProfile", () => ({
  sanitizeOwnerDraft: (v: any) => v,
  useOwnerProfile: () => {
    const [data, setData] = useState<any>({ first_name: "Test", city: "", postal_code: "", bio: store.bio, environments: [], equipments: [] });
    return {
      data, pets: [], loading: false, saving: false, completion: 50, lastSyncedAt: null, loadError: null,
      reload: vi.fn(), uploadPhoto: vi.fn(), addPet: vi.fn(), updatePet: vi.fn(), removePet: vi.fn(),
      saveStep: async (patch: any) => {
        const ok = await saveStep(patch);
        if (ok) { Object.assign(store, patch); setData((d: any) => ({ ...d, ...patch })); }
        return ok;
      },
    };
  },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "fixture-owner", identityVerified: false } }) }));
vi.mock("@/integrations/supabase/client", () => {
  const chain: any = new Proxy(() => chain, {
    get: (_t, k) => (k === "then" ? (r: any) => r({ data: [], error: null, count: 0 }) : chain),
    apply: () => chain,
  });
  return { supabase: { from: () => chain, auth: { getUser: async () => ({ data: { user: null } }) }, rpc: () => chain } };
});
vi.mock("@/components/owner-profile/OwnerStepIdentity", () => ({
  default: ({ data, onChange }: any) => (
    <textarea aria-label="bio" value={data.bio} onChange={(e) => onChange({ bio: e.target.value })} />
  ),
}));
vi.mock("@/components/profile/ProfileSidebar", () => ({ default: () => null }));
vi.mock("@/components/profile/ProfileProgressStrip", () => ({ default: () => null }));
vi.mock("@/components/matching/OwnerAffinityBanner", () => ({ default: () => null }));

import OwnerProfile from "../OwnerProfile";

const renderPage = () => render(<MemoryRouter><OwnerProfile /></MemoryRouter>);
const saveButton = () => screen.getAllByRole("button").find((b) => /save|Sauvegarder|Enregistr/i.test(b.textContent || ""))!;

describe("OwnerProfile, enregistrement (fixture isolée)", () => {
  beforeEach(() => { store.bio = "Bio initiale"; saveStep.mockReset(); localStorage.clear(); });

  it("refus : saisie et brouillon conservés, erreur visible, puis réessai réussi et relecture", async () => {
    saveStep.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { unmount } = renderPage();
    fireEvent.change(screen.getByLabelText("bio"), { target: { value: "Nouvelle bio" } });

    fireEvent.click(saveButton());
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect((screen.getByLabelText("bio") as HTMLTextAreaElement).value).toBe("Nouvelle bio");
    expect(localStorage.getItem("guardiens_owner_profile_draft_fixture-owner")).toContain("Nouvelle bio");
    expect(store.bio).toBe("Bio initiale");

    fireEvent.click(saveButton());
    await waitFor(() => expect(saveStep).toHaveBeenCalledTimes(2));
    expect(saveStep).toHaveBeenLastCalledWith({ bio: "Nouvelle bio" });
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(localStorage.getItem("guardiens_owner_profile_draft_fixture-owner")).toBeNull();

    unmount();
    renderPage();
    expect((screen.getByLabelText("bio") as HTMLTextAreaElement).value).toBe("Nouvelle bio");
  });
});
