import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

import SitterOpeningCard from "@/components/dashboard/sitter/SitterOpeningCard";

// Verrou FIX2 du 21/11/2026 : la carte « Votre profil s'ouvre » appelle ses
// hooks avant tout retour anticipé, et ne plante plus quand la dernière étape
// passe à faite pendant la visite.
describe("FIX2, carte d'ouverture gardien", () => {
  it("passe d'une étape restante à aucune sans erreur de hooks", () => {
    const { rerender, container } = render(
      <MemoryRouter>
        <SitterOpeningCard hasAvatar hasBioMin={false} hasPostalCode />
      </MemoryRouter>,
    );
    expect(container.querySelector("[data-dashboard-star='sitter']")).not.toBeNull();
    expect(() =>
      rerender(
        <MemoryRouter>
          <SitterOpeningCard hasAvatar hasBioMin hasPostalCode />
        </MemoryRouter>,
      ),
    ).not.toThrow();
    expect(container.querySelector("[data-dashboard-star='sitter']")).toBeNull();
  });

  it("les hooks sont appelés avant le retour anticipé", () => {
    const src = readFileSync("src/components/dashboard/sitter/SitterOpeningCard.tsx", "utf8");
    const early = src.indexOf("if (doneCount === steps.length) return null;");
    expect(early).toBeGreaterThan(-1);
    expect(src.indexOf("useRef<HTMLElement | null>(null)")).toBeLessThan(early);
    expect(src.indexOf("useImpressionOnce(sectionRef")).toBeLessThan(early);
  });

  it("l'échec d'envoi de galerie porte son motif", () => {
    const src = readFileSync("src/components/profile/SitterGallery.tsx", "utf8");
    const block = src.slice(src.indexOf('"sitter_gallery_upload_failed"'));
    expect(block.slice(0, 600)).toContain("reason:");
  });
});
