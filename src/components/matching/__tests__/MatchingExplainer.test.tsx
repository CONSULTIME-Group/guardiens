import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchingExplainer from "../MatchingExplainer";

describe("MatchingExplainer", () => {
  it("rend la copy propriétaire en card", () => {
    render(<MatchingExplainer role="owner" />);
    expect(screen.getByText(/score d'affinité/i)).toBeInTheDocument();
    expect(screen.getByText(/profil idéal recherché/i)).toBeInTheDocument();
  });

  it("rend la copy gardien en inline", () => {
    render(<MatchingExplainer role="sitter" variant="inline" />);
    expect(screen.getByText(/compétences spéciales/i)).toBeInTheDocument();
  });

  it("vouvoie systématiquement, jamais de tutoiement", () => {
    const { container } = render(<MatchingExplainer role="owner" />);
    const txt = container.textContent || "";
    expect(/\btu\b|\bton\b|\btes\b|\bt'/i.test(txt)).toBe(false);
    expect(/vous|votre|vos/i.test(txt)).toBe(true);
  });
});
