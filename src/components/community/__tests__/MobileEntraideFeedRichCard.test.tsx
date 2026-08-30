import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MobileEntraideFeed, { type FeedMission } from "../MobileEntraideFeed";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const missions: FeedMission[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "arroser-mes-tomates",
    title: "Arroser mes tomates",
    description: "2 semaines en août",
    exchange_offer: "Servez-vous dans le potager",
    category: "garden",
    city: "Lyon",
    created_at: "2026-07-05T10:00:00Z",
    status: "in_progress",
    photos: null,
    mission_type: "besoin",
    profiles: { first_name: "Camille", avatar_url: null },
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "je-peux-garder-votre-chat",
    title: "Je peux garder votre chat",
    description: "Week-end du 12",
    exchange_offer: null,
    category: "animals",
    city: "Annecy",
    created_at: "2026-07-06T09:00:00Z",
    status: "open",
    photos: null,
    mission_type: "offre",
    profiles: { first_name: "Alex", avatar_url: null },
  },
];

const renderFeed = (props: Partial<React.ComponentProps<typeof MobileEntraideFeed>> = {}) =>
  render(
    <MemoryRouter>
      <MobileEntraideFeed missions={missions} questions={[]} onPublish={vi.fn()} {...props} />
    </MemoryRouter>,
  );

describe("carte mobile de l'entraide", () => {
  beforeEach(() => sessionStorage.clear());

  it("pointe vers le slug, jamais l'identifiant technique", () => {
    renderFeed();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/petites-missions/arroser-mes-tomates");
    expect(hrefs.some((h) => h?.includes("1111-1111"))).toBe(false);
  });

  it("affiche le badge Demande sur un couple lisible, pas crème sur crème", () => {
    const { container } = renderFeed();
    const badge = Array.from(container.querySelectorAll("span")).find(
      (s) => s.textContent === "Demande",
    );
    expect(badge?.className).toContain("bg-terra-soft");
    expect(badge?.className).toContain("text-terra");
    expect(container.innerHTML).not.toContain("bg-secondary/15 text-secondary-foreground");
  });

  it("affiche la contrepartie, le badge de catégorie et le statut", () => {
    renderFeed();
    expect(screen.getByText("En échange")).toBeInTheDocument();
    expect(screen.getByText("Servez-vous dans le potager")).toBeInTheDocument();
    expect(screen.getByText("Jardin")).toBeInTheDocument();
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("trie par proximité quand la position est connue", () => {
    const distances: Record<string, number> = {
      "11111111-1111-1111-1111-111111111111": 40,
      "22222222-2222-2222-2222-222222222222": 3,
    };
    renderFeed({ proximityActive: true, getDistance: (id: string) => distances[id] ?? null });
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/petites-missions/je-peux-garder-votre-chat");
    expect(screen.getByText("à 3 km")).toBeInTheDocument();
  });

  it("ne duplique plus le titre de la page", () => {
    renderFeed();
    expect(screen.queryByText("Fil de l'entraide")).not.toBeInTheDocument();
  });
});
