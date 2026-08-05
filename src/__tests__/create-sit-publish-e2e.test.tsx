/**
 * Garde-fou de publication : une annonce complète, publiée depuis la modale
 * d'aperçu, doit réellement écrire en base avec le statut published.
 *
 * Ce test existe parce que la publication a pu échouer en silence, sans aucune
 * requête d'écriture ni message visible.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const updateCalls: any[] = [];
const insertCalls: any[] = [];

const property = {
  id: "prop-1",
  type: "house",
  environment: "campagne",
  equipments: [],
  photos: ["https://example.com/house.jpg"],
  description: "Maison",
  rooms_count: 4,
  bedrooms_count: 2,
};

const pets = [
  { id: "p1", name: "Rex", species: "dog", property_id: "prop-1" },
  { id: "p2", name: "Mia", species: "cat", property_id: "prop-1" },
];

const draft = {
  id: "draft-1",
  title: "Garde de maison pour 1 chien et 1 chat à Lyon en octobre",
  start_date: "2099-10-10",
  end_date: "2099-10-20",
  flexible_dates: false,
  specific_expectations: "a".repeat(160) + "\n\n" + "b".repeat(78),
  absence_reason: "a".repeat(160),
  sitter_expectations: "b".repeat(78),
  cover_photo_url: "https://example.com/house.jpg",
  open_to: [],
  environments: [],
  is_urgent: false,
  min_gardien_sits: 0,
  max_applications: 10,
  owner_message: "",
  daily_routine: "",
  city: "Lyon",
  country: "FR",
  status: "draft",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const makeBuilder = (table: string) => {
  const state: any = { table, filters: {} };
  const builder: any = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    eq: (col: string, val: unknown) => {
      state.filters[col] = val;
      return builder;
    },
    update: (payload: any) => {
      state.payload = payload;
      state.op = "update";
      return builder;
    },
    insert: (payload: any) => {
      state.payload = payload;
      state.op = "insert";
      return builder;
    },
    single: () => builder.then.call(builder, (r: any) => r),
    maybeSingle: () => builder,
    then: (resolve: any) => Promise.resolve(resolveResult()).then(resolve),
  };
  const resolveResult = () => {
    if (state.op === "update") {
      updateCalls.push({ table, payload: state.payload, filters: state.filters });
      return { data: null, error: null };
    }
    if (state.op === "insert") {
      insertCalls.push({ table, payload: state.payload });
      return { data: { id: "sit-new" }, error: null };
    }
    if (table === "properties") return { data: property, error: null };
    if (table === "pets") return { data: pets, error: null };
    if (table === "owner_profiles") return { data: {}, error: null };
    if (table === "profiles") return { data: { profile_completion: 95, city: "Lyon", bio: "bio" }, error: null };
    if (table === "owner_gallery") return { data: [{ photo_url: "https://example.com/house.jpg", category: "place" }], error: null };
    if (table === "sits") return { data: draft, error: null };
    return { data: null, error: null };
  };
  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeBuilder(table),
    functions: { invoke: vi.fn().mockResolvedValue({ data: { status: "ok", reasons: [] }, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
  },
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", role: "owner", profileCompletion: 95, identityVerified: true },
    isAuthenticated: true,
    loading: false,
    activeRole: "owner",
  }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
  trackFirstAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/pickSmartCover", () => ({ pickSmartCover: vi.fn().mockResolvedValue(null) }));

vi.mock("@/components/ai/alma/AlmaBubble", () => ({ AlmaBubble: () => null }));
vi.mock("@/components/ai/ImproveListingButton", () => ({ default: () => null }));
vi.mock("@/components/pets/PetsEditor", () => ({ default: () => null }));

import CreateSit from "@/pages/CreateSit";

describe("publication d'une annonce complète", () => {
  beforeEach(() => {
    updateCalls.length = 0;
    insertCalls.length = 0;
    navigateMock.mockClear();
    window.localStorage.clear();
  });

  it("écrit status published depuis la modale d'aperçu", async () => {
    render(
      <MemoryRouter initialEntries={["/sits/create?resume=draft-1"]}>
        <CreateSit />
      </MemoryRouter>,
    );

    await new Promise((r) => setTimeout(r, 1500));
    // eslint-disable-next-line no-console
    console.log(Array.from(document.querySelectorAll("button")).map((b) => b.textContent).join(" | "));
    fireEvent.click(screen.getByRole("button", { name: /^Suivant$/ }));
    await new Promise((r) => setTimeout(r, 300));
    console.log("APRES SUIVANT:", Array.from(document.querySelectorAll("button")).map((b) => b.textContent).join(" | "));
    const publishEntry = await screen.findByRole("button", { name: /Aperçu/i }, { timeout: 5000 });
    fireEvent.click(publishEntry);

    const confirm = await screen.findByRole("button", { name: /Publier maintenant/i });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      const writes = [...updateCalls, ...insertCalls].filter((c) => c.table === "sits" && c.payload?.status === "published");
      expect(writes.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });
});
