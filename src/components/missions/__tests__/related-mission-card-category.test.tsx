import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RelatedMissionCard from "../RelatedMissionCard";

/**
 * Lot E21 (25/10/2026) : la carte liée ne porte plus de pastille catégorie
 * (« AUTRE » retiré, avis 18) ; la catégorie choisit seulement la gouache de
 * la vignette. Une catégorie hors animaux n'affiche jamais une gouache animale.
 */
describe("RelatedMissionCard, catégorie", () => {
  it.each([
    ["house", "bricolage"],
    ["transport", "bienetre"],
    ["errand", "verger"],
    ["other", "bricolage"],
  ])("%s n'est jamais présenté comme Animaux", (category, spot) => {
    render(<MemoryRouter><RelatedMissionCard to="/x" category={category} title="Prêt de ponceuse" /></MemoryRouter>);
    expect(screen.queryByText("Animaux")).not.toBeInTheDocument();
    expect(screen.getByTestId("need-paper-thumb").getAttribute("data-spot")).toBe(spot);
  });
});
