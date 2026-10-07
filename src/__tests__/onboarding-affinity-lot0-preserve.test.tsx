/**
 * Lot 0 A : l'écran d'affinité ne perd ni n'écrase aucune réponse.
 * - pré-remplissage depuis la base, valeurs conservées après soumission
 * - erreur d'écriture : écran ouvert, message, aucun événement de complétion
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { buildAffinityWrites } from "@/lib/affinityOnboardingWrites";

const trackEventMock = vi.fn();
const navigateMock = vi.fn();
const upserts: Array<{ table: string; row: Record<string, unknown> }> = [];
let upsertError: unknown = null;

const sitterRow = {
  user_id: "u1",
  animal_types: [],
  work_during_sit: "on_site",
  sitter_type: "Solo",
  life_pace: "Calme",
  interests: ["Lecture"],
  languages: ["Français", "Anglais"],
};

vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => trackEventMock(...a) }));
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", role: "sitter" }, refreshProfile: vi.fn(), logout: vi.fn() }),
}));
vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => ({ enabled: true, loading: false }) }));
vi.mock("@/hooks/useAffinityOnboardingStatus", () => ({
  useAffinityOnboardingStatus: () => ({
    loading: false, needsOnboarding: true, needsSitter: true, needsOwner: false, needsPostal: false,
    profileCreatedAt: new Date().toISOString(), refresh: vi.fn(),
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({
            data: table === "sitter_profiles" ? sitterRow : table === "profiles" ? { id: "u1", postal_code: "69001" } : null,
            error: null,
          }),
        }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      upsert: (row: Record<string, unknown>) => {
        upserts.push({ table, row });
        return Promise.resolve({ error: upsertError });
      },
    }),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import OnboardingAffinity from "@/pages/OnboardingAffinity";

beforeEach(() => {
  upserts.length = 0;
  upsertError = null;
  trackEventMock.mockClear();
  navigateMock.mockClear();
});

async function fillMissingAndSubmit() {
  render(<OnboardingAffinity />);
  // Attendre le pré-remplissage (Anglais coché depuis la base).
  await waitFor(() => expect(screen.getByRole("button", { name: "Anglais" })).toHaveAttribute("aria-pressed", "true"));
  fireEvent.click(screen.getByRole("button", { name: "Chiens" }));
  const submit = screen.getByRole("button", { name: "Accéder à mon espace" });
  await waitFor(() => expect(submit).not.toBeDisabled());
  fireEvent.click(submit);
}

describe("Lot 0 A, écran d'affinité", () => {
  it("garde interests et languages existants après soumission pour un seul champ manquant", async () => {
    await fillMissingAndSubmit();
    await waitFor(() => expect(upserts.length).toBe(1));
    const row = upserts[0].row;
    expect(upserts[0].table).toBe("sitter_profiles");
    expect(row.interests).toEqual(["Lecture"]);
    expect(row.languages).toEqual(["Français", "Anglais"]);
    expect(row.animal_types).toEqual(["Chiens"]);
    await waitFor(() => expect(navigateMock).toHaveBeenCalled());
  });

  it("erreur d'écriture : message, aucun événement de complétion, aucune navigation", async () => {
    upsertError = { message: "boom" };
    await fillMissingAndSubmit();
    expect(await screen.findByText("L'enregistrement n'a pas abouti. Vos réponses sont gardées, réessayez.")).toBeInTheDocument();
    const names = trackEventMock.mock.calls.map(([n]) => n);
    expect(names).not.toContain("onboarding_completed");
    expect(names).not.toContain("affinity_onboarding_completed");
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Accéder à mon espace" })).not.toBeDisabled();
  });

  it("n'envoie jamais un tableau ou une chaîne vide", () => {
    const w = buildAffinityWrites({
      userId: "u1", currentRole: "sitter", chosenRole: "sitter", needsPostal: false, postalCode: "", departementCode: null,
      showSitterBlock: true, showOwnerBlock: false, animalTypes: ["Chats"], workDuringSit: "", sitterType: "",
      presenceExpected: "", preferredSitterTypes: [], homeAmbiance: [], lifePace: "", interests: [], languages: [],
    });
    expect(w.profile).toBeNull();
    expect(w.owner).toBeNull();
    expect(w.sitter).toEqual({ user_id: "u1", animal_types: ["Chats"] });
  });
});
