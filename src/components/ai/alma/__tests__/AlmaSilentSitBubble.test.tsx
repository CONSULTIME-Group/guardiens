import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AlmaSilentSitBubble from "../AlmaSilentSitBubble";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

const wrap = (children: React.ReactNode) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("AlmaSilentSitBubble", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stays hidden when no eligible sit", () => {
    render(wrap(<AlmaSilentSitBubble sits={[]} />));
    expect(screen.queryByText(/aucune candidature/i)).not.toBeInTheDocument();
  });

  it("shows for a published sit older than 3 days with 0 applications", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 5);
    render(
      wrap(
        <AlmaSilentSitBubble
          sits={[
            {
              id: "sit-1",
              status: "published",
              created_at: oldDate.toISOString(),
              applications: [],
              title: "Garde chien",
            },
          ]}
        />,
      ),
    );
    expect(screen.getByText(/aucune candidature/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /améliorer la description/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ajouter des photos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /partager l'annonce/i })).toBeInTheDocument();
  });

  it("hides again when dismissed and persists the choice", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 4);
    const sits = [
      {
        id: "sit-2",
        status: "published",
        created_at: oldDate.toISOString(),
        applications: [],
      },
    ];
    const { unmount } = render(wrap(<AlmaSilentSitBubble sits={sits} />));
    await userEvent.click(screen.getByRole("button", { name: /masquer alma/i }));
    await waitFor(() =>
      expect(screen.queryByText(/aucune candidature/i)).not.toBeInTheDocument(),
    );
    expect(localStorage.getItem("alma_silent_sit_dismissed_sit-2")).toBe("1");
    unmount();

    render(wrap(<AlmaSilentSitBubble sits={sits} />));
    expect(screen.queryByText(/aucune candidature/i)).not.toBeInTheDocument();
  });

  it("does not show for sits with existing applications", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);
    render(
      wrap(
        <AlmaSilentSitBubble
          sits={[
            {
              id: "sit-3",
              status: "published",
              created_at: oldDate.toISOString(),
              applications: [{ id: "a1" }],
            },
          ]}
        />,
      ),
    );
    expect(screen.queryByText(/aucune candidature/i)).not.toBeInTheDocument();
  });
});
