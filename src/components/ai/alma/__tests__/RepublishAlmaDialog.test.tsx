import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RepublishAlmaDialog } from "../RepublishAlmaDialog";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

describe("RepublishAlmaDialog", () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("mode copy : navigue vers /sits/create?from=X&mode=copy sans prompt", () => {
    render(
      <MemoryRouter>
        <RepublishAlmaDialog open onOpenChange={() => {}} sitId="sit-123" sourceTitle="Août à Lyon" />
      </MemoryRouter>,
    );
    // Le titre doit rappeler la source (vouvoiement owner).
    expect(screen.getByText(/Je repars de « Août à Lyon »/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /continuer/i }));
    expect(navigateMock).toHaveBeenCalledTimes(1);
    const arg = navigateMock.mock.calls[0][0] as string;
    expect(arg).toContain("from=sit-123");
    expect(arg).toContain("mode=copy");
    expect(arg).not.toContain("prompt=");
  });

  it("mode adapt : bouton désactivé tant que prompt < 10 caractères", () => {
    render(
      <MemoryRouter>
        <RepublishAlmaDialog open onOpenChange={() => {}} sitId="sit-123" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByLabelText(/Adapter avec Alma/i));
    const cta = screen.getByRole("button", { name: /Adapter avec Alma/i });
    expect(cta).toBeDisabled();

    const textarea = screen.getByLabelText(/Décrivez les changements/i);
    fireEvent.change(textarea, { target: { value: "Nouvelles dates été" } });
    expect(cta).not.toBeDisabled();

    fireEvent.click(cta);
    const arg = navigateMock.mock.calls[0][0] as string;
    expect(arg).toContain("mode=adapt");
    expect(arg).toContain("prompt=");
    expect(decodeURIComponent(arg)).toContain("Nouvelles dates été");
  });
});
