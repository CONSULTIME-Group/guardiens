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
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/web-push", async (orig) => {
  const m = await orig<typeof import("@/lib/web-push")>();
  return {
    ...m,
    pushSupport: () => "supported",
    enablePush: (...a: unknown[]) => enablePushMock(...a),
    getPushState: () => Promise.resolve({ subscribed: true, messages: true, applications: true }),
  };
});

import PushResubscribeCard from "@/components/dashboard/shared/PushResubscribeCard";
import { markPushOptOut, postponePushOffer, canOfferPush } from "@/lib/web-push";

const CTA = "Recevoir mes candidatures sur mon téléphone";
const setPermission = (p: NotificationPermission) => { (globalThis as any).Notification = { permission: p, requestPermission: vi.fn() }; };

beforeEach(() => {
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
    await screen.findByText(/C'est fait/);
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
});
