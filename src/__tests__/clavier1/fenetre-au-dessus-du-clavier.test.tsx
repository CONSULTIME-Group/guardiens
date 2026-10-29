/**
 * Lot CLAVIER1 (29/10/2026) : une fenêtre reste lisible clavier mobile sorti.
 * Retour de Laurence : « Écrire ce commentaire, je le fais à l'aveugle, la
 * fenêtre ne monte pas et est couverte par le clavier. »
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, act, cleanup } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { isKeyboardOpen } from "@/lib/keyboardViewport";

class FakeViewport extends EventTarget {
  height = 800;
  offsetTop = 0;
  scale = 1;
}

let vv: FakeViewport;
const root = () => document.documentElement;

beforeEach(() => {
  vv = new FakeViewport();
  Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});

afterEach(() => {
  cleanup();
});

function openDialog() {
  return render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>Votre avis</DialogTitle>
        <textarea aria-label="message" />
      </DialogContent>
    </Dialog>,
  );
}

describe("règle clavier", () => {
  it("clavier sorti au-delà de 120 px, zoom au pincement exclu", () => {
    expect(isKeyboardOpen(800, 450)).toBe(true);
    expect(isKeyboardOpen(800, 760)).toBe(false);
    expect(isKeyboardOpen(800, 400, 2)).toBe(false);
  });
});

describe("fenêtre ouverte", () => {
  it("porte le repère de fenêtre lu par la règle CSS", () => {
    const { getByRole } = openDialog();
    expect(getByRole("dialog").hasAttribute("data-guardiens-dialog")).toBe(true);
  });

  it("pose zone visible et clavier sur <html>, puis les retire", () => {
    openDialog();
    expect(root().hasAttribute("data-keyboard-open")).toBe(false);

    act(() => {
      vv.height = 420;
      vv.offsetTop = 260;
      vv.dispatchEvent(new Event("resize"));
    });
    expect(root().hasAttribute("data-keyboard-open")).toBe(true);
    expect(root().style.getPropertyValue("--vv-height")).toBe("420px");
    expect(root().style.getPropertyValue("--vv-top")).toBe("260px");

    act(() => {
      vv.height = 800;
      vv.offsetTop = 0;
      vv.dispatchEvent(new Event("resize"));
    });
    expect(root().hasAttribute("data-keyboard-open")).toBe(false);
  });

  it("fermer la fenêtre nettoie <html>", () => {
    const view = openDialog();
    act(() => {
      vv.height = 420;
      vv.dispatchEvent(new Event("resize"));
    });
    view.unmount();
    expect(root().hasAttribute("data-keyboard-open")).toBe(false);
    expect(root().style.getPropertyValue("--vv-height")).toBe("");
  });

  it("une fenêtre fermée n'écoute rien", () => {
    render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Fermée</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    act(() => {
      vv.height = 420;
      vv.dispatchEvent(new Event("resize"));
    });
    expect(root().hasAttribute("data-keyboard-open")).toBe(false);
  });
});

describe("règle CSS", () => {
  const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
  it("recentre et borne la fenêtre à la zone visible, clavier sorti", () => {
    const m = css.match(/html\[data-keyboard-open\] \[data-guardiens-dialog\] \{[\s\S]*?\}/);
    expect(m, "règle clavier absente de src/index.css").not.toBeNull();
    expect(m![0]).toMatch(/top: calc\(var\(--vv-top, 0px\) \+ var\(--vv-height, 100dvh\) \/ 2\) !important/);
    expect(m![0]).toMatch(/max-height: calc\(var\(--vv-height, 100dvh\) - 1rem\) !important/);
    expect(m![0]).toMatch(/overflow-y: auto !important/);
  });
});
