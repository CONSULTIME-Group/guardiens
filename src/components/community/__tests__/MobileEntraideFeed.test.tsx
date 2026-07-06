import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MobileEntraideFeed, {
  type FeedMission,
  type FeedQuestion,
} from "../MobileEntraideFeed";

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: any[]) => trackEventMock(...args),
}));

const missions: FeedMission[] = [
  {
    id: "m1",
    title: "Arroser mes tomates",
    description: "2 semaines en août",
    category: "garden",
    city: "Lyon",
    created_at: "2026-07-05T10:00:00Z",
    mission_type: "besoin",
    profiles: { first_name: "Camille", avatar_url: null },
  },
  {
    id: "m2",
    title: "Je peux garder votre chat",
    description: "Week-end du 12",
    category: "animals",
    city: "Annecy",
    created_at: "2026-07-06T09:00:00Z",
    mission_type: "offre",
    profiles: { first_name: "Alex", avatar_url: null },
  },
];

const questions: FeedQuestion[] = [
  {
    id: "q1",
    title: "Mon chat ne mange plus, dois-je m'inquiéter ?",
    body: "Depuis 2 jours",
    category: "animaux",
    created_at: "2026-07-07T08:00:00Z",
    author_name: "Léa",
    answers_count: 3,
  },
];

const renderFeed = () =>
  render(
    <MemoryRouter>
      <MobileEntraideFeed
        missions={missions}
        questions={questions}
        onAsk={vi.fn()}
        onNeed={vi.fn()}
        onOffer={vi.fn()}
      />
    </MemoryRouter>,
  );

describe("MobileEntraideFeed", () => {
  beforeEach(() => {
    sessionStorage.clear();
    trackEventMock.mockReset();
  });

  it("agrège questions, besoins et offres triés par date DESC", () => {
    renderFeed();
    const items = screen.getAllByRole("link");
    // q1 (07/07) > m2 (06/07) > m1 (05/07)
    expect(items[0]).toHaveAttribute("href", "/questions/q1");
    expect(items[1]).toHaveAttribute("href", "/petites-missions/m2");
    expect(items[2]).toHaveAttribute("href", "/petites-missions/m1");
  });

  it("émet entraide_feed_default_view une seule fois par session", () => {
    renderFeed();
    expect(trackEventMock).toHaveBeenCalledWith(
      "entraide_feed_default_view",
      expect.objectContaining({ metadata: expect.any(Object) }),
    );
    trackEventMock.mockClear();
    renderFeed();
    // Déjà tracké : plus de nouvel event default_view
    expect(
      trackEventMock.mock.calls.filter((c) => c[0] === "entraide_feed_default_view"),
    ).toHaveLength(0);
  });

  it("toggle chip émet entraide_feed_chip_toggled et filtre", () => {
    renderFeed();
    trackEventMock.mockClear();
    const chipOffres = screen.getByRole("button", { name: /Offres/i });
    fireEvent.click(chipOffres);
    expect(trackEventMock).toHaveBeenCalledWith(
      "entraide_feed_chip_toggled",
      expect.objectContaining({ metadata: expect.objectContaining({ filter_types: expect.any(Array) }) }),
    );
    // L'offre m2 ne doit plus apparaître
    expect(screen.queryByText("Je peux garder votre chat")).not.toBeInTheDocument();
  });

  it("respecte le vouvoiement", () => {
    renderFeed();
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/\btu\b/i);
    expect(html).not.toMatch(/\bton\b/i);
    expect(html).not.toMatch(/—/); // pas de tiret cadratin
  });
});
