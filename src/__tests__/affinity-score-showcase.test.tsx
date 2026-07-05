import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/hooks/useImpressionOnce", () => ({ useImpressionOnce: () => false }));

import AffinityScoreShowcase from "@/components/landing/AffinityScoreShowcase";

describe("AffinityScoreShowcase", () => {
  it("affiche les 7 critères du breakdown", () => {
    render(
      <MemoryRouter>
        <AffinityScoreShowcase />
      </MemoryRouter>,
    );
    expect(screen.getByText("Mode de vie")).toBeInTheDocument();
    expect(screen.getByText("Animaux acceptés")).toBeInTheDocument();
    expect(screen.getByText("Expérience")).toBeInTheDocument();
    expect(screen.getByText("Disponibilité")).toBeInTheDocument();
    expect(screen.getByText("Communication")).toBeInTheDocument();
    expect(screen.getByText("Préférences maison")).toBeInTheDocument();
    expect(screen.getByText("Préférences proximité")).toBeInTheDocument();
  });

  it("affiche le badge score 87 % · 6/7", () => {
    render(
      <MemoryRouter>
        <AffinityScoreShowcase />
      </MemoryRouter>,
    );
    expect(screen.getByText(/87/)).toBeInTheDocument();
    expect(screen.getByText(/6\/7/)).toBeInTheDocument();
  });
});
