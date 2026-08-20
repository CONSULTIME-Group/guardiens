/**
 * RailReadingsCard — bloc (d) « À lire » du rail des deux dashboards.
 * Verrous : null sans lien, jamais plus de 3 liens, titre + contexte rendus.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RailReadingsCard from "@/components/dashboard/shared/RailReadingsCard";
import type { RailReadingItem } from "@/hooks/useRailReadings";

const item = (title: string): RailReadingItem => ({
  key: title,
  title,
  context: "Le journal Guardiens",
  href: `/actualites/${title}`,
});

describe("RailReadingsCard", () => {
  it("retourne null sans lien", () => {
    const { container } = render(
      <MemoryRouter>
        <RailReadingsCard items={[]} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("affiche au plus trois liens, avec titre et contexte", () => {
    render(
      <MemoryRouter>
        <RailReadingsCard items={[item("un"), item("deux"), item("trois"), item("quatre")]} />
      </MemoryRouter>,
    );
    expect(screen.getByText("À lire")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByText("un")).toBeTruthy();
    expect(screen.queryByText("quatre")).toBeNull();
  });
});
