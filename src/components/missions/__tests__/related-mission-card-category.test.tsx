import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RelatedMissionCard from "../RelatedMissionCard";

describe("RelatedMissionCard, libellé de catégorie", () => {
  it.each([
    ["house", "Maison et bricolage"],
    ["transport", "Transport et accompagnement"],
    ["errand", "Courses et livraisons"],
    ["other", "Autre"],
  ])("%s n'est jamais présenté comme Animaux", (category, label) => {
    render(<MemoryRouter><RelatedMissionCard to="/x" category={category} title="Prêt de ponceuse" /></MemoryRouter>);
    expect(screen.queryByText("Animaux")).not.toBeInTheDocument();
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });
});
