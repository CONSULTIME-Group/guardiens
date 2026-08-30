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
        { key: "gallery", label: "Galerie de 3 photos ou plus", points: 10 },
        { key: "bio", label: "Bio d'au moins 50 caractères", points: 15 },
      ],
    });
    expect(screen.getByText("Galerie de 3 photos ou plus")).toBeInTheDocument();
    expect(screen.getByText("+15")).toBeInTheDocument();
  });

  it("ne suggère jamais que la vérification est facultative", () => {
    renderStrip({
      completion: 90,
      nextIncomplete: next,
      totalRemaining: 2,
      missingScoreItems: [{ key: "identity", label: "Vérification d'identité", points: 5 }],
    });
    expect(screen.getByText("Vérification d'identité")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/facultat/i);
    expect(document.body.textContent).not.toMatch(/dès maintenant/i);
  });
});
