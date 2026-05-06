/**
 * Vérifie que LeaveReview attribue bien les écussons sélectionnés
 * dans `badge_attributions` :
 *   - Direction owner_to_sitter : le proprio note le gardien → rows visent le sitter.
 *   - Direction sitter_to_owner : le gardien note le proprio → rows visent l'owner.
 *
 * Mock Supabase :
 *   - sits/applications/public_profiles/reviews retournent juste ce qu'il faut
 *     pour passer la phase de chargement et l'insert d'avis.
 *   - On capture tous les inserts de la table `badge_attributions`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const OWNER_ID = "00000000-0000-0000-0000-00000000000a";
const SITTER_ID = "00000000-0000-0000-0000-00000000000b";
const SIT_ID = "00000000-0000-0000-0000-000000000010";

let currentUserId = OWNER_ID;
const inserts: Record<string, any[]> = {};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: currentUserId, email: "u@test.fr" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => {
  const tableHandlers: Record<string, () => { data: any; error: any }> = {
    sits: () => ({
      data: { id: SIT_ID, status: "completed", title: "Garde test", user_id: OWNER_ID },
      error: null,
    }),
    applications: () => ({ data: { sitter_id: SITTER_ID }, error: null }),
    public_profiles: () => ({
      data: {
        id: currentUserId === OWNER_ID ? SITTER_ID : OWNER_ID,
        first_name: "Elisa",
        avatar_url: null,
      },
      error: null,
    }),
    reviews: () => ({ data: null, error: null }),
    profiles: () => ({ data: { first_name: "Moi" }, error: null }),
    conversations: () => ({ data: null, error: null }),
    messages: () => ({ data: null, error: null }),
    badge_attributions: () => ({ data: null, error: null }),
  };

  const buildChain = (table: string): any => {
    const result = () => (tableHandlers[table] ? tableHandlers[table]() : { data: null, error: null });
    const chain: any = {
      select: () => chain,
      insert: (rows: any) => {
        if (!inserts[table]) inserts[table] = [];
        inserts[table].push(rows);
        return Promise.resolve({ data: null, error: null });
      },
      eq: () => chain,
      or: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      single: async () => result(),
      maybeSingle: async () => result(),
      then: (cb: any, errCb?: any) => Promise.resolve(result()).then(cb, errCb),
    };
    return chain;
  };

  return {
    supabase: {
      from: (table: string) => buildChain(table),
      rpc: () => Promise.resolve({ data: null, error: null }),
      functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    },
  };
});

import LeaveReview from "@/pages/LeaveReview";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/review/${SIT_ID}`]}>
        <Routes>
          <Route path="/review/:sitId" element={<LeaveReview />} />
          <Route path="/sits/:id" element={<div>OK</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );

const fillAndSubmit = async () => {
  await waitFor(() => screen.getByText(/Note globale/i));

  // Note globale : on clique sur la 5e étoile (par aria-label).
  const stars = screen.getAllByRole("button").filter((b) =>
    /étoile/i.test(b.getAttribute("aria-label") || "")
  );
  if (stars.length >= 5) fireEvent.click(stars[4]);
  else fireEvent.click(screen.getAllByRole("button")[0]);

  // Recommandation : Oui
  fireEvent.click(screen.getByRole("button", { name: /^Oui$/i }));

  // Sélection d'au moins un écusson (premier badge proposé)
  const allButtons = screen.getAllByRole("button");
  const badgeButtons = allButtons.filter((b) => b.getAttribute("aria-pressed") !== null);
  expect(badgeButtons.length).toBeGreaterThan(0);
  fireEvent.click(badgeButtons[0]);
  fireEvent.click(badgeButtons[1]);

  // Commentaire >= 50 chars
  const textarea = screen.getByPlaceholderText(/Expliquez|Décrivez/i);
  fireEvent.change(textarea, {
    target: { value: "Tout s'est merveilleusement bien passé du début à la fin, vraiment top." },
  });

  const submit = screen.getByRole("button", { name: /Envoyer mon avis/i });
  await act(async () => {
    fireEvent.click(submit);
  });
};

describe("LeaveReview — badge_attributions", () => {
  beforeEach(() => {
    Object.keys(inserts).forEach((k) => delete inserts[k]);
  });

  it("owner_to_sitter : insère les badges sélectionnés pour le gardien", async () => {
    currentUserId = OWNER_ID;
    renderPage();
    await fillAndSubmit();

    await waitFor(() => expect(inserts.badge_attributions?.length).toBeGreaterThan(0));
    const rows = inserts.badge_attributions[0] as any[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(2);
    rows.forEach((r) => {
      expect(r.user_id).toBe(SITTER_ID);
      expect(r.giver_id).toBe(OWNER_ID);
      expect(r.sit_id).toBe(SIT_ID);
      expect(typeof r.badge_id).toBe("string");
    });
  });

  it("sitter_to_owner : insère les badges sélectionnés pour le proprio", async () => {
    currentUserId = SITTER_ID;
    renderPage();
    await fillAndSubmit();

    await waitFor(() => expect(inserts.badge_attributions?.length).toBeGreaterThan(0));
    const rows = inserts.badge_attributions[0] as any[];
    expect(rows.length).toBe(2);
    rows.forEach((r) => {
      expect(r.user_id).toBe(OWNER_ID);
      expect(r.giver_id).toBe(SITTER_ID);
      expect(r.sit_id).toBe(SIT_ID);
    });
  });
});
