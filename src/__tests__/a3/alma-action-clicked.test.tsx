/**
 * Lot A3 : un clic sur l'action de la conversation d'Alma produit
 * alma_action_clicked (reason, kind, path sans paramètres, surface).
 * La mesure est le mock global de src/test/setup.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import {
  openAlmaConversation,
  readAlmaAction,
  resetAlmaConversation,
  sendAlmaMessage,
} from "@/lib/alma/conversation-store";

vi.mock("@/hooks/useAlmaVoiceInput", () => ({
  useAlmaVoiceInput: () => ({ supported: false, status: "idle", toggle: vi.fn(), error: null }),
}));
vi.mock("@/components/ai/alma/AlmaDock", () => ({ VoiceStatusLine: () => null }));
vi.mock("@/components/ai/alma/AlmaHumanContact", () => ({
  ALMA_HUMAN_CONTACT_LABEL: "Écrire à Jérémie et Elisa",
  AlmaHumanContactForm: () => <p data-testid="human-contact-form">formulaire</p>,
}));

import { AlmaConversation, almaClickPath } from "@/components/ai/alma/AlmaConversation";

function Where() {
  const l = useLocation();
  return <p data-testid="where">{`${l.pathname}${l.search}`}</p>;
}

function renderPanel(onOpenChange = vi.fn()) {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="*"
          element={(
            <>
              <Where />
              <AlmaConversation
                open
                onOpenChange={onOpenChange}
                surface="owner_dashboard"
                activeRole="owner"
                initialMessage="Bonjour."
                stage="nouvelle"
              />
            </>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
  return onOpenChange;
}

async function seedAnswer(data: Record<string, unknown>) {
  resetAlmaConversation();
  openAlmaConversation("Bonjour.");
  const invoke = vi.fn().mockResolvedValue({ data: { answer: "Voici la suite.", ...data }, error: null });
  await sendAlmaMessage({ text: "Je pars en vacances", surface: "owner_dashboard", activeRole: "owner", invoke: invoke as any });
  vi.mocked(trackEvent).mockClear();
}

beforeEach(() => {
  cleanup();
});

describe("A3, alma_action_clicked", () => {
  it("le bouton d'action émet l'événement avec le motif du moteur et le chemin sans paramètres", async () => {
    await seedAnswer({
      action: { label: "Publier mon annonce de garde", path: "/sits/create?titre=Deux%20chats&via=alma", reason: "intention_garde" },
    });
    const onOpenChange = renderPanel();
    fireEvent.click(screen.getByTestId("alma-message-action"));
    expect(trackEvent).toHaveBeenCalledWith("alma_action_clicked", {
      metadata: { reason: "intention_garde", kind: "action", path: "/sits/create", surface: "owner_dashboard" },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByTestId("where").textContent).toBe("/sits/create?titre=Deux%20chats&via=alma");
  });

  it("une pastille émet l'événement avec sa nature", async () => {
    await seedAnswer({ chips: [{ label: "Régler mon alerte", path: "/mon-secteur?x=1" }] });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Régler mon alerte" }));
    expect(trackEvent).toHaveBeenCalledWith("alma_action_clicked", {
      metadata: { reason: "chip", kind: "chip", path: "/mon-secteur", surface: "owner_dashboard" },
    });
  });

  it("l'action « /contact » est mesurée et ouvre le formulaire sans naviguer", async () => {
    await seedAnswer({ action: { label: "Écrire à l'équipe", path: "/contact", reason: "contact" } });
    renderPanel();
    fireEvent.click(screen.getByTestId("alma-message-action"));
    expect(trackEvent).toHaveBeenCalledWith("alma_action_clicked", {
      metadata: { reason: "contact", kind: "action", path: "/contact", surface: "owner_dashboard" },
    });
    expect(screen.getByTestId("where").textContent).toBe("/dashboard");
    expect(screen.getByTestId("human-contact-form")).toBeInTheDocument();
  });

  it("le motif transmis par le serveur est gardé s'il est sûr, ignoré sinon", () => {
    expect(readAlmaAction({ label: "x", path: "/a", reason: "intention_garde" })).toEqual({ label: "x", path: "/a", reason: "intention_garde" });
    expect(readAlmaAction({ label: "x", path: "/a", reason: "<script>" })).toEqual({ label: "x", path: "/a" });
  });

  it("chemin mesuré sans paramètres ni ancre", () => {
    expect(almaClickPath("/sits/create?titre=a&via=alma")).toBe("/sits/create");
    expect(almaClickPath("/sits/abc#candidatures")).toBe("/sits/abc");
  });

  it("le type d'événement est déclaré", () => {
    const src = readFileSync("src/lib/analytics.ts", "utf8");
    expect(src).toContain('| "alma_action_clicked"');
  });
});
