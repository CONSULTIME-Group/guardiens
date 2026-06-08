/**
 * Tests unitaires pour ActiveRolesSection — bascule symétrique sitter/owner
 * et gestion du dernier rôle actif.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockSwitchRole = vi.fn();
const mockRefreshProfile = vi.fn(async () => {});
const mockUpdate = vi.fn(async (..._args: unknown[]) => ({ error: null }));
const mockEq = vi.fn((..._args: unknown[]) => mockUpdate());
const mockMaybeSingle = vi.fn(async () => ({ data: { is_available: true }, error: null }));
const mockSelectEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }));
const mockFrom = vi.fn((_table: string) => ({
  update: (_payload: unknown) => ({ eq: mockEq }),
  select: (_cols?: string) => mockSelect(),
}));
const mockInvoke = vi.fn(async (_name: string, _opts?: unknown) => ({ data: { url: "https://stripe.test/portal" }, error: null }));
const toastSuccess = vi.fn();
const toastError = vi.fn();

let currentUser: { id: string; role: "owner" | "sitter" | "both" } | null = null;
let currentActiveRole: "owner" | "sitter" = "owner";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: currentUser,
    activeRole: currentActiveRole,
    refreshProfile: mockRefreshProfile,
    switchRole: mockSwitchRole,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    functions: { invoke: (name: string, opts?: unknown) => mockInvoke(name, opts) },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}));

// Stub ActivateRoleDialog : on expose juste le targetRole pour pouvoir l'asserter.
vi.mock("@/components/premium/ActivateRoleDialog", () => ({
  default: ({ open, targetRole }: any) =>
    open ? <div data-testid="activate-dialog" data-target={targetRole} /> : null,
}));

// Stub window.location.reload qui sinon casse jsdom.
const originalLocation = window.location;
beforeEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, reload: vi.fn() },
  });
});

import ActiveRolesSection from "../ActiveRolesSection";

const renderSection = () =>
  render(
    <MemoryRouter>
      <ActiveRolesSection />
    </MemoryRouter>,
  );

const switches = () => screen.getAllByRole("switch");

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = { id: "user-1", role: "both" };
  currentActiveRole = "owner";
});

afterEach(() => {
  cleanup();
  // Radix monte les Dialog dans un portail attaché à document.body :
  // on purge manuellement pour éviter les fuites entre tests.
  document.body.innerHTML = "";
});

describe("ActiveRolesSection — bascule symétrique", () => {
  it("affiche les deux switches activés quand role='both'", () => {
    renderSection();
    const [ownerSwitch, sitterSwitch] = switches();
    expect(ownerSwitch).toHaveAttribute("aria-checked", "true");
    expect(sitterSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("role='both' → désactiver le gardien ouvre le dialog 'gardien'", async () => {
    renderSection();
    const [, sitterSwitch] = switches();
    fireEvent.click(sitterSwitch);
    expect(await screen.findByText(/Désactiver l'espace gardien/i)).toBeInTheDocument();
    // Bouton de gestion Stripe présent
    expect(screen.getByText(/Gérer mon abonnement Stripe/i)).toBeInTheDocument();
  });

  it("role='both' → confirmation désactivation gardien → role='owner'", async () => {
    renderSection();
    fireEvent.click(switches()[1]); // sitter
    fireEvent.click(await screen.findByText(/Confirmer la désactivation/i));
    await waitFor(() => {
      expect(mockSwitchRole).toHaveBeenCalledWith("owner");
      expect(mockRefreshProfile).toHaveBeenCalled();
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/gardien.*désactivé/i));
    });
  });

  it("role='both' → confirmation désactivation propriétaire → role='sitter'", async () => {
    renderSection();
    fireEvent.click(switches()[0]); // owner
    fireEvent.click(await screen.findByText(/Confirmer la désactivation/i));
    await waitFor(() => {
      expect(mockSwitchRole).toHaveBeenCalledWith("sitter");
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/propriétaire.*désactivé/i));
    });
  });

  it("role='both' → sélecteur d'espace par défaut bascule activeRole", () => {
    currentActiveRole = "owner";
    renderSection();
    const sitterRadio = screen.getByRole("radio", { name: /Gardien/i });
    fireEvent.click(sitterRadio);
    expect(mockSwitchRole).toHaveBeenCalledWith("sitter");
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/gardien.*par défaut/i));
  });

  it("role='both' → re-cliquer sur l'espace déjà actif ne fait rien", () => {
    currentActiveRole = "owner";
    renderSection();
    const ownerRadio = screen.getByRole("radio", { name: /Propriétaire/i });
    fireEvent.click(ownerRadio);
    expect(mockSwitchRole).not.toHaveBeenCalled();
  });
});

describe("ActiveRolesSection — dernier rôle actif", () => {
  it("role='sitter' seul → désactivation bloquée, propose d'activer propriétaire", async () => {
    currentUser = { id: "user-1", role: "sitter" };
    currentActiveRole = "sitter";
    renderSection();
    // Pas de sélecteur d'espace par défaut quand un seul rôle
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    // Owner switch décoché, sitter coché
    const [ownerSwitch, sitterSwitch] = switches();
    expect(ownerSwitch).toHaveAttribute("aria-checked", "false");
    expect(sitterSwitch).toHaveAttribute("aria-checked", "true");

    fireEvent.click(sitterSwitch);
    expect(
      await screen.findByText(/seul espace actif/i),
    ).toBeInTheDocument();
    const activateBtns = screen.getAllByRole("button", { name: /Activer l'autre espace/i });
    fireEvent.click(activateBtns[activateBtns.length - 1]);
    const dialog = await screen.findByTestId("activate-dialog");
    expect(dialog.getAttribute("data-target")).toBe("proprio");
  });

  it("role='owner' seul → désactivation bloquée, propose d'activer gardien", async () => {
    currentUser = { id: "user-1", role: "owner" };
    currentActiveRole = "owner";
    renderSection();
    fireEvent.click(switches()[0]);
    expect(await screen.findByText(/seul espace actif/i)).toBeInTheDocument();
    const activateBtns = screen.getAllByRole("button", { name: /Activer l'autre espace/i });
    fireEvent.click(activateBtns[activateBtns.length - 1]);
    const dialog = await screen.findByTestId("activate-dialog");
    expect(dialog.getAttribute("data-target")).toBe("gardien");
  });

  it("rôle absent → activer le switch ouvre le dialog d'activation correspondant", async () => {
    currentUser = { id: "user-1", role: "owner" };
    renderSection();
    fireEvent.click(switches()[1]); // sitter inactif
    const dialog = await screen.findByTestId("activate-dialog");
    expect(dialog.getAttribute("data-target")).toBe("gardien");
  });

  it("dernier rôle → bouton Supprimer mon compte présent", async () => {
    currentUser = { id: "user-1", role: "sitter" };
    renderSection();
    fireEvent.click(switches()[1]);
    expect(await screen.findByText(/Supprimer mon compte/i)).toBeInTheDocument();
  });
});
