/**
 * Lot COOK1 (12/11/2026) : bandeau cookies compact (une phrase, trois boutons
 * de même poids sur une ligne) et case des conditions de l'inscription
 * (ligne entière cliquable, liens à part, rappel quand la case est oubliée).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import "@/i18n";
import { MemoryRouter } from "react-router-dom";

(globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
const tracked = vi.hoisted(() => ({ events: [] as Array<{ type: string; meta: Record<string, unknown> | undefined }> }));
const registerMock = vi.hoisted(() => vi.fn(async () => ({ user: { id: "u1", identities: [{}] }, session: null })));
const oauthMock = vi.hoisted(() => vi.fn(async () => ({})));
let search = new URLSearchParams({ role: "owner" });

vi.mock("react-router-dom", async (orig) => {
  const real: any = await orig();
  return { ...real, useNavigate: () => vi.fn(), useSearchParams: () => [search, vi.fn()] };
});
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, refreshProfile: vi.fn(), register: registerMock }) }));
vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => ({ enabled: true, appliesSince: "2026-10-01T00:00:00Z", loading: false }) }));
vi.mock("@/lib/analytics", () => ({
  trackEvent: (type: string, opts?: { metadata?: Record<string, unknown> }) => { tracked.events.push({ type, meta: opts?.metadata }); },
  trackEventWithUserId: vi.fn(),
  mapSignupError: () => "x",
}));
vi.mock("@/integrations/lovable", () => ({ lovable: { auth: { signInWithOAuth: oauthMock } } }));

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
const dict = JSON.parse(read("src/i18n/locales/fr/common.json")).register_page;

const renderRegister = async () => {
  const { default: Register } = await import("@/pages/Register");
  return render(<MemoryRouter><Register /></MemoryRouter>);
};

beforeEach(() => {
  cleanup();
  tracked.events.length = 0;
  registerMock.mockClear();
  oauthMock.mockClear();
  localStorage.clear();
  search = new URLSearchParams({ role: "owner" });
  Element.prototype.scrollIntoView = vi.fn();
});

describe("bandeau cookies compact", () => {
  const renderBanner = async () => {
    const { CookieConsentBanner } = await import("@/components/legal/CookieConsentBanner");
    return render(<MemoryRouter><CookieConsentBanner /></MemoryRouter>);
  };

  it("une phrase, un lien, aucun titre, région nommée", async () => {
    await renderBanner();
    const banner = screen.getByTestId("cookie-banner");
    expect(banner.getAttribute("data-compact")).toBe("true");
    expect(banner.getAttribute("aria-label")).toBe("Cookies");
    expect(banner.querySelector("h2")).toBeNull();
    expect(screen.getByText("Nous mesurons l'audience et nos publicités, seulement avec votre accord.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "En savoir plus" }).getAttribute("href")).toBe("/cookies");
    expect(screen.queryByTestId("cookie-customize")).toBeNull();
  });

  it("trois boutons de même poids, sur une ligne, 44 px, aucun bouton plein", async () => {
    await renderBanner();
    const row = screen.getByTestId("cookie-actions");
    expect(row.className).toContain("grid-cols-3");
    expect(row.className).not.toMatch(/grid-cols-1/);
    const buttons = Array.from(row.querySelectorAll("button"));
    expect(buttons.map((b) => b.textContent)).toEqual(["Tout accepter", "Tout refuser", "Personnaliser"]);
    expect(new Set(buttons.map((b) => b.className)).size).toBe(1);
    expect(buttons[0].className).toContain("h-11");
    expect(buttons[0].className).toContain("whitespace-nowrap");
    expect(buttons[0].className).not.toContain("bg-primary");
  });

  it("mêmes valeurs enregistrées qu'avant : tout accepter, tout refuser", async () => {
    await renderBanner();
    await act(async () => { fireEvent.click(screen.getByText("Tout accepter")); });
    let saved = JSON.parse(localStorage.getItem("guardiens_cookie_consent_v1")!);
    expect([saved.value, saved.ads]).toEqual(["granted", "granted"]);
    expect(screen.queryByTestId("cookie-banner")).toBeNull();
    cleanup(); localStorage.clear();
    await renderBanner();
    await act(async () => { fireEvent.click(screen.getByText("Tout refuser")); });
    saved = JSON.parse(localStorage.getItem("guardiens_cookie_consent_v1")!);
    expect([saved.value, saved.ads]).toEqual(["denied", "denied"]);
  });

  it("« Personnaliser » ouvre le panneau détaillé, rien n'est coché d'avance", async () => {
    await renderBanner();
    fireEvent.click(screen.getByText("Personnaliser"));
    expect(screen.getByText("Un mot sur les cookies")).toBeTruthy();
    expect(screen.getByTestId("cookie-customize")).toBeTruthy();
    expect(screen.getByRole("switch", { name: /Mesure d'audience/ }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("switch", { name: /Mesure des publicités/ }).getAttribute("aria-checked")).toBe("false");
    fireEvent.click(screen.getByRole("switch", { name: /Mesure d'audience/ }));
    await act(async () => { fireEvent.click(screen.getByText("Enregistrer mon choix")); });
    const saved = JSON.parse(localStorage.getItem("guardiens_cookie_consent_v1")!);
    expect([saved.value, saved.ads]).toEqual(["granted", "denied"]);
  });

  it("« Gérer mes cookies » rouvre le panneau détaillé avec l'état enregistré", async () => {
    localStorage.setItem("guardiens_cookie_consent_v1", JSON.stringify({ value: "granted", ads: "denied", timestamp: Date.now() }));
    await renderBanner();
    expect(screen.queryByTestId("cookie-banner")).toBeNull();
    await act(async () => { window.dispatchEvent(new CustomEvent("open-cookie-preferences")); });
    expect(screen.getByTestId("cookie-customize")).toBeTruthy();
    expect(screen.getByRole("switch", { name: /Mesure d'audience/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: /Mesure des publicités/ }).getAttribute("aria-checked")).toBe("false");
  });
});

describe("case des conditions", () => {
  it("textes de la maquette, au mot près", () => {
    expect(dict.accept_short).toBe("J'accepte les conditions de Guardiens");
    expect(dict.accept_read).toBe("Lire : <1>CGU</1>, <2>CGS</2>, <3>confidentialité</3>");
    expect(dict.terms_required_hint).toBe("Cochez cette case pour créer votre compte.");
    expect(dict.terms_reminder).toBe("Il reste à cocher la case des conditions");
  });

  it("case de 24 px, ligne de 56 px, toucher le texte coche la case", async () => {
    await renderRegister();
    const box = await screen.findByRole("checkbox");
    expect(box.id).toBe("accept-terms");
    expect(box.className).toContain("h-6");
    expect(box.className).toContain("w-6");
    const label = box.closest("label")!;
    expect(label.className).toContain("min-h-[56px]");
    expect(label.querySelector("a")).toBeNull();
    fireEvent.click(screen.getByText("J'accepte les conditions de Guardiens"));
    expect(box.getAttribute("aria-checked")).toBe("true");
  });

  it("les trois liens sont sur une ligne à part et s'ouvrent dans un nouvel onglet", async () => {
    await renderRegister();
    await screen.findByRole("checkbox");
    const links = Array.from(screen.getByTestId("terms-block").querySelectorAll("p a")) as HTMLAnchorElement[];
    expect(links.map((a) => [a.textContent, a.getAttribute("href"), a.target])).toEqual([
      ["CGU", "/cgu", "_blank"], ["CGS", "/cgs", "_blank"], ["confidentialité", "/confidentialite", "_blank"],
    ]);
  });

  it("case oubliée par email : message sous la case, focus, rappel sous le bouton, aucun compte", async () => {
    await renderRegister();
    const box = await screen.findByRole("checkbox");
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "camille@exemple.com" } });
    fireEvent.change(document.getElementById("password")!, { target: { value: "Tr0ub4dor&3xyz" } });
    fireEvent.submit(box.closest("form")!);
    const alert = await screen.findByText("Cochez cette case pour créer votre compte.");
    expect(alert.id).toBe("terms-error");
    expect(alert.getAttribute("role")).toBe("alert");
    expect(box.getAttribute("aria-describedby")).toBe("terms-error");
    expect(screen.getByTestId("terms-block").className).toContain("border-2 border-destructive");
    expect(screen.getAllByText("Cochez cette case pour créer votre compte.")).toHaveLength(1);
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect(screen.getByTestId("terms-reminder").textContent).toContain("Il reste à cocher la case des conditions");
    expect(screen.getByTestId("terms-reminder").className).toContain("min-h-[44px]");
    expect(registerMock).not.toHaveBeenCalled();
    expect(tracked.events.filter((e) => e.type === "signup_form_blocked" && e.meta?.reason === "terms_not_accepted")).toHaveLength(1);
  });

  it("case oubliée par Google : même rappel, aucune redirection", async () => {
    await renderRegister();
    const box = await screen.findByRole("checkbox");
    fireEvent.click(screen.getByRole("button", { name: /Google/ }));
    expect(await screen.findByText("Cochez cette case pour créer votre compte.")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect(screen.getByTestId("terms-reminder")).toBeTruthy();
    expect(oauthMock).not.toHaveBeenCalled();
  });

  it("le rappel remonte à la case, cocher efface bord, message et rappel", async () => {
    await renderRegister();
    const box = await screen.findByRole("checkbox");
    fireEvent.click(screen.getByRole("button", { name: /Google/ }));
    const reminder = await screen.findByTestId("terms-reminder");
    (document.activeElement as HTMLElement)?.blur();
    fireEvent.click(reminder);
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect(tracked.events.some((e) => e.type === "signup_terms_reminder_clicked")).toBe(true);
    fireEvent.click(box);
    expect(screen.queryByText("Cochez cette case pour créer votre compte.")).toBeNull();
    expect(screen.queryByTestId("terms-reminder")).toBeNull();
    expect(screen.getByTestId("terms-block").className).not.toContain("border-destructive");
  });
});
