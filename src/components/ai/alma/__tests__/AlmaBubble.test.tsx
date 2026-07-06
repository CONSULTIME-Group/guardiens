import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AlmaBubble } from "../AlmaBubble";

describe("AlmaBubble", () => {
  it("rend le contenu enfant et la signature Alma", () => {
    render(
      <AlmaBubble audience="owner">
        <p>Voulez-vous que je prépare un message ?</p>
      </AlmaBubble>,
    );
    expect(screen.getByText("Alma")).toBeInTheDocument();
    expect(screen.getByText(/prépare un message/i)).toBeInTheDocument();
  });

  it("applique bien le data-audience owner", () => {
    const { container } = render(
      <AlmaBubble audience="owner">Contenu owner</AlmaBubble>,
    );
    expect(container.querySelector('[data-audience="owner"]')).toBeTruthy();
  });

  it("applique bien le data-audience sitter", () => {
    const { container } = render(
      <AlmaBubble audience="sitter">Contenu sitter</AlmaBubble>,
    );
    expect(container.querySelector('[data-audience="sitter"]')).toBeTruthy();
  });

  it("supporte les 4 variantes via data-variant", () => {
    const variants = ["default", "dashboard", "inline", "sticky-footer"] as const;
    variants.forEach((v) => {
      const { container, unmount } = render(
        <AlmaBubble audience="owner" variant={v}>
          Contenu
        </AlmaBubble>,
      );
      expect(container.querySelector(`[data-variant="${v}"]`)).toBeTruthy();
      unmount();
    });
  });

  it("affiche l'état loading avec le message 'Alma prépare…'", () => {
    render(
      <AlmaBubble audience="owner" loading>
        Contenu ignoré
      </AlmaBubble>,
    );
    expect(screen.getByText(/Alma prépare/i)).toBeInTheDocument();
  });

  it("rend les actions et déclenche onDismiss au clic sur la croix", () => {
    const onDismiss = vi.fn();
    render(
      <AlmaBubble
        audience="sitter"
        onDismiss={onDismiss}
        actions={<button>Oui, préparer</button>}
      >
        Contenu
      </AlmaBubble>,
    );
    expect(screen.getByRole("button", { name: /oui, préparer/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /masquer alma/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
