/** Lot NOTIF1 : notifications proposées au moment où elles servent. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const m = vi.hoisted(() => ({ support: "supported", offer: true, local: false, enable: vi.fn(), track: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: m.track }));
vi.mock("@/lib/web-push", () => ({
  pushSupport: () => m.support, canOfferPush: () => m.offer, hasLocalPushSubscription: () => m.local,
  getPushConfig: () => Promise.resolve({ enabled: true, publicKey: "k" }),
  enablePush: m.enable, getPushState: () => Promise.resolve({ subscribed: true }),
  clearPushOptOut: vi.fn(), postponePushOffer: vi.fn(),
}));
import PushMomentOffer from "@/components/notifications/PushMomentOffer";

const view = (moment: "sit_published" | "application_sent" | "help_offered") =>
  render(<MemoryRouter><PushMomentOffer moment={moment} /></MemoryRouter>);

beforeEach(() => { m.support = "supported"; m.offer = true; m.local = false; m.enable.mockReset().mockResolvedValue({}); m.track.mockReset(); });

describe("NOTIF1", () => {
  it("annonce publiée : candidatures, sans annonces proches", async () => {
    view("sit_published");
    const btn = await screen.findByRole("button", { name: "Recevoir mes candidatures" });
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);
    await screen.findByText("Notifications activées sur cet appareil.");
    expect(m.enable).toHaveBeenCalledWith("u1", { enabled: true, publicKey: "k" }, { messages: true, applications: true, nearbySits: false });
  });
  it("candidature envoyée : annonces proches cochées et décochables", async () => {
    view("application_sent");
    const box = await screen.findByRole("checkbox", { name: "Nouvelles annonces près de chez moi" });
    expect(box).toBeChecked();
    fireEvent.click(box);
    const btn = screen.getByRole("button", { name: "Activer les notifications" });
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);
    await screen.findByText("Notifications activées sur cet appareil.");
    expect(m.enable.mock.calls[0][2]).toEqual({ messages: true, applications: true, nearbySits: false });
  });
  it("iPhone hors application : guide d'installation", () => {
    m.support = "ios-install";
    view("help_offered");
    expect(screen.getByTestId("push-moment-ios")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir comment faire" }).getAttribute("href")).toBe("/settings?section=installation");
  });
  it("déjà décidé sur cet appareil : rien", () => {
    m.offer = false;
    const { container } = view("sit_published");
    expect(container).toBeEmptyDOMElement();
  });
});
