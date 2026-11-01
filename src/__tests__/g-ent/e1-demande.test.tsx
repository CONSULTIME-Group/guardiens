/** Lot E1-v2 (01/11/2026) : premier pas de la demande d'entraide. */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1", role: "both", firstName: "Marie" } }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/arrival/ArrivalUI", async (o) => ({ ...(await o<any>()), trackArrival: vi.fn() }));
vi.mock("@/lib/arrivalFirstStep", () => ({
  helpersCounter: () => Promise.resolve({ city: "Lyon", count: async (r: number) => (r >= 20 ? 38 : 0), initials: () => ["C", "K", "S"] }),
}));
const nav = vi.fn();
vi.mock("react-router-dom", async (o) => ({ ...(await o<any>()), useNavigate: () => nav }));
import Page from "@/pages/arrival/ArriveeEntraide";

describe("E1-v2", () => {
  it("phrase de légitimité, voisins proches en initiales, idée qui remplit la demande", async () => {
    render(<MemoryRouter><Page /></MemoryRouter>);
    expect(screen.getByText("Demander, c'est offrir à quelqu'un du coin l'occasion d'aider.")).toBeInTheDocument();
    const near = await screen.findByTestId("e1-nearby");
    expect(near.textContent).toContain("38 personnes donnent volontiers un coup de main à moins de 20 km de Lyon.");
    expect(near.textContent).toContain("CKS");
    fireEvent.click(screen.getByRole("button", { name: "Une partie de belote" }));
    fireEvent.click(screen.getByRole("button", { name: "Écrire ma demande" }));
    expect(nav).toHaveBeenCalledWith("/petites-missions/creer?titre=Une+partie+de+belote&description=Une+partie+de+belote");
    expect(screen.getByText(/Vous choisissez qui vous répond/)).toBeInTheDocument();
  });
});
