/**
 * Garantit que le libellé du bouton destructif sur /sits reflète bien le status :
 *   - draft       → aucun bouton destructif
 *   - published   → « Dépublier l'annonce » (canUnpublish)
 *   - confirmed   → « Annuler la garde » (canCancel)
 *   - dates passées (canCancel=false ET canUnpublish=false) → aucun bouton destructif
 *
 * Le composant OwnerSitManagement est la source de vérité visuelle : la logique
 * métier (isPast, status) est calculée en amont dans OwnerSitView et passée via
 * les props canCancel / canUnpublish — tester ce composant suffit à figer le contrat.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OwnerSitManagement from "../OwnerSitManagement";

const renderWith = (props: Partial<React.ComponentProps<typeof OwnerSitManagement>> = {}) =>
  render(
    <MemoryRouter>
      <OwnerSitManagement
        sitId="sit-1"
        propertyId="prop-1"
        status="draft"
        canCancel={false}
        onCancelClick={() => {}}
        {...props}
      />
    </MemoryRouter>,
  );

describe("OwnerSitManagement — libellé contextuel du bouton destructif", () => {
  it("draft : ni « Dépublier » ni « Annuler la garde »", () => {
    renderWith({ status: "draft", canCancel: false, canUnpublish: false });
    expect(screen.queryByRole("button", { name: /dépublier l'annonce/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /annuler la garde/i })).toBeNull();
  });

  it("published + canUnpublish : « Dépublier l'annonce » uniquement", () => {
    renderWith({
      status: "published",
      canCancel: false,
      canUnpublish: true,
      onUnpublishClick: () => {},
    });
    expect(screen.getByRole("button", { name: /dépublier l'annonce/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /annuler la garde/i })).toBeNull();
  });

  it("confirmed + canCancel : « Annuler la garde » uniquement", () => {
    renderWith({ status: "confirmed", canCancel: true });
    expect(screen.getByRole("button", { name: /annuler la garde/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /dépublier l'annonce/i })).toBeNull();
  });

  it("dates passées (canCancel=false, canUnpublish=false) : aucun bouton destructif", () => {
    // Reflète la logique OwnerSitView : isPast → bloque les deux flags
    renderWith({ status: "confirmed", canCancel: false, canUnpublish: false });
    expect(screen.queryByRole("button", { name: /annuler la garde/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /dépublier l'annonce/i })).toBeNull();
  });

  it("published + canUnpublish manquant : pas de bouton (garde-fou)", () => {
    // Si onUnpublishClick n'est pas fourni, le bouton ne doit pas s'afficher
    renderWith({ status: "published", canUnpublish: true });
    expect(screen.queryByRole("button", { name: /dépublier l'annonce/i })).toBeNull();
  });

  it("click sur « Annuler la garde » déclenche onCancelClick", () => {
    const onCancelClick = vi.fn();
    renderWith({ status: "confirmed", canCancel: true, onCancelClick });
    fireEvent.click(screen.getByRole("button", { name: /annuler la garde/i }));
    expect(onCancelClick).toHaveBeenCalledTimes(1);
  });

  it("click sur « Dépublier l'annonce » déclenche onUnpublishClick", () => {
    const onUnpublishClick = vi.fn();
    renderWith({
      status: "published",
      canUnpublish: true,
      onUnpublishClick,
    });
    fireEvent.click(screen.getByRole("button", { name: /dépublier l'annonce/i }));
    expect(onUnpublishClick).toHaveBeenCalledTimes(1);
  });

  it("bouton « Partager » présent uniquement si status=published ET onShareClick fourni", () => {
    const { rerender } = renderWith({ status: "published", onShareClick: () => {} });
    expect(screen.getByRole("button", { name: /partager/i })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <OwnerSitManagement
          sitId="sit-1"
          propertyId="prop-1"
          status="confirmed"
          canCancel
          onCancelClick={() => {}}
          onShareClick={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /partager/i })).toBeNull();
  });
});
