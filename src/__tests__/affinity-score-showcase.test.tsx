import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/hooks/useImpressionOnce", () => ({ useImpressionOnce: () => false }));

import AffinityScoreShowcase from "@/components/landing/AffinityScoreShowcase";

describe("AffinityScoreShowcase", () => {
  it("affiche les 7 critères réels de computeAffinityResultFull", () => {
    render(
      <MemoryRouter>
        <AffinityScoreShowcase />
      </MemoryRouter>,
    );
    expect(screen.getByText("Animaux")).toBeInTheDocument();
    expect(screen.getByText("Présence pendant la garde")).toBeInTheDocument();
    expect(screen.getByText("Rythme de vie")).toBeInTheDocument();
    expect(screen.getByText("Langues")).toBeInTheDocument();
    expect(screen.getByText("Intérêts")).toBeInTheDocument();
    expect(screen.getByText("Profil idéal")).toBeInTheDocument();
    expect(screen.getByText("Ambiance du foyer")).toBeInTheDocument();
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
