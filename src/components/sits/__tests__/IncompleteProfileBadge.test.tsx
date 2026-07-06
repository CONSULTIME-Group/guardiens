import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { IncompleteProfileBadge } from "../IncompleteProfileBadge";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

function renderBadge(props: React.ComponentProps<typeof IncompleteProfileBadge>) {
  return render(
    <MemoryRouter>
      <IncompleteProfileBadge {...props} />
    </MemoryRouter>,
  );
}

describe("IncompleteProfileBadge", () => {
  it("est masqué pour un viewer non-owner", () => {
    const { container } = renderBadge({ profileCompletion: 40, isOwnerViewer: false });
    expect(container.firstChild).toBeNull();
  });

  it("est masqué si complétion >= 80 pour l'owner", () => {
    const { container } = renderBadge({ profileCompletion: 85, isOwnerViewer: true });
    expect(container.firstChild).toBeNull();
  });

  it("s'affiche pour l'owner si complétion < 80", () => {
    renderBadge({ profileCompletion: 55, isOwnerViewer: true });
    expect(screen.getByTestId("incomplete-profile-badge")).toBeInTheDocument();
    expect(screen.getByText(/Profil à compléter/i)).toBeInTheDocument();
  });

  it("affiche le nombre de champs restants quand fourni", () => {
    renderBadge({ profileCompletion: 45, isOwnerViewer: true, fieldsRemaining: 3 });
    expect(screen.getByText(/3 champs restants/i)).toBeInTheDocument();
  });

  it("pointe vers /profile", () => {
    renderBadge({ profileCompletion: 55, isOwnerViewer: true });
    const link = screen.getByTestId("incomplete-profile-badge") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/profile");
  });
});
