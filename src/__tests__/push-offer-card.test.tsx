/** Proposition d'activation push sur le tableau de bord propriétaire. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const invoke = vi.fn();
const trackEventMock = vi.fn();
const enablePushMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: "u1" }, access_token: "t" } } }) },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => trackEventMock(...a) }));
let authUser: { id: string } | null = { id: "u1" };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: authUser }) }));
vi.mock("@/lib/web-push", async (orig) => {
  const m = await orig<typeof import("@/lib/web-push")>();
  return {
    ...m,
    enablePush: (...a: unknown[]) => enablePushMock(...a),
    getPushState: () => Promise.resolve({ subscribed: true, messages: true, applications: true }),
  };
});

import PushResubscribeCard from "@/components/dashboard/shared/PushResubscribeCard";
import { markPushOptOut, postponePushOffer, canOfferPush } from "@/lib/web-push";

const CTA = "Recevoir mes candidatures sur mon téléphone";
const setPermission = (p: NotificationPermission) => { (globalThis as any).Notification = { permission: p, requestPermission: vi.fn() }; };

Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
(window as any).PushManager = function PushManager() {};
window.matchMedia ??= ((() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as any);
Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: () => Promise.resolve(undefined), addEventListener() {}, removeEventListener() {} } });

beforeEach(() => {
  authUser = { id: "u1" };
  localStorage.clear(); sessionStorage.clear();
  invoke.mockReset(); trackEventMock.mockReset(); enablePushMock.mockReset();
  invoke.mockResolvedValue({ data: { enabled: true, publicKey: "k" }, error: null });
  setPermission("default");
});

describe("Proposition push propriétaire", () => {
  it("propriétaire, autorisation jamais demandée : bouton direct, messages et candidatures cochés", async () => {
    enablePushMock.mockResolvedValue({ nearbyRequested: false, nearbySaved: false });
    render(<PushResubscribeCard role="owner" />);
    const btn = await screen.findByRole("button", { name: CTA });
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);
    await screen.findByText("Notifications activées sur cet appareil.");
    expect(enablePushMock).toHaveBeenCalledWith("u1", { enabled: true, publicKey: "k" }, { messages: true, applications: true, nearbySits: false });
  });

  it("gardien : aucune proposition", async () => {
    render(<PushResubscribeCard role="sitter" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("button", { name: CTA })).toBeNull();
  });

  it.each(["denied", "granted"] as NotificationPermission[])("autorisation %s : aucune proposition", (p) => {
    setPermission(p);
    expect(canOfferPush("u1")).toBe(false);
  });

  it("désactivation explicite : jamais reproposé", () => {
    markPushOptOut("u1");
    expect(canOfferPush("u1")).toBe(false);
  });

  it("Plus tard : pas avant 30 jours", () => {
    const now = Date.now();
    postponePushOffer("u1", now);
    expect(canOfferPush("u1", now + 29 * 864e5)).toBe(false);
    expect(canOfferPush("u1", now + 31 * 864e5)).toBe(true);
  });

  it("refus dans la fenêtre du navigateur : la carte disparaît", async () => {
    enablePushMock.mockRejectedValue(new Error("push_permission_denied"));
    render(<PushResubscribeCard role="owner" />);
    const btn = await screen.findByRole("button", { name: CTA });
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);
    await waitFor(() => expect(screen.queryByRole("button", { name: CTA })).toBeNull());
  });

  it("carte visible du compte A : rien pour B ni après déconnexion", async () => {
    const { rerender } = render(<PushResubscribeCard role="owner" />);
    await screen.findByRole("button", { name: CTA });
    authUser = { id: "u2" };
    rerender(<PushResubscribeCard role="owner" />);
    expect(screen.queryByRole("button", { name: CTA })).toBeNull();
    authUser = null;
    rerender(<PushResubscribeCard role="owner" />);
    expect(screen.queryByRole("button", { name: CTA })).toBeNull();
  });

  it("changement de compte pendant l'activation : aucun résultat de A affiché pour B", async () => {
    let finish!: (v: unknown) => void;
    enablePushMock.mockReturnValue(new Promise((r) => { finish = r; }));
    const { rerender } = render(<PushResubscribeCard role="owner" />);
    const btn = await screen.findByRole("button", { name: CTA });
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);
    authUser = { id: "u2" };
    sessionStorage.clear();
    rerender(<PushResubscribeCard role="sitter" />);
    finish({ nearbyRequested: false, nearbySaved: false });
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByText("Notifications activées sur cet appareil.")).toBeNull();
    expect(screen.queryByText(/n'a pas abouti/)).toBeNull();
    expect(screen.queryByRole("button", { name: CTA })).toBeNull();
  });
});
