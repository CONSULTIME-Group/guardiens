/**
 * Lot P3 : le haut du tableau de bord est rendu dans la première tâche, les
 * blocs mis en attente arrivent ensuite, avec une hauteur réservée.
 */
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { StagedMount } from "@/components/dashboard/shared/DeferredMount";

describe("P3, rendu par étapes", () => {
  it("le haut apparaît avant le bloc différé, qui finit affiché", async () => {
    render(
      <div>
        <h1>Bonjour</h1>
        <StagedMount minHeight={320} testId="rail"><p>Bloc bas</p></StagedMount>
      </div>,
    );
    expect(screen.getByText("Bonjour")).toBeTruthy();
    expect(screen.queryByText("Bloc bas")).toBeNull();
    const ph = document.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(ph.style.minHeight).toBe("320px");
    for (let i = 0; i < 10 && !screen.queryByText("Bloc bas"); i++) {
      await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    }
    expect(screen.getByText("Bloc bas")).toBeTruthy();
  });

  it("propriétaire et gardien mettent en attente les blocs bas", () => {
    const o = readFileSync("src/components/dashboard/OwnerDashboard.tsx", "utf8");
    const s = readFileSync("src/components/dashboard/SitterDashboard.tsx", "utf8");
    for (const id of ["cap", "history", "rail"]) expect(o).toContain(`testId="${id}"`);
    for (const id of ["missing", "rail"]) expect(s).toContain(`testId="${id}"`);
  });
});
