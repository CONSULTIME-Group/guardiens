/**
 * Lot BAS3 (16/11/2026) : la carte « Vous venez de Facebook ? » publie sa
 * place dans --fb-card-h tant qu'elle est affichée (0px fermée), et le bouton
 * « Carte » de la recherche l'ajoute à sa position basse : bandeau cookies,
 * carte Facebook et « Carte » s'empilent sans se recouvrir.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

import FacebookReferralFeedback from "@/components/analytics/FacebookReferralFeedback";
import { FB_CARD_HEIGHT_VAR, FB_CARD_BOTTOM_GAP_PX } from "@/lib/facebookCardHeight";

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");

afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
  localStorage.clear();
  document.documentElement.style.removeProperty(FB_CARD_HEIGHT_VAR);
});

describe("carte Facebook et bouton Carte", () => {
  it("la carte publie sa place à l'ouverture et la remet à 0px à la fermeture", () => {
    vi.useFakeTimers();
    sessionStorage.setItem("fb_ref_active", "1");
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ height: 120, width: 358, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    const style = document.documentElement.style;
    render(<FacebookReferralFeedback />);
    expect(style.getPropertyValue(FB_CARD_HEIGHT_VAR)).toBe("0px");
    act(() => { vi.advanceTimersByTime(25_000); });
    expect(screen.getByTestId("fb-referral-card")).toBeTruthy();
    expect(style.getPropertyValue(FB_CARD_HEIGHT_VAR)).toBe(`${120 + FB_CARD_BOTTOM_GAP_PX}px`);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    fireEvent.click(screen.getByText("Préfère ne pas répondre"));
    expect(screen.queryByTestId("fb-referral-card")).toBeNull();
    expect(style.getPropertyValue(FB_CARD_HEIGHT_VAR)).toBe("0px");
    rect.mockRestore();
  });

  it("la carte se pose au-dessus du bandeau cookies, avec l'écart publié", () => {
    const src = read("src/components/analytics/FacebookReferralFeedback.tsx");
    expect(src).toContain("bottom-[calc(1rem+var(--cookie-banner-h,0px))]");
    expect(FB_CARD_BOTTOM_GAP_PX).toBe(16);
  });

  it("le bouton Carte ajoute la place de la carte Facebook, en liste comme en carte", () => {
    const src = read("src/components/search/SearchSitter.tsx");
    expect(src).toContain(
      "bottom-[calc(var(--bottom-nav-h,0px)+var(--cookie-banner-h,0px)+var(--fb-card-h,0px)+14px+env(safe-area-inset-bottom))]",
    );
    expect(src).toContain(
      "bottom-[calc(var(--bottom-nav-h,0px)+var(--cookie-banner-h,0px)+var(--fb-card-h,0px)+9.5rem+env(safe-area-inset-bottom))]",
    );
  });

  it("le bandeau cookies reste au-dessus du bouton Carte et de la carte Facebook", () => {
    const banner = read("src/components/legal/CookieConsentBanner.tsx");
    expect(banner).toContain("z-[1300]");
    expect(read("src/components/search/SearchSitter.tsx")).toContain("z-[1200] sm:hidden");
    expect(read("src/components/analytics/FacebookReferralFeedback.tsx")).toContain("fixed z-[60]");
  });

  it("aucun tiret cadratin ni demi-cadratin dans les fichiers du lot", () => {
    for (const f of [
      "src/lib/facebookCardHeight.ts",
      "src/__tests__/bas2/bas3-carte-facebook.test.tsx",
    ]) {
      expect(read(f)).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
