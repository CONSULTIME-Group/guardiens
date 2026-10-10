import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ProfileHero, { type ProfileHeroProps } from "@/components/profile/ProfileHero";
import { HERO_BANK } from "@/lib/heroBank";
import { getMobileByIndex } from "@/lib/heroBankMobile";

vi.mock("@/components/profile/ResponsivenessBadge", () => ({ default: () => null }));
vi.mock("@/components/shared/FavoriteButton", () => ({ default: () => null }));
afterEach(cleanup);
const props: ProfileHeroProps = {
  facet: "sitter", id: "isolated", firstName: "Profil de recette", city: "Montréal, Canada",
  avatarUrl: null, heroDesktop: HERO_BANK[56], heroMobile: getMobileByIndex(56) ?? HERO_BANK[56],
  heroAnchor: "center", isOwnProfile: true, onOpenHeroPicker: vi.fn(),
  onOpenAvatarLightbox: vi.fn(), hasAvatarLightbox: false, isAvailable: true,
  avgRating: 0, reviewCount: 0, statutGardien: null, identityVerified: true,
  hasActiveSubscription: false, emergencyActive: false, cta: { kind: "own" },
};

describe("L5 immersive hero interactions", () => {
  it("opening the own-profile picker only calls the supplied callback", () => {
    const open = vi.fn();
    render(<MemoryRouter><ProfileHero {...props} onOpenHeroPicker={open} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Changer l'image" }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Agrandir la photo/ })).toBeDisabled();
  });
  it("visitor keeps contact link but cannot open the picker", () => {
    render(<MemoryRouter><ProfileHero {...props} isOwnProfile={false} cta={{ kind: "unauthenticated", signupHref: "/auth" }} /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Changer l'image" })).toBeNull();
    expect(screen.getByRole("link", { name: /S'inscrire pour contacter/ })).toHaveAttribute("href", "/auth");
  });
  it("identity click explains the real verification without navigation", () => {
    render(<MemoryRouter><ProfileHero {...props} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Identité vérifiée" }));
    expect(screen.getByText(/analysée automatiquement/)).toBeVisible();
    expect(screen.getByText(/ne garantit pas la fiabilité/)).toBeVisible();
  });
  it("all mobile illustrations retain the selected desktop index, including 100", () => {
    HERO_BANK.forEach((_, index) => {
      expect(getMobileByIndex(index)).toContain(`hero-${String(index + 1).padStart(2, "0")}.webp`);
    });
  });
});