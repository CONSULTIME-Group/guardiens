/**
 * Lot D1, refonte du tableau de bord propriétaire : gardes de composition
 * et rendus de l'accueil, de « Près de chez vous » et du bandeau entraide.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useOwnerTopAffinitySitters", () => ({
  useOwnerTopAffinitySitters: () => ({
    topSitters: [
      { id: "a", first_name: "Ingrid", city: "LYON", avatar_url: null, distance_km: 4.2, identity_verified: false, affinity: { score: 100, sortScore: 100, total: 8 } },
      { id: "b", first_name: "Apolline", city: "lyon", avatar_url: null, distance_km: 6, identity_verified: false, affinity: { score: 100, sortScore: 96, total: 8 } },
    ],
    totalPool: 1326,
    hasPublishedSit: false,
    isLoading: false,
  }),
}));
vi.mock("@/hooks/useOwnerProfile", () => ({ useOwnerProfile: () => ({ data: { city: "lyon" } }) }));
vi.mock("@tanstack/react-query", async (orig) => ({
  ...(await orig<typeof import("@tanstack/react-query")>()),
  useQuery: () => ({ data: { a: { sitter_type: "Famille", experience_years: "5+ ans" }, b: { sitter_type: "Couple" } } }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useNearbyOwnerSitters", () => ({
  useNearbyOwnerSitters: () => ({ data: { sitters: [], radiusUsed: 30, hasGeo: true, totalCount: 42 } }),
}));

import OwnerCockpit from "@/components/dashboard/owner/OwnerCockpit";
import OwnerNearbySitters from "@/components/dashboard/owner/OwnerNearbySitters";
import { OwnerEntraideBandView } from "@/components/dashboard/owner/OwnerEntraideBand";
import type { HelpRow } from "@/components/dashboard/MesCoupsDeMain";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf8");
const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("OwnerDashboard, composition lot D1", () => {
  const dash = src("components/dashboard/OwnerDashboard.tsx");
  it.each([
    "HelpsWithReminder", "MutualAidRadiusLine", "MesCoupsDeMain",
    "CommunityPulseBanner", "PetAdviceSection", "OwnerAffinityBanner",
  ])("ne rend plus <%s>", (name) => {
    expect(dash).not.toMatch(new RegExp(`<${name}[\\s/>]`));
  });
  it("remplace OwnerSitterSpotlight par OwnerNearbySitters", () => {
    expect(dash).not.toContain("<OwnerSitterSpotlight");
    expect(dash).toContain("<OwnerNearbySitters");
  });
  it("Dashboard.tsx ne rend plus le digest ni Alma dormante, pour aucun rôle (lot D2)", () => {
    const page = src("pages/Dashboard.tsx");
    expect(page).not.toMatch(/<WelcomeBackDigest[\s/>]/);
    expect(page).not.toMatch(/<AlmaDormantReturnWhisper[\s/>]/);
  });
});

describe("Accueil propriétaire", () => {
  it("gouache pleine : ni opacité réduite ni voile", () => {
    const cockpitSrc = src("components/dashboard/owner/OwnerCockpit.tsx");
    expect(cockpitSrc).not.toMatch(/opacity|gradient|mask-image|bg-gradient/);
    wrap(<OwnerCockpit firstName="jeremie" hour={9} />);
    const img = screen.getByTestId("owner-cockpit-gouache");
    expect(img.className).not.toMatch(/opacity/);
    expect(img.getAttribute("style") ?? "").not.toMatch(/opacity/);
    expect(img.parentElement?.children).toHaveLength(1);
  });
  it("sans action à faire : pas de rangée, salutation selon l'heure", () => {
    wrap(<OwnerCockpit firstName="jeremie" hour={20} line="12 gardiens sont inscrits à moins de 30 km de Lyon." />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bonsoir, Jeremie.");
    expect(screen.queryByTestId("owner-cockpit-todos")).toBeNull();
    expect(screen.getByTestId("owner-cockpit-line").textContent).toContain("12 gardiens");
  });
  it("avec actions : 3 pastilles au plus", () => {
    wrap(
      <OwnerCockpit
        firstName="jeremie"
        hour={9}
        todos={[
          { key: "apps", label: "Candidatures à traiter", to: "/sits", count: 2 },
          { key: "messages", label: "Messages à lire", to: "/messages", count: 3 },
          { key: "helps", label: "Votre phrase d'entraide", to: "/ma-ligne" },
          { key: "x", label: "En trop", to: "/x" },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bonjour, Jeremie.");
    expect(screen.getByTestId("owner-cockpit-todos").querySelectorAll("li")).toHaveLength(3);
    expect(screen.queryByText("En trop")).toBeNull();
  });
});

describe("Près de chez vous", () => {
  it("sans annonce publiée : aucun pourcentage, ligne d'attente et porte de sortie au compte exact", () => {
    wrap(<OwnerNearbySitters />);
    expect(screen.queryByTestId("affinity-percent")).toBeNull();
    expect(screen.getByText("L'affinité se calcule dès votre annonce publiée.")).toBeTruthy();
    expect(screen.getByText("Voir les 42 gardiens à moins de 30 km")).toBeTruthy();
    expect(screen.queryByText(/1326/)).toBeNull();
    expect(screen.getByText(/En famille · plus de 5 ans d'expérience/)).toBeTruthy();
  });
});

describe("Bandeau entraide", () => {
  const row = (extra: Partial<HelpRow>): HelpRow => ({
    id: "m1", title: "Arroser le potager", city: "poleymieux au mont'dor", status: "in_progress",
    close_reason: null, role: "owner", other_id: "u2", other_first_name: "Nadia", word: null, answered: false, ...extra,
  });
  it("échange en cours : affiché en ligne avec son action", () => {
    wrap(<OwnerEntraideBandView helpersCount={7} helpersRadiusKm={30} exchanges={[row({})]} />);
    expect(screen.getByTestId("entraide-ongoing").textContent).toContain("Arroser le potager");
    expect(screen.getByText("Vous vous êtes rencontrés ?")).toBeTruthy();
    expect(screen.queryByTestId("entraide-last-done")).toBeNull();
    expect(screen.getByText("7 personnes sont prêtes à aider à moins de 30 km.")).toBeTruthy();
  });
  it("échange terminé : petite ligne de rappel", () => {
    wrap(<OwnerEntraideBandView helpersCount={0} helpersRadiusKm={30} exchanges={[row({ status: "completed" })]} mutualRadiusKm={25} />);
    expect(screen.queryByTestId("entraide-ongoing")).toBeNull();
    expect(screen.getByTestId("entraide-last-done").textContent).toBe(
      "Votre dernier échange : Arroser le potager, à Poleymieux-au-Mont-d'Or. Terminé.",
    );
    expect(screen.getByText(/rayon de 25 km/)).toBeTruthy();
  });
  it("mission proche : date avec l'année", () => {
    wrap(<OwnerEntraideBandView helpersCount={1} helpersRadiusKm={30} exchanges={[]} mission={{ id: "x", title: "Sortir le chien", city: "lyon", date_needed: "2026-10-04" }} />);
    expect(screen.getByText("Lyon · 4 octobre 2026")).toBeTruthy();
    expect(screen.getByText("1 personne est prête à aider à moins de 30 km.")).toBeTruthy();
  });
});
