import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AffinityBadge from "../AffinityBadge";

describe("AffinityBadge", () => {
  it("ne rend rien quand result est null", () => {
    const { container } = render(<AffinityBadge result={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("affiche le pourcentage et le tone success ≥80", () => {
    render(<AffinityBadge result={{ score: 87, matched: ["Langue commune"], total: 5 }} />);
    const el = screen.getByText(/87% d'affinité/);
    expect(el).toBeInTheDocument();
    expect(el.className).toMatch(/text-success/);
  });

  it("utilise le tone warning entre 40 et 60", () => {
    render(<AffinityBadge result={{ score: 45, matched: [], total: 4 }} />);
    const el = screen.getByText(/45% d'affinité/);
    expect(el.className).toMatch(/text-warning/);
  });
});
