/**
 * Lot 0 B et C : rôle Google mémorisé, carte de réactivation des
 * notifications, nom du manifeste.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";

const rpc = vi.fn();
const invoke = vi.fn();
const trackEventMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: "u1" }, access_token: "t" } } }) },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => trackEventMock(...a) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import {
  rememberSignupRole, readPendingSignupRole, applyPendingSignupRole, withSignupRoleParam, SIGNUP_ROLE_KEY,
} from "@/lib/signupRole";
import { PUSH_ID_KEY, PUSH_OWNER_KEY, pushDeviceStatus } from "@/lib/web-push";
import PushResubscribeCard from "@/components/dashboard/shared/PushResubscribeCard";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  rpc.mockReset();
  invoke.mockReset();
  trackEventMock.mockReset();
});

describe("Lot 0 B, rôle choisi avant Google", () => {
  it("mémorise le rôle et l'ajoute à l'URL de retour", () => {
    rememberSignupRole("owner");
    expect(readPendingSignupRole()).toBe("owner");
    expect(withSignupRoleParam("/sits/create?source=signup", "owner")).toBe("/sits/create?source=signup&signup_role=owner");
    expect(withSignupRoleParam("/dashboard", "sitter")).toBe("/dashboard?signup_role=sitter");
  });

  it("ignore une mémoire de plus de 30 minutes", () => {
    rememberSignupRole("owner", Date.now() - 31 * 60 * 1000);
    expect(readPendingSignupRole()).toBeNull();
  });

  it("applique le rôle, efface la mémoire et mesure signup_role_applied", async () => {
    rememberSignupRole("owner");
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await applyPendingSignupRole()).toBe(true);
    expect(rpc).toHaveBeenCalledWith("apply_signup_role", { p_role: "owner" });
    expect(localStorage.getItem(SIGNUP_ROLE_KEY)).toBeNull();
    expect(trackEventMock).toHaveBeenCalledWith("signup_role_applied", expect.objectContaining({ metadata: { role: "owner", method: "google" } }));
  });

  it("membre existant : le serveur refuse, aucun événement, mémoire effacée", async () => {
    rememberSignupRole("owner");
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await applyPendingSignupRole()).toBe(false);
    expect(trackEventMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(SIGNUP_ROLE_KEY)).toBeNull();
  });

  it("sans rôle en attente, aucun appel", async () => {
    expect(await applyPendingSignupRole()).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("Lots 0 C et 0b, notifications arrêtées", () => {
  const status = (enabled: boolean) => ({ data: { subscriptions: [{ id: "s1", enabled, opt_in_messages: true, opt_in_applications: false }] }, error: null });
  const setPermission = (p: NotificationPermission) => {
    (globalThis as any).Notification = { permission: p, requestPermission: vi.fn() };
  };
  const TEXT = "Vos notifications se sont arrêtées sur cet appareil.";
  const local = () => { localStorage.setItem(PUSH_ID_KEY, "s1"); localStorage.setItem(PUSH_OWNER_KEY, "u1"); };

  it("sans identifiant local, aucun appel", async () => {
    expect(await pushDeviceStatus("u1")).toEqual({ kind: "none" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("abonnement actif côté serveur : pas de carte", async () => {
    local(); setPermission("denied");
    const reg = { active: { scriptURL: "http://localhost/push-sw.js" }, pushManager: { getSubscription: () => Promise.resolve({ endpoint: "x" }) } };
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: () => Promise.resolve(reg) } });
    invoke.mockResolvedValue(status(true));
    render(<PushResubscribeCard />);
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(screen.queryByText(TEXT)).toBeNull();
    delete (navigator as any).serviceWorker;
  });

  it("désactivé en 410 avec autorisation accordée : renouvellement silencieux, aucune carte", async () => {
    local(); setPermission("granted");
    invoke.mockResolvedValue(status(false));
    expect(await pushDeviceStatus("u1")).toEqual({ kind: "renewable", subscriptionId: "s1" });
    render(<PushResubscribeCard />);
    await waitFor(() => expect(trackEventMock).toHaveBeenCalledWith("push_renewed_silently", expect.anything()));
    expect(screen.queryByText(TEXT)).toBeNull();
    expect(trackEventMock).not.toHaveBeenCalledWith("push_resubscribe_shown", expect.anything());
    expect((globalThis as any).Notification.requestPermission).not.toHaveBeenCalled();
  });

  it.each(["denied", "default"] as NotificationPermission[])("autorisation %s : carte une seule fois par session", async (perm) => {
    local(); setPermission(perm);
    invoke.mockResolvedValue(status(false));
    const { unmount } = render(<PushResubscribeCard />);
    expect(await screen.findByText(TEXT)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Les réactiver" })).toBeInTheDocument();
    expect(trackEventMock).toHaveBeenCalledWith("push_resubscribe_shown", expect.anything());
    unmount();
    trackEventMock.mockClear();
    render(<PushResubscribeCard />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(TEXT)).toBeNull();
    expect(trackEventMock).not.toHaveBeenCalledWith("push_resubscribe_shown", expect.anything());
  });
});

describe("Lot 0 C, manifeste", () => {
  it("nom sans tiret cadratin ni demi-cadratin", () => {
    const m = JSON.parse(readFileSync("public/manifest.json", "utf8"));
    expect(m.name).toBe("Guardiens, garde de maison et entraide");
    expect(m.short_name).toBe("Guardiens");
    expect(readFileSync("public/manifest.json", "utf8")).not.toMatch(/[\u2013\u2014]/);
  });
});
