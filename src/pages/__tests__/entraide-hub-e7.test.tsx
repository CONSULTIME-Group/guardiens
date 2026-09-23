import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type TableRows = Record<string, unknown[]>;
let rows: TableRows = {};
let calls: string[] = [];
let authenticated = true;


const queryFor = (table: string) => {
  calls.push(table);
  const list = () => rows[table] || [];
  const query: Record<string, unknown> = {};
  const chain = () => query;
  Object.assign(query, {
    select: chain,
    eq: chain,
    in: chain,
    order: chain,
    update: chain,
    maybeSingle: () => Promise.resolve({ data: list()[0] ?? null, error: null }),
    single: () => Promise.resolve({ data: list()[0] ?? null, error: null }),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: list(), error: null })),
  });
  return query;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => queryFor(table) },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: authenticated, user: authenticated ? { id: "me" } : null }),
}));
vi.mock("@/hooks/useAccessLevel", () => ({ useAccessLevel: () => ({ canApplyMissions: true }) }));
vi.mock("@/components/seo/PageBreadcrumb", () => ({ default: () => null }));
vi.mock("@/components/PageMeta", () => ({
  default: ({ description, jsonLd }: { description: string; jsonLd: object[] }) => (
    <div data-testid="page-meta" data-description={description}>{JSON.stringify(jsonLd)}</div>
  ),
}));
vi.mock("@/components/entraide/EntraideMap", () => ({
  default: () => <div data-testid="entraide-map" />,
}));
vi.mock("@/components/entraide/EntraideProofs", () => ({ default: () => null }));
const { respondMock } = vi.hoisted(() => ({
  respondMock: vi.fn(async () => ({ kind: "sent", inserted: { id: "r1" } })),
}));
vi.mock("@/lib/missionRespond", async () => {
  const actual = await vi.importActual<typeof import("@/lib/missionRespond")>("@/lib/missionRespond");
  return { ...actual, respondToMission: respondMock };
});

import EntraideHub from "../EntraideHub";

const LYON: [number, number] = [45.75, 4.85];

const need = (id: string, title: string, lat: number, lng: number, extra: Record<string, unknown> = {}) => ({
  id,
  user_id: "other",
  slug: id,
  title,
  city: "Lyon",
  category: "garden",
  date_needed: null,
  end_date: null,
  latitude: lat,
  longitude: lng,
  photos: null,
  sit_mode: null,
  ...extra,
});

const setViewport = (width: number) => {
  window.matchMedia = ((query: string) => ({
    matches: width >= 768 && query.includes("min-width: 768px"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

const renderHub = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/petites-missions"]}><EntraideHub /></MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("Entraide, la page vue d'un membre", () => {
  beforeEach(() => {
    authenticated = true;
    calls = [];
    respondMock.mockClear();
    setViewport(1440);
    rows = {
      public_small_missions: [
        need("loin", "Repeindre un portail", 46.2, 5.2),
        need("proche", "Arroser le potager", 45.76, 4.86),
      ],
      public_helpers: Array.from({ length: 20 }, (_, index) => ({
        id: `h${index}`,
        first_name: `Membre${index}`,
        avatar_url: null,
        city: "Lyon",
        latitude_approx: 45.75 + index / 100,
        longitude_approx: 4.85,
        helps_with: "Arroser les plantes",
      })),
      public_mission_response_counts: [],
      profiles: [{ city: "Lyon", latitude: LYON[0], longitude: LYON[1], available_for_help: true }],
      small_mission_responses: [],
      public_help_counts: [],
      profile_mission_badges: [],
    };
  });
  afterEach(cleanup);

  it("prend l'origine dans le profil connecté, sans saisie de ville", async () => {
    renderHub();
    expect(await screen.findByRole("heading", { name: "Besoins près de chez vous" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Autour de Lyon\. Le plus proche est à 1 km\./)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Changer de lieu" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Situer" })).toBeNull();
  });

  it("affiche la liste par défaut à 1440 px et à 360 px", async () => {
    renderHub();
    await waitFor(() => expect(screen.getByText("Arroser le potager")).toBeInTheDocument());
    expect(screen.queryByTestId("entraide-map")).toBeNull();
    cleanup();
    setViewport(360);
    renderHub();
    await waitFor(() => expect(screen.getByText("Arroser le potager")).toBeInTheDocument());
    expect(screen.queryByTestId("entraide-map")).toBeNull();
  });

  it("trie les besoins par distance croissante", async () => {
    renderHub();
    await waitFor(() => expect(screen.getByText("Repeindre un portail")).toBeInTheDocument());
    const titles = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(titles.slice(0, 2)).toEqual(["Arroser le potager", "Repeindre un portail"]);
  });

  it("branche le bouton « Je peux » sur la fonction de réponse partagée", async () => {
    renderHub();
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Je peux" }).length).toBe(2));
    fireEvent.click(screen.getAllByRole("button", { name: "Je peux" })[0]);
    await waitFor(() => expect(respondMock).toHaveBeenCalledWith({
      missionId: "proche",
      userId: "me",
      message: "Je peux vous aider.",
    }));
    expect(await screen.findByText("Vous avez dit je peux")).toBeInTheDocument();
  });

  it("marque le besoin publié par le membre et la réponse déjà donnée", async () => {
    rows.public_small_missions = [
      need("mien", "Déplacer une armoire", 45.76, 4.86, { user_id: "me" }),
      need("repondu", "Nourrir un chat", 45.77, 4.86),
    ];
    rows.small_mission_responses = [{ mission_id: "repondu" }];
    renderHub();
    expect(await screen.findByText("Votre besoin")).toBeInTheDocument();
    expect(await screen.findByText("Vous avez dit je peux")).toBeInTheDocument();
  });

  it("propose de publier quand le premier besoin dépasse trente kilomètres", async () => {
    rows.public_small_missions = [need("loin", "Repeindre un portail", 46.4, 5.4)];
    renderHub();
    expect(await screen.findByText("Le premier besoin de votre secteur peut être le vôtre.")).toBeInTheDocument();
  });

  it("charge la section des personnes en trois requêtes au plus", async () => {
    renderHub();
    await waitFor(() => expect(screen.getByText("Membre0")).toBeInTheDocument());
    await waitFor(() => expect(calls.filter((table) => table === "public_help_counts").length).toBe(1));
    const helperCalls = calls.filter((table) => ["public_helpers", "public_help_counts", "profile_mission_badges"].includes(table));
    expect(helperCalls.length).toBeLessThanOrEqual(3);
    expect(screen.getAllByRole("heading", { level: 3 }).filter((node) => node.textContent?.startsWith("Membre")).length).toBe(12);
    expect(screen.getByRole("button", { name: "Voir 12 de plus" })).toBeInTheDocument();
  });

  it("publie un JSON-LD sans fiche Person et une description sans mot proscrit", async () => {
    renderHub();
    const meta = await screen.findByTestId("page-meta");
    expect(meta.textContent).toContain("FAQPage");
    expect(meta.textContent).not.toContain("Person");
    expect(meta.getAttribute("data-description")).toBe("Trouvez un coup de main près de chez vous, ou proposez le vôtre aux membres du coin.");
    expect(meta.getAttribute("data-description")).not.toMatch(/voisin/i);
  });

  it("porte une légende de carte et les couleurs par famille", async () => {
    const source = await import("@/components/entraide/EntraideMap?raw");
    expect(source.default).toContain("Besoins");
    expect(source.default).toContain("Personnes disponibles");
    expect(source.default).toContain('fillColor: "hsl(var(--secondary))"');
    expect(source.default).toContain('fillColor: "hsl(var(--primary))"');
  });

  it("garde des textes conformes dans les fichiers du lot", async () => {
    const sources = await Promise.all([
      import("../EntraideHub?raw"),
      import("@/components/entraide/EntraideCards?raw"),
      import("@/components/entraide/EntraideMap?raw"),
      import("@/lib/entraideHubModel?raw"),
      import("@/lib/missionRespond?raw"),
    ]);
    for (const source of sources) {
      expect(source.default).not.toMatch(/[\u2014\u2013]/);
      expect(source.default).not.toMatch(/\bvoisin(e|s|age)?\b/i);
    }
  });
});
