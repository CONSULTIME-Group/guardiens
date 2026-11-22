/**
 * Lot REC3, partie 1 : le propriétaire met fin à une garde en cours.
 * Avant, le bouton n'existait que pour une garde confirmée, alors que le
 * gardien pouvait annuler sa participation pendant le séjour.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import OwnerSitManagement from "@/components/sits/shared/OwnerSitManagement";

const read = (p: string) => readFileSync(p, "utf8");

const renderManagement = (inProgress: boolean) =>
  render(
    <MemoryRouter>
      <OwnerSitManagement
        sitId="s1"
        propertyId="p1"
        status={inProgress ? "in_progress" : "confirmed"}
        canCancel
        inProgress={inProgress}
        onCancelClick={vi.fn()}
        canUnpublish={false}
        onUnpublishClick={vi.fn()}
        canArchive={false}
        onArchiveClick={vi.fn()}
      />
    </MemoryRouter>,
  );

describe("REC3, fin d'une garde en cours côté propriétaire", () => {
  it("le propriétaire peut annuler une garde confirmée ou en cours, jamais une garde passée", () => {
    const src = read("src/components/sits/views/OwnerSitView.tsx");
    expect(src).toContain('const inProgress = sit.status === "in_progress";');
    expect(src).toContain('const canCancel = !isPast && (sit.status === "confirmed" || inProgress);');
  });

  it("garde en cours : le geste se nomme « Mettre fin à la garde »", () => {
    renderManagement(true);
    expect(screen.getByRole("button", { name: /Mettre fin à la garde/ })).toBeTruthy();
    expect(screen.getByText(/Prévenez d'abord votre gardien/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Annuler la garde/ })).toBeNull();
  });

  it("garde confirmée : le geste reste « Annuler la garde »", () => {
    renderManagement(false);
    expect(screen.getByRole("button", { name: /Annuler la garde/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Mettre fin à la garde/ })).toBeNull();
  });

  it("la fenêtre adapte ses textes pour le propriétaire d'une garde en cours", () => {
    const src = read("src/components/sits/CancelSitModal.tsx");
    expect(src).toContain('inProgress && !isSitterCancelling ? "Mettre fin à la garde ?" : "Annuler cette garde ?"');
    expect(src).toContain("`Votre message à ${otherName} *`");
  });
});
