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
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
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
        need("proche", "Arroser les tomates", 45.76, 4.86),
      ],
      public_helpers: Array.from({ length: 20 }, (_, index) => ({
        id: index === 0 ? "me" : `h${index}`,
        first_name: index === 0 ? "moi" : index === 1 ? "gaston" : `Membre${index}`,
        avatar_url: null,
        city: index === 1 ? "LYON" : "Lyon",
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
    expect(await screen.findByRole("heading", { name: "Entraide et coups de main près de chez vous" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Autour de Lyon, 19 personnes sont prêtes à donner un coup de main\./)).toBeInTheDocument());
    expect(screen.getByText(/Lieu : Lyon/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Changer de lieu" })).toBeInTheDocument();
    expect(screen.getByText("Entraide · autour de Lyon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Situer" })).toBeNull();
  });

  it("affiche la liste par défaut à 1440 px et à 360 px", async () => {
    renderHub();
    await waitFor(() => expect(screen.getByText("Arroser les tomates")).toBeInTheDocument());
    expect(screen.queryByTestId("entraide-map")).toBeNull();
    cleanup();
    setViewport(360);
    renderHub();
    await waitFor(() => expect(screen.getByText("Arroser les tomates")).toBeInTheDocument());
    expect(screen.queryByTestId("entraide-map")).toBeNull();
  });

  it("peu de besoins proches : les besoins ailleurs s'affichent d'emblée, après les proches (lot E11)", async () => {
    renderHub();
    await waitFor(() => expect(screen.getByText("Arroser les tomates")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Ailleurs en France, 1 besoin ouvert" })).toBeInTheDocument();
    expect(screen.getByText("Repeindre un portail")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Plus loin :/ })).toBeNull();
    const titles = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(titles.indexOf("Arroser les tomates")).toBeLessThan(titles.indexOf("Repeindre un portail"));
  });

  it("trois besoins proches ou plus : les besoins lointains restent repliés derrière un bouton", async () => {
    rows.public_small_missions = [
      need("loin", "Repeindre un portail", 46.2, 5.2),
      need("proche", "Arroser les tomates", 45.76, 4.86),
      need("proche2", "Porter des cartons", 45.761, 4.861),
      need("proche3", "Tondre la pelouse", 45.762, 4.862),
    ];
    renderHub();
    await waitFor(() => expect(screen.getByText("Arroser les tomates")).toBeInTheDocument());
    expect(screen.getByText("Repeindre un portail")).not.toBeVisible();
    const toggle = screen.getByRole("button", { name: /Plus loin : 1 besoin ouvert ailleurs en France/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Repeindre un portail")).toBeVisible();
  });

  it("une tuile d'idée ouvre le formulaire avec le titre écrit", async () => {
    renderHub();
    expect(await screen.findByRole("heading", { name: "Une idée pour commencer" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Arroser le potager|Faire les courses|Monter un meuble|Promener le chien|Un trajet|Une partie de jeux de société/ }).length).toBe(6);
  });

  it("un seul bouton plein dans l'en-tête", async () => {
    renderHub();
    expect(await screen.findByRole("button", { name: "Demander un coup de main" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Proposer mon aide" })).toBeNull();
  });

  it("branche le bouton « Je peux » sur la fonction de réponse partagée", async () => {
    renderHub();
    // Lot E11 : le besoin lointain s'affiche aussi (un seul besoin proche) ; le proche vient en tête.
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Je peux" }).filter((button) => button.closest("[hidden]") === null).length).toBe(2));
    fireEvent.click(screen.getAllByRole("button", { name: "Je peux" })[0]);
    expect(respondMock).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: /^Envoyer/ }));
    await waitFor(() => expect(respondMock).toHaveBeenCalledWith({
      missionId: "proche",
      userId: "me",
      message: "Je peux vous aider.",
      exchangeDate: null,
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
    expect(await screen.findByText("Le fil est calme autour de Lyon aujourd'hui")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Écrire ma demande" })).toBeInTheDocument();
  });

  it("charge la section des personnes en trois requêtes au plus", async () => {
    renderHub();
    await waitFor(() => expect(screen.getByText("Gaston")).toBeInTheDocument());
    await waitFor(() => expect(calls.filter((table) => table === "public_help_counts").length).toBe(1));
    const helperCalls = calls.filter((table) => ["public_helpers", "public_help_counts", "profile_mission_badges"].includes(table));
    expect(helperCalls.length).toBeLessThanOrEqual(3);
    expect(screen.queryByText("Moi")).toBeNull();
    expect(screen.getByText("Lyon, tout près de chez vous")).toBeInTheDocument();
    expect(screen.getAllByTestId("helper-name").filter((node) => node.textContent === "Gaston" || node.textContent?.startsWith("Membre")).length).toBe(4);
    expect(screen.getByRole("heading", { name: "19 personnes prêtes à aider à moins de 30 km de Lyon" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voir les 19 personnes" }));
    expect(screen.getAllByTestId("helper-name").filter((node) => node.textContent === "Gaston" || node.textContent?.startsWith("Membre")).length).toBe(19);
  });

  it("charge la page d'un membre en huit requêtes au plus", async () => {
    renderHub();
    await waitFor(() => expect(screen.getByText("Gaston")).toBeInTheDocument());
    await waitFor(() => expect(calls).toContain("public_help_counts"));
    expect(calls.length).toBeLessThanOrEqual(8);
  });

  it("publie un JSON-LD sans fiche Person et une description sans mot proscrit", async () => {
    renderHub();
    const meta = await screen.findByTestId("page-meta");
    expect(meta.textContent).toContain("FAQPage");
    expect(meta.textContent).not.toContain("Person");
    expect(meta.getAttribute("data-description")).toBe("Jardinage, courses, trajets, une partie de belote : demandez ou proposez un coup de main près de chez vous. Guardiens est gratuit.");
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
