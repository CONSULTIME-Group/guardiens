/**
 * Verrous d'OwnerSitterSpotlight (fusion des sections gardiens, 25/08/2026).
 *
 * Doctrine verrouillée ici :
 *  1. L'onglet par défaut est « Pour vous » (affinité), toujours.
 *  2. Le badge de comptage du vivier proche n'apparaît que sur l'onglet
 *     inactif, jamais pendant le chargement, jamais à zéro.
 *  3. Les deux panneaux sont montés dès le premier rendu (attribut hidden,
 *     jamais de rendu conditionnel) : changer d'onglet est instantané et ne
 *     déclenche AUCUN nouvel appel réseau.
 *  4. OwnerDashboard.tsx ne référence plus les deux anciens composants.
 *
 * Les assertions jouent sur le rendu réel (hooks mockés, panneaux réels) et
 * sur la structure statique du composant (readFileSync), sans affaiblir les
 * verrous existants de top3-trust-policy.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Mocks contrôlables (vi.hoisted : accessibles dans les factories) ─────
const mocks = vi.hoisted(() => ({
  topAffinity: vi.fn(),
  nearby: vi.fn(),
  supabaseFrom: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "owner-1" } }),
}));
vi.mock("@/hooks/useOwnerTopAffinitySitters", () => ({
  useOwnerTopAffinitySitters: mocks.topAffinity,
}));
vi.mock("@/hooks/useNearbyOwnerSitters", () => ({
  useNearbyOwnerSitters: mocks.nearby,
}));
vi.mock("@/hooks/useOwnerProfile", () => ({
  useOwnerProfile: () => ({ data: { city: "Lyon" } }),
}));
vi.mock("@/lib/analytics", () => ({
  trackEvent: mocks.trackEvent,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.supabaseFrom },
}));
// La chip d'affinité réciproque n'est pas l'objet du test, et ses hooks
// internes exigeraient un setup supplémentaire sans gain de couverture.
vi.mock("@/components/matching/OwnerToSitterAffinity", () => ({
  default: () => null,
}));

import OwnerSitterSpotlight from "@/components/dashboard/owner/OwnerSitterSpotlight";

// ─── Fixtures ─────────────────────────────────────────────────────────────
const affinitySitter = {
  id: "sitter-affinity-1",
  first_name: "Marc",
  city: "Lyon",
  avatar_url: null,
  distance_km: 5,
  identity_verified: true,
  affinity: { score: 80, sortScore: 72, matched: [], matchedDetailed: [] },
};

const nearbySitter = {
  id: "sitter-nearby-1",
  first_name: "Claire",
  city: "Lyon",
  avatar_url: null,
  distance_km: 2.4,
  identity_verified: true,
  completed_sits_count: 3,
  skill_categories: [],
  custom_skills: ["Transport"],
  is_beyond: false,
  avg_rating: 4.5,
};

const NEARBY_TOTAL = 42;

const setupLoaded = () => {
  mocks.topAffinity.mockReturnValue({
    topSitters: [affinitySitter],
    totalPool: 12,
    scoredCount: 12,
    hasGeo: true,
    isLoading: false,
  });
  mocks.nearby.mockReturnValue({
    data: {
      sitters: [nearbySitter],
      radiusUsed: 30,
      hasGeo: true,
      totalCount: NEARBY_TOTAL,
    },
    isLoading: false,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.supabaseFrom.mockReturnValue({
    select: () => ({ in: () => Promise.resolve({ data: [] }) }),
  });
  mocks.trackEvent.mockResolvedValue(undefined);
  setupLoaded();
});

const renderSpotlight = () =>
  render(
    <MemoryRouter>
      <OwnerSitterSpotlight />
    </MemoryRouter>,
  );

// ─── 1. Onglet par défaut ────────────────────────────────────────────────
describe("OwnerSitterSpotlight, onglet par défaut", () => {
  it("« Pour vous » est sélectionné au chargement, « Près de chez vous » ne l'est pas", () => {
    renderSpotlight();
    const tabPourVous = screen.getByRole("tab", { name: "Pour vous" });
    const tabProches = screen.getByRole("tab", { name: /Près de chez vous/ });
    expect(tabPourVous.getAttribute("aria-selected")).toBe("true");
    expect(tabProches.getAttribute("aria-selected")).toBe("false");
  });

  it("le panneau affinité est visible, le panneau proximité est monté mais masqué", () => {
    renderSpotlight();
    const panelPourVous = document.getElementById("owner-spotlight-panel-pour-vous");
    const panelProches = document.getElementById("owner-spotlight-panel-proches");
    expect(panelPourVous?.getAttribute("hidden")).toBeNull();
    expect(panelProches?.getAttribute("hidden")).not.toBeNull();
    // Preuve du montage parallèle : le contenu du panneau masqué existe déjà
    // dans le DOM (aucun lazy-fetch ne sera nécessaire au changement d'onglet).
    expect(within(panelProches as HTMLElement).getByText("Claire")).toBeTruthy();
    expect(within(panelPourVous as HTMLElement).getByText("Marc")).toBeTruthy();
  });
});

// ─── 2. Badge de comptage ────────────────────────────────────────────────
describe("OwnerSitterSpotlight, badge du vivier proche", () => {
  it("le badge affiche le total réel sur l'onglet inactif, puis disparaît quand on l'ouvre", () => {
    renderSpotlight();
    const tabProches = screen.getByRole("tab", { name: /Près de chez vous/ });
    // Onglet inactif au chargement : badge visible avec le nombre réel.
    expect(within(tabProches).getByText(String(NEARBY_TOTAL))).toBeTruthy();

    fireEvent.click(tabProches);
    // Onglet désormais actif : le badge n'a plus de raison d'être.
    expect(within(tabProches).queryByText(String(NEARBY_TOTAL))).toBeNull();
    expect(tabProches.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Pour vous" }).getAttribute("aria-selected")).toBe("false");
  });

  it("aucun badge pendant le chargement du vivier proche, et aucun en-tête orphelin", () => {
    mocks.nearby.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderSpotlight();
    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText("Les gardiens")).toBeNull();
  });

  it("aucun badge quand le vivier proche est vide", () => {
    mocks.nearby.mockReturnValue({
      data: { sitters: [], radiusUsed: null, hasGeo: true, totalCount: 0 },
      isLoading: false,
    });
    renderSpotlight();
    const tabProches = screen.getByRole("tab", { name: /Près de chez vous/ });
    expect(tabProches.textContent).toBe("Près de chez vous");
  });
});

// ─── 3. Aucun refetch au changement d'onglet ─────────────────────────────
describe("OwnerSitterSpotlight, montage parallèle des deux viviers", () => {
  it("les deux hooks sont appelés dès le premier rendu, avant tout clic", () => {
    renderSpotlight();
    expect(mocks.topAffinity).toHaveBeenCalled();
    expect(mocks.nearby).toHaveBeenCalled();
  });

  it("changer d'onglet ne déclenche aucun nouvel appel réseau", async () => {
    renderSpotlight();
    // Effet du panneau proximité flushé (fetch sitter_profiles_affinity).
    await waitFor(() => expect(mocks.supabaseFrom).toHaveBeenCalled());
    const callsBefore = mocks.supabaseFrom.mock.calls.length;

    fireEvent.click(screen.getByRole("tab", { name: /Près de chez vous/ }));
    const panelProches = document.getElementById("owner-spotlight-panel-proches");
    expect(panelProches?.getAttribute("hidden")).toBeNull();
    expect(mocks.supabaseFrom.mock.calls.length).toBe(callsBefore);

    fireEvent.click(screen.getByRole("tab", { name: "Pour vous" }));
    expect(mocks.supabaseFrom.mock.calls.length).toBe(callsBefore);
  });
});

// ─── 4. Structure statique verrouillée ───────────────────────────────────
const spotlightSrc = readFileSync(
  resolve(__dirname, "../components/dashboard/owner/OwnerSitterSpotlight.tsx"),
  "utf8",
);
const dashboardSrc = readFileSync(
  resolve(__dirname, "../components/dashboard/OwnerDashboard.tsx"),
  "utf8",
);

describe("OwnerSitterSpotlight, structure statique", () => {
  it("l'onglet par défaut est « Pour vous » dans le code", () => {
    expect(spotlightSrc).toContain('useState<TabId>("pour-vous")');
  });

  it("les panneaux sont masqués par attribut hidden, jamais démontés", () => {
    expect(spotlightSrc).toContain('hidden={activeTab !== "pour-vous"}');
    expect(spotlightSrc).toContain('hidden={activeTab !== "proches"}');
    // Aucun rendu conditionnel des panneaux.
    expect(spotlightSrc).not.toMatch(/activeTab === "pour-vous"\s*&&\s*<SpotlightForYouPanel/);
    expect(spotlightSrc).not.toMatch(/activeTab === "proches"\s*&&\s*<SpotlightNearbyPanel/);
  });

  it("le badge est conditionné à l'onglet inactif et à la fin du chargement", () => {
    expect(spotlightSrc).toContain('activeTab !== "proches"');
    expect(spotlightSrc).toContain("!nearbyIsLoading");
    expect(spotlightSrc).toContain("nearbyTotal > 0");
  });

  it("OwnerDashboard ne référence plus les deux anciens composants", () => {
    expect(dashboardSrc).not.toContain("OwnerFirstNBAGardiens");
    expect(dashboardSrc).not.toContain("NearbySittersSection");
    expect(dashboardSrc).toContain("OwnerSitterSpotlight");
    // Une seule occurrence de rendu : la section fusionnée est unique.
    const renders = dashboardSrc.split("<OwnerSitterSpotlight").length - 1;
    expect(renders).toBe(1);
  });
});

// ─── 5. États de bord (26/08/2026) ───────────────────────────────────────
describe("OwnerSitterSpotlight, états de bord", () => {
  it("vivier proche chargé et vide : l'onglet reste cliquable et son panneau raconte la situation", () => {
    mocks.nearby.mockReturnValue({
      data: { sitters: [], radiusUsed: null, hasGeo: true, totalCount: 0 },
      isLoading: false,
    });
    renderSpotlight();

    const tabProches = screen.getByRole("tab", { name: /Près de chez vous/ });
    expect(tabProches).toBeTruthy();
    fireEvent.click(tabProches);
    expect(tabProches.getAttribute("aria-selected")).toBe("true");

    const panelProches = document.getElementById("owner-spotlight-panel-proches") as HTMLElement;
    expect(panelProches.getAttribute("hidden")).toBeNull();
    // Pas un panneau blanc : un état vide avec porte de sortie.
    expect(panelProches.textContent).toContain("Votre secteur se remplit encore.");
    expect(within(panelProches).getByText("Voir tous les gardiens")).toBeTruthy();
    expect(within(panelProches).getByText("Parrainer un proche gardien")).toBeTruthy();
  });

  it("les deux viviers en chargement : aucun en-tête orphelin, rien n'est rendu", () => {
    mocks.topAffinity.mockReturnValue({
      topSitters: [],
      totalPool: 0,
      scoredCount: 0,
      hasGeo: false,
      isLoading: true,
    });
    mocks.nearby.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderSpotlight();

    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText("Les gardiens")).toBeNull();
  });

  it("vivier d'affinité prêt mais proximité en chargement : aucun rendu partiel", () => {
    mocks.topAffinity.mockReturnValue({
      topSitters: [affinitySitter],
      totalPool: 12,
      scoredCount: 12,
      hasGeo: true,
      isLoading: false,
    });
    mocks.nearby.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderSpotlight();

    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText("Les gardiens")).toBeNull();
    expect(screen.queryByText("Marc")).toBeNull();
  });

  it("vivier de proximité prêt mais affinité en chargement : aucun rendu partiel", () => {
    mocks.topAffinity.mockReturnValue({
      topSitters: [],
      totalPool: 0,
      scoredCount: 0,
      hasGeo: false,
      isLoading: true,
    });
    mocks.nearby.mockReturnValue({
      data: { sitters: [nearbySitter], radiusUsed: 30, hasGeo: true, totalCount: NEARBY_TOTAL },
      isLoading: false,
    });
    const { container } = renderSpotlight();

    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText("Les gardiens")).toBeNull();
    expect(screen.queryByText("Claire")).toBeNull();
  });
});

// ─── 6. Typographie de marque ────────────────────────────────────────────
const forYouSrc = readFileSync(
  resolve(__dirname, "../components/dashboard/owner/SpotlightForYouPanel.tsx"),
  "utf8",
);
const nearbySrc = readFileSync(
  resolve(__dirname, "../components/dashboard/owner/SpotlightNearbyPanel.tsx"),
  "utf8",
);
const sectionHeaderSrc = readFileSync(
  resolve(__dirname, "../components/dashboard/sitter/SitterMatchSection.tsx"),
  "utf8",
);

describe("OwnerSitterSpotlight, typographie de marque", () => {
  it("aucun font-serif dans les trois fichiers du spotlight", () => {
    // font-serif n'existe pas dans tailwind.config.ts : il retomberait sur
    // Georgia, pas sur Playfair. Seul font-heading est légitime.
    expect(spotlightSrc).not.toContain("font-serif");
    expect(forYouSrc).not.toContain("font-serif");
    expect(nearbySrc).not.toContain("font-serif");
  });

  it("le panneau proximité utilise l'en-tête signature SectionHeader", () => {
    expect(nearbySrc).toContain("SectionHeader");
    expect(nearbySrc).toContain('eyebrow="Les gens du coin"');
    expect(nearbySrc).toContain('title="Ils sont prêts à garder près de chez vous."');
  });
});

// ─── 7. Hiérarchie de titres ─────────────────────────────────────────────
describe("OwnerSitterSpotlight, hiérarchie de titres", () => {
  it("SectionHeader conserve h2 par défaut pour les appels existants", () => {
    expect(sectionHeaderSrc).toContain('as?: "h2" | "h3"');
    expect(sectionHeaderSrc).toContain('as: Heading = "h2"');
  });

  it("les deux panneaux du spotlight demandent explicitement un titre de niveau 3", () => {
    expect(forYouSrc).toContain('as="h3"');
    expect(nearbySrc).toContain('as="h3"');
  });

  it("au rendu, le titre de section reste h2 et les titres de panneaux sont des h3", () => {
    renderSpotlight();
    const headings = screen.getAllByRole("heading");
    const h2 = headings.filter((h) => h.tagName === "H2").map((h) => h.textContent);
    const h3 = headings.filter((h) => h.tagName === "H3").map((h) => h.textContent);
    expect(h2).toContain("Les gardiens");
    expect(h3.some((t) => t?.includes("Pour vous") || t?.includes("gardien"))).toBe(true);
    expect(
      h3.some((t) =>
        t?.includes("Les gens du coin") ||
        t?.includes("près de chez vous"),
      ),
    ).toBe(true);
  });
});
