/**
 * Correctif du rendu du dock Alma : le panneau déplié ne rend jamais plus
 * d'un paragraphe de texte ni plus d'un bouton d'action, et le champ de
 * saisie y est toujours présent.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ALMA_PANEL_FALLBACK_LINE,
  composerPlaceholder,
  resolvePanelLine,
} from "@/lib/alma/dock-panel";
import { resetAlmaConversation } from "@/lib/alma/conversation-store";

const almaState = {
  currentWhisper: null as any,
  dismissCurrent: vi.fn(),
  requestNextTip: vi.fn(),
};
const moodState = { mood: null as any, line: null as string | null, avatar: "idle" as const };
const evolutionState = { data: null as any };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true, activeRole: "owner" }),
}));
vi.mock("@/contexts/AlmaContext", () => ({
  useAlma: () => almaState,
}));
vi.mock("@/hooks/useAlmaFrequency", () => ({
  useAlmaFrequency: () => ({ frequency: "balanced", setFrequency: vi.fn() }),
}));
vi.mock("@/hooks/useAlmaHidden", () => ({
  useAlmaHidden: () => ({ hidden: false, setHidden: vi.fn() }),
}));
vi.mock("@/hooks/useAlmaEvolution", () => ({
  useAlmaEvolution: () => evolutionState,
}));
vi.mock("@/hooks/useAlmaMood", () => ({
  useAlmaMood: () => moodState,
}));
vi.mock("@/hooks/useAlmaVoiceInput", () => ({
  useAlmaVoiceInput: () => ({ supported: false, status: "idle", toggle: vi.fn(), error: null }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/ai/alma/AlmaAvatarAnimated", () => ({
  AlmaAvatarAnimated: () => <div data-testid="alma-avatar" />,
}));

import { AlmaDock } from "@/components/ai/alma/AlmaDock";

function renderDock() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AlmaDock />
    </MemoryRouter>,
  );
}

function expand() {
  fireEvent.click(
    screen.getByRole("button", {
      name: /Ouvrir Alma|Voir la proposition d'Alma|Voir le message d'Alma/,
    }),
  );
}

describe("panneau déplié du dock Alma", () => {
  beforeEach(() => {
    cleanup();
    resetAlmaConversation();
    almaState.currentWhisper = null;
    almaState.dismissCurrent.mockReset();
    moodState.mood = null;
    moodState.line = null;
    evolutionState.data = null;
    delete document.body.dataset.almaDockExpanded;
  });

  it("rend un seul paragraphe, aucune action, et le champ de saisie", () => {
    moodState.line = "Toujours pas sortie en forêt aujourd'hui.";
    const { container } = renderDock();
    expand();
    const panel = screen.getByTestId("alma-dock-panel");
    expect(panel.querySelectorAll("p")).toHaveLength(1);
    expect(panel).toHaveTextContent("Toujours pas sortie en forêt aujourd'hui.");
    expect(screen.getByLabelText("Votre message pour Alma")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="alma-panel-action"]')).toHaveLength(0);
    // Aucune croix sur une humeur.
    expect(screen.queryByLabelText("Fermer le message d'Alma")).toBeNull();
  });

  it("un whisper prime sur l'humeur et garde sa croix et son action unique", () => {
    moodState.line = "Humeur qui doit se taire";
    almaState.currentWhisper = {
      id: "w1",
      type: "tip",
      message: "Pensez à aerer la maison.",
      primaryAction: { label: "Voir", actionId: "go", onClick: vi.fn() },
    };
    renderDock();
    const panel = screen.getByTestId("alma-dock-panel");
    expect(panel.querySelectorAll("p")).toHaveLength(1);
    expect(panel).toHaveTextContent("Pensez à aerer la maison.");
    expect(panel).not.toHaveTextContent("Humeur qui doit se taire");
    expect(screen.getAllByTestId("alma-panel-action")).toHaveLength(1);
    expect(screen.getByLabelText("Fermer le message d'Alma")).toBeInTheDocument();
    expect(screen.getByLabelText("Votre message pour Alma")).toBeInTheDocument();
  });

  it("une proposition rend sa chip comme unique action, avec le champ", () => {
    moodState.line = "Humeur qui doit se taire";
    evolutionState.data = {
      stage: "nouvelle",
      signals: { profileCompletion: 0, identityVerified: false },
    };
    renderDock();
    expand();
    const panel = screen.getByTestId("alma-dock-panel");
    expect(panel.querySelectorAll("p")).toHaveLength(1);
    expect(screen.getAllByTestId("alma-panel-action")).toHaveLength(1);
    expect(screen.getByLabelText("Votre message pour Alma")).toBeInTheDocument();
  });

  it("n'applique aucun autofocus au champ à l'ouverture", () => {
    renderDock();
    expand();
    const field = screen.getByLabelText("Votre message pour Alma");
    expect(document.activeElement).not.toBe(field);
  });

  it("expose l'attribut body qui réserve l'espace du panneau", () => {
    renderDock();
    expect(document.body.dataset.almaDockExpanded).toBeUndefined();
    expand();
    expect(document.body.dataset.almaDockExpanded).toBe("true");
  });

  it("le libellé sous le nom reste le stade de relation, jamais l'humeur", () => {
    moodState.mood = "chiffonnee";
    evolutionState.data = {
      stage: "fidele",
      signals: { profileCompletion: 100, identityVerified: true, publishedSitsCount: 1, allSitsCount: 1 },
    };
    renderDock();
    expect(screen.queryByText("chiffonnée")).toBeNull();
    expect(screen.getByText("Fidèle")).toBeInTheDocument();
  });
});

describe("ligne unique du panneau, logique pure", () => {
  it("priorité whisper, proposition, humeur, repli", () => {
    expect(
      resolvePanelLine({ whisperMessage: "W", propositionMessage: "P", moodLine: "M" }),
    ).toBe("W");
    expect(
      resolvePanelLine({ whisperMessage: null, propositionMessage: "P", moodLine: "M" }),
    ).toBe("P");
    expect(
      resolvePanelLine({ whisperMessage: null, propositionMessage: null, moodLine: "M" }),
    ).toBe("M");
    expect(
      resolvePanelLine({ whisperMessage: null, propositionMessage: null, moodLine: null }),
    ).toBe(ALMA_PANEL_FALLBACK_LINE);
  });
});

describe("placeholder du composeur, adapté à la surface", () => {
  it.each([
    ["owner_dashboard", "Une question sur votre annonce\u00A0?"],
    ["sitter_dashboard", "Une question sur une garde\u00A0?"],
    ["sitter_profile", "Une question sur ce gardien\u00A0?"],
    ["sit_detail", "Une question sur cette annonce\u00A0?"],
    ["search_page", "Dites-moi ce que vous cherchez"],
    ["listings", "Dites-moi ce que vous cherchez"],
    ["mutual_aid", "Une question sur l'entraide\u00A0?"],
    ["favorites", "Demandez-moi quelque chose"],
  ])("%s", (surface, expected) => {
    expect(composerPlaceholder(surface)).toBe(expected);
  });

  it("vouvoiement partout, aucun tiret cadratin ni demi-cadratin", () => {
    const all = [
      "owner_dashboard",
      "sitter_dashboard",
      "sitter_profile",
      "sit_detail",
      "search_page",
      "listings",
      "mutual_aid",
      "autre",
    ].map(composerPlaceholder);
    for (const p of all) {
      expect(p.includes("\u2014")).toBe(false);
      expect(p.includes("\u2013")).toBe(false);
      expect(p).not.toMatch(/\b(tu|ton|ta|tes)\b/i);
    }
  });
});

describe("verrous de structure du dock", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/ai/alma/AlmaDock.tsx"),
    "utf8",
  );

  it("le CTA Explorer les conseils a disparu du panneau", () => {
    expect(source).not.toContain("Explorer les conseils");
  });

  it("les clés d'humeur ne s'affichent plus dans le dock", () => {
    expect(source).not.toContain("MOOD_STATUS_LABEL");
  });

  it("le panneau réserve son espace partout, pas seulement sur /messages", () => {
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
    expect(css).toContain('body[data-alma-dock-expanded="true"] #main-content');
  });
});
