/**
 * Lot L1 (08/11/2026, arène tableau de bord v2) : socle des feuilles.
 * - « Retour » du téléphone referme la feuille ouverte, sans quitter la page ;
 * - une feuille refermée par l'écran retire son entrée d'historique, sauf
 *   après une navigation vers une autre page ;
 * - clavier mobile : même suivi de la zone visible que les fenêtres (CLAVIER1).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, renderHook, screen, waitFor, act } from "@testing-library/react";
import { useState } from "react";
import { useCloseOnBack, SHEET_HISTORY_KEY } from "@/lib/sheetBackClose";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SHEET_ATTR } from "@/lib/keyboardViewport";

afterEach(() => {
  window.history.replaceState(null, "");
  vi.restoreAllMocks();
});

const mark = () => (window.history.state as Record<string, unknown> | null)?.[SHEET_HISTORY_KEY];

describe("L1, Retour referme la feuille", () => {
  it("l'ouverture ajoute une entrée marquée à la même adresse", () => {
    const href = window.location.href;
    renderHook(() => useCloseOnBack(true, () => {}));
    expect(typeof mark()).toBe("string");
    expect(window.location.href).toBe(href);
  });

  it("Retour appelle la fermeture", async () => {
    const close = vi.fn();
    renderHook(() => useCloseOnBack(true, close));
    act(() => window.history.back());
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it("fermée par l'écran : l'entrée est retirée", () => {
    const back = vi.spyOn(window.history, "back");
    const { unmount } = renderHook(() => useCloseOnBack(true, () => {}));
    unmount();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("après une navigation vers une autre page, rien n'est retiré", () => {
    const back = vi.spyOn(window.history, "back");
    const { unmount } = renderHook(() => useCloseOnBack(true, () => {}));
    window.history.pushState({ idx: 9 }, "", "/autre-page");
    unmount();
    expect(back).not.toHaveBeenCalled();
    window.history.replaceState(null, "", "/");
  });

  it("désactivé : aucune entrée", () => {
    renderHook(() => useCloseOnBack(false, () => {}));
    expect(mark()).toBeUndefined();
  });

  it("feuille réelle : Retour la referme", async () => {
    const Demo = () => {
      const [open, setOpen] = useState(true);
      return (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom">
            <SheetTitle>Préparer votre garde</SheetTitle>
          </SheetContent>
        </Sheet>
      );
    };
    render(<Demo />);
    expect(screen.getByText("Préparer votre garde")).toBeInTheDocument();
    expect(document.querySelector(`[${SHEET_ATTR}="bottom"]`)).not.toBeNull();
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByText("Préparer votre garde")).toBeNull());
  });
});

describe("L1, clavier mobile dans les feuilles", () => {
  it("règles CSS des feuilles du bas et pleine hauteur", () => {
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toContain('html[data-keyboard-open] [data-guardiens-sheet="bottom"]');
    expect(css).toContain("bottom: calc(100% - var(--vv-top, 0px) - var(--vv-height, 100dvh)) !important;");
    expect(css).toContain('html[data-keyboard-open] [data-guardiens-sheet="alma"]');
  });

  it("le champ actif d'une feuille est ramené dans la zone visible", () => {
    expect(readFileSync("src/lib/keyboardViewport.ts", "utf8")).toContain("[${DIALOG_ATTR}], [${SHEET_ATTR}]");
  });
});
