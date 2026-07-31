import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileProgressStrip from "../ProfileProgressStrip";

const renderStrip = (props: React.ComponentProps<typeof ProfileProgressStrip>) =>
  render(
    <MemoryRouter>
      <ProfileProgressStrip {...props} />
    </MemoryRouter>,
  );

const next = { id: "identite", label: "Identité", missingCount: 2 };

describe("ProfileProgressStrip", () => {
  it("nomme les items manquants avec leurs points", () => {
    renderStrip({
      completion: 55,
      nextIncomplete: next,
      totalRemaining: 2,
      missingScoreItems: [
        { key: "gallery", label: "Une photo de galerie", points: 5 },
        { key: "radius", label: "Rayon de mobilité", points: 15 },
      ],
    });
    expect(screen.getByText("Une photo de galerie")).toBeInTheDocument();
    expect(screen.getByText("+15")).toBeInTheDocument();
  });

  it("affiche l'état actif rassurant à partir de 80%", () => {
    renderStrip({
      completion: 90,
      nextIncomplete: next,
      totalRemaining: 2,
      missingScoreItems: [{ key: "identity", label: "Vérification d'identité", points: 5 }],
    });
    expect(screen.getByText(/Votre profil est actif/)).toBeInTheDocument();
    expect(screen.getByTestId("profile-active-note").textContent).toMatch(/candidater dès maintenant/);
  });

  it("ne promet rien de plus quand le profil est sous le seuil", () => {
    renderStrip({ completion: 55, nextIncomplete: next, totalRemaining: 3 });
    expect(screen.queryByTestId("profile-active-note")).toBeNull();
    expect(screen.getByText(/3 items à compléter/)).toBeInTheDocument();
  });
});
