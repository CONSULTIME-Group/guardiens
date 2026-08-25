import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AffinityBadge from "../AffinityBadge";
import type { AffinityResult } from "@/lib/affinityScore";

const makeResult = (over: Partial<AffinityResult>): AffinityResult => ({
  score: 0,
  total: 0,
  matched: [],
  matchedDetailed: [],
  explanation: [],
  notes: [],
  displayed: true,
  hiddenReason: null,
  scoreReliable: true,
  hasDeclaredIncompatibility: false,
  distributable: true,
  confidence: 1,
  sortScore: 0,
  ...over,
});

describe("AffinityBadge", () => {
  it("ne rend rien quand result est null", () => {
    const { container } = render(<AffinityBadge result={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("affiche le pourcentage et le tone success ≥80", () => {
    render(<AffinityBadge result={makeResult({ score: 87, matched: ["Langue commune"], total: 5 })} />);
    const el = screen.getByText(/87% d'affinité/);
    expect(el).toBeInTheDocument();
    expect(el.className).toMatch(/text-success/);
  });

  it("utilise le tone neutre entre 40 et 60 (pas de signal warning)", () => {
    render(<AffinityBadge result={makeResult({ score: 45, matched: [], total: 4 })} />);
    const el = screen.getByText(/45% d'affinité/);
    expect(el.className).toMatch(/text-muted-foreground/);
  });
});
