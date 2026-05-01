import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OngoingSitHero from "../OngoingSitHero";
import StatsStrip from "../StatsStrip";
import MissionsTabsCard from "../MissionsTabsCard";
import MonAnnonceCard from "../MonAnnonceCard";
import type { SitRow, SitterInfo, Pet, SmallMission } from "../types";

/**
 * Tests visuels (snapshots DOM) — 4 composants clés du dashboard propriétaire.
 * Couverture min : 1 état par composant × 2 viewports (mobile 390px / desktop 1280px).
 *
 * Objectif : geler le rendu pour détecter toute régression visuelle non intentionnelle
 * (suppression de bloc, changement de classe, perte de CTA, etc.).
 *
 * Convention : la date courante est figée au 2026-04-11 pour stabiliser les calculs J-X
 * de OngoingSitHero / MonAnnonceCard.
 */

// ─── Fixtures ──────────────────────────────────────────────────────────
const FIXED_NOW = new Date("2026-04-11T10:00:00Z");

const sitterInfo: SitterInfo = {
  id: "sitter-1",
  first_name: "claire",
  avatar_url: null,
  identity_verified: true,
  completed_sits_count: 12,
  avgNote: 4.8,
};

const ongoingSit: SitRow = {
  id: "sit-1",
  title: "Garde de Luna",
  status: "in_progress",
  start_date: "2026-04-08",
  end_date: "2026-04-14",
  created_at: "2026-04-01",
  property_id: "prop-1",
  user_id: "owner-1",
  cancelled_by: null,
  applications: [
    { id: "app-1", status: "accepted", sitter_id: "sitter-1" },
  ],
};

const publishedSit: SitRow = {
  ...ongoingSit,
  id: "sit-2",
  status: "published",
  start_date: "2026-05-10",
  end_date: "2026-05-20",
  applications: [],
};

const pets: Pet[] = [
  {
    id: "pet-1",
    name: "Luna",
    species: "dog",
    breed: "Berger",
    age: 4,
    photo_url: null,
    property_id: "prop-1",
  },
];

const myMissions: SmallMission[] = [
  {
    id: "mission-1",
    title: "Promener mon chien",
    category: "walk",
    status: "open",
    city: "Lyon",
    created_at: "2026-04-09",
    small_mission_responses: [{ id: "r1", status: "pending" }],
  },
];

const nearbyMissions: SmallMission[] = [
  {
    id: "mission-2",
    title: "Aide pour transport vétérinaire",
    category: "transport",
    status: "open",
    city: "Villeurbanne",
    created_at: "2026-04-10",
  },
];

// ─── Helpers viewport ──────────────────────────────────────────────────
const setViewport = (width: number) => {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 800 });
  window.dispatchEvent(new Event("resize"));
};

const renderInRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

// ─── Tests ─────────────────────────────────────────────────────────────
describe("Owner Dashboard — visual snapshots", () => {
  describe("OngoingSitHero", () => {
    it("matches snapshot on mobile (390px)", () => {
      setViewport(390);
      const { container } = renderInRouter(
        <OngoingSitHero sit={ongoingSit} sitterProfiles={{ "sitter-1": sitterInfo }} />
      );
      act(() => void 0);
      expect(container.firstChild).toMatchSnapshot();
    });

    it("matches snapshot on desktop (1280px)", () => {
      setViewport(1280);
      const { container } = renderInRouter(
        <OngoingSitHero sit={ongoingSit} sitterProfiles={{ "sitter-1": sitterInfo }} />
      );
      act(() => void 0);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe("StatsStrip", () => {
    const items = [
      { value: 3, label: "Annonces", to: "/annonces" },
      { value: 12, label: "Candidatures", to: "/candidatures", highlight: true },
      { value: 4.8, label: "Note moyenne" },
      { value: null, label: "À venir", fallback: "—" },
    ];

    it("matches snapshot on mobile (390px)", () => {
      setViewport(390);
      const { container } = renderInRouter(<StatsStrip items={items} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it("matches snapshot on desktop (1280px)", () => {
      setViewport(1280);
      const { container } = renderInRouter(<StatsStrip items={items} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe("MissionsTabsCard", () => {
    it("matches snapshot on mobile (390px)", () => {
      setViewport(390);
      const { container } = renderInRouter(
        <MissionsTabsCard myMissions={myMissions} nearbyMissions={nearbyMissions} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it("matches snapshot on desktop (1280px)", () => {
      setViewport(1280);
      const { container } = renderInRouter(
        <MissionsTabsCard myMissions={myMissions} nearbyMissions={nearbyMissions} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe("MonAnnonceCard", () => {
    it("matches snapshot on mobile (390px)", () => {
      setViewport(390);
      const { container } = renderInRouter(
        <MonAnnonceCard
          sits={[publishedSit]}
          pets={pets}
          propertyType="house"
          propertyEnvironment="city"
          pendingAppCount={2}
          coverPhoto={null}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it("matches snapshot on desktop (1280px)", () => {
      setViewport(1280);
      const { container } = renderInRouter(
        <MonAnnonceCard
          sits={[publishedSit]}
          pets={pets}
          propertyType="house"
          propertyEnvironment="city"
          pendingAppCount={2}
          coverPhoto={null}
        />
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
