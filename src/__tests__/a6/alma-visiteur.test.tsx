/**
 * Lot A6 (14/10/2026) : la bulle visiteur mène à l'inscription, l'annonce en
 * un bouton.
 *
 * Recette :
 *  - en visiteur, le clic mène à /inscription avec la redirection (lue par
 *    Register via sanitizeRedirect) ;
 *  - aucun appel à la fonction d'alerte pour un visiteur ;
 *  - en mode France entière, pas d'« Élargir » ;
 *  - le tableau de bord propriétaire montre le bouton et plus le champ.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

const rpcMock = vi.fn(async () => ({ data: null, error: null }));
const fromMock = vi.fn(() => {
  throw new Error("aucune lecture attendue");
});
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpcMock(...(a as [])), from: (...a: unknown[]) => fromMock(...(a as [])) },
}));

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(async () => undefined) }));

vi.mock("@/hooks/useAlmaFrequency", () => ({
  useAlmaFrequency: () => ({ frequency: "balanced", loading: false, setFrequency: vi.fn() }),
}));

vi.mock("@/hooks/useViewerOwnerForAffinity", () => ({
  useViewerOwnerForAffinity: () => ({ owner: null }),
}));
vi.mock("@/hooks/useImpressionOnce", () => ({ useImpressionOnce: () => undefined }));

import { trackEvent } from "@/lib/analytics";
import { AlmaEmptySearchBubble } from "@/components/ai/alma/AlmaEmptySearchBubble";
import AlmaWhisperCard from "@/components/profile/AlmaWhisperCard";
import OwnerStarSection from "@/components/dashboard/owner/OwnerStarSection";
import { useSearchAlert } from "@/hooks/search/useSearchAlert";
import { sanitizeRedirect } from "@/lib/safeRedirect";
import {
  canExpandToRegion,
  profileSignupHref,
  shouldResumeVisitorAlert,
  visitorSearchRedirect,
  visitorSectorSignupUrl,
  VISITOR_OWNER_PUBLISH_SIGNUP_URL,
} from "@/lib/almaVisitorSearch";

const LocationProbe = () => {
  const loc = useLocation();
  return <p data-testid="where">{`${loc.pathname}${loc.search}`}</p>;
};

const withRouter = (ui: ReactNode, initial = "/annonces?ville=Lyon") => (
  <MemoryRouter initialEntries={[initial]}>
    <Routes>
      <Route path="/annonces" element={ui} />
      <Route path="/dashboard" element={ui} />
      <Route path="/gardiens/:id" element={ui} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>
);

const baseBubble = {
  hasFilters: false,
  radius: 15,
  zoneMode: "radius" as const,
  activeFilters: {},
  onExpandToRegion: vi.fn(),
  onOpenAlert: vi.fn(),
  onRelaxFilter: vi.fn(),
};

const redirectOf = (href: string) => sanitizeRedirect(new URL(href, "https://guardiens.fr").searchParams.get("redirect"));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("A6 · adresses d'inscription", () => {
  it("la recherche courante revient après l'inscription, zone et reprise d'alerte comprises", () => {
    const path = visitorSearchRedirect("/annonces", "?ville=Lyon&rayon=30", "dept");
    expect(path).toBe("/annonces?ville=Lyon&rayon=30&zone=dept&alerte=1");
    const href = visitorSectorSignupUrl(path);
    expect(href.startsWith("/inscription?role=sitter&redirect=")).toBe(true);
    // Register lit ?redirect= par sanitizeRedirect : la recherche est retrouvée telle quelle.
    expect(redirectOf(href)).toBe(path);
  });

  it("la zone rayon n'est pas recopiée", () => {
    expect(visitorSearchRedirect("/annonces", "", "radius")).toBe("/annonces?alerte=1");
  });

  it("« Vous partez ? » mène à l'inscription propriétaire vers /sits/create", () => {
    const url = new URL(VISITOR_OWNER_PUBLISH_SIGNUP_URL, "https://guardiens.fr");
    expect(url.pathname).toBe("/inscription");
    expect(url.searchParams.get("role")).toBe("owner");
    expect(redirectOf(VISITOR_OWNER_PUBLISH_SIGNUP_URL)).toBe("/sits/create");
  });

  it("« Élargir à la région » réservé au rayon et au département", () => {
    expect(canExpandToRegion("radius")).toBe(true);
    expect(canExpandToRegion("dept")).toBe(true);
    expect(canExpandToRegion("region")).toBe(false);
    expect(canExpandToRegion("france")).toBe(false);
  });

  it("au retour, l'alerte n'est reprise que pour un membre avec une zone exploitable", () => {
    expect(shouldResumeVisitorAlert({ isMember: false, alertParam: "1", zoneMode: "radius", city: "Lyon" })).toBe(false);
    expect(shouldResumeVisitorAlert({ isMember: true, alertParam: null, zoneMode: "radius", city: "Lyon" })).toBe(false);
    expect(shouldResumeVisitorAlert({ isMember: true, alertParam: "1", zoneMode: "radius", city: "" })).toBe(false);
    expect(shouldResumeVisitorAlert({ isMember: true, alertParam: "1", zoneMode: "radius", city: "Lyon" })).toBe(true);
    expect(shouldResumeVisitorAlert({ isMember: true, alertParam: "1", zoneMode: "france", city: "" })).toBe(true);
  });
});

describe("A6 · bulle recherche vide, visiteur", () => {
  const visitorPath = visitorSearchRedirect("/annonces", "?ville=Lyon", "radius");

  it("propose l'inscription à la place de l'alerte", () => {
    render(withRouter(<AlmaEmptySearchBubble {...baseBubble} isVisitor visitorSearchPath={visitorPath} />));
    expect(screen.queryByRole("button", { name: /créer une alerte/i })).toBeNull();
    const sector = screen.getByRole("link", { name: "Recevoir les annonces de ce secteur" });
    expect(redirectOf(sector.getAttribute("href")!)).toBe(visitorPath);
    const publish = screen.getByRole("link", { name: "Vous partez ? Publiez votre annonce" });
    expect(publish.getAttribute("href")).toBe(VISITOR_OWNER_PUBLISH_SIGNUP_URL);
  });

  it("le clic mène à /inscription avec la redirection, mesuré avec is_visitor, sans alerte", () => {
    render(withRouter(<AlmaEmptySearchBubble {...baseBubble} isVisitor visitorSearchPath={visitorPath} />));
    fireEvent.click(screen.getByRole("link", { name: "Recevoir les annonces de ce secteur" }));
    const where = screen.getByTestId("where").textContent!;
    expect(where.startsWith("/inscription?role=sitter&redirect=")).toBe(true);
    expect(redirectOf(where)).toBe(visitorPath);
    expect(baseBubble.onOpenAlert).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith(
      "alma_empty_search_action_clicked",
      expect.objectContaining({
        metadata: expect.objectContaining({ action_id: "signup_sector_alerts", is_visitor: true }),
      }),
    );
  });

  it("« Vous partez ? » mène à l'inscription propriétaire", () => {
    render(withRouter(<AlmaEmptySearchBubble {...baseBubble} isVisitor visitorSearchPath={visitorPath} />));
    fireEvent.click(screen.getByRole("link", { name: "Vous partez ? Publiez votre annonce" }));
    const where = screen.getByTestId("where").textContent!;
    expect(where.startsWith("/inscription?role=owner&redirect=")).toBe(true);
    expect(redirectOf(where)).toBe("/sits/create");
    expect(trackEvent).toHaveBeenCalledWith(
      "alma_empty_search_action_clicked",
      expect.objectContaining({ metadata: expect.objectContaining({ action_id: "signup_publish", is_visitor: true }) }),
    );
  });

  it("l'affichage porte is_visitor", () => {
    render(withRouter(<AlmaEmptySearchBubble {...baseBubble} isVisitor visitorSearchPath={visitorPath} />));
    expect(trackEvent).toHaveBeenCalledWith(
      "alma_empty_search_bubble_seen",
      expect.objectContaining({ metadata: expect.objectContaining({ is_visitor: true }) }),
    );
  });

  it("en mode France entière, pas d'« Élargir »", () => {
    render(withRouter(<AlmaEmptySearchBubble {...baseBubble} zoneMode="france" isVisitor visitorSearchPath={visitorPath} />));
    expect(screen.queryByText(/élargir à la région/i)).toBeNull();
  });

  it("textes sans tiret long ni négation d'usage", () => {
    render(withRouter(<AlmaEmptySearchBubble {...baseBubble} isVisitor visitorSearchPath={visitorPath} />));
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/[–—]/);
    expect(text).toMatch(/gardiens à proximité/);
  });
});

describe("A6 · bulle recherche vide, membre", () => {
  it("garde « Créer une alerte » et l'appel existant", () => {
    render(withRouter(<AlmaEmptySearchBubble {...baseBubble} />));
    fireEvent.click(screen.getByRole("button", { name: /créer une alerte/i }));
    expect(baseBubble.onOpenAlert).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /élargir à la région/i })).toBeTruthy();
    expect(trackEvent).toHaveBeenCalledWith(
      "alma_empty_search_action_clicked",
      expect.objectContaining({ metadata: expect.objectContaining({ action_id: "activate_alert", is_visitor: false }) }),
    );
  });

  it("en mode France entière, pas d'« Élargir »", () => {
    render(withRouter(<AlmaEmptySearchBubble {...baseBubble} zoneMode="france" />));
    expect(screen.queryByText(/élargir à la région/i)).toBeNull();
    expect(screen.getByRole("button", { name: /créer une alerte/i })).toBeTruthy();
  });
});

describe("A6 · useSearchAlert, visiteur", () => {
  it("aucun appel d'alerte ni toast : départ vers l'inscription", async () => {
    const signup = visitorSectorSignupUrl(visitorSearchRedirect("/annonces", "?ville=Lyon", "radius"));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/annonces?ville=Lyon"]}>{children}</MemoryRouter>
    );
    for (const zoneMode of ["radius", "dept", "france"] as const) {
      const { result } = renderHook(
        () =>
          useSearchAlert({
            city: "Lyon",
            cityPostalCode: "69001",
            radius: [15],
            setRadius: vi.fn(),
            zoneMode,
            resetKeys: [],
            visitorSignupUrl: signup,
          }),
        { wrapper },
      );
      await act(async () => {
        await result.current.handleCreateAlert();
      });
    }
    expect(rpcMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("membre : l'appel d'alerte reste inchangé", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
    const { result } = renderHook(
      () => useSearchAlert({ city: "Lyon", cityPostalCode: "69001", radius: [15], setRadius: vi.fn(), resetKeys: [] }),
      { wrapper },
    );
    await act(async () => {
      await result.current.handleCreateAlert();
    });
    expect(rpcMock).toHaveBeenCalledWith("create_alert_from_search", expect.objectContaining({ p_city: "Lyon" }));
  });

  it("SearchSitter transmet l'inscription au hook et la recherche à la bulle", () => {
    const src = readFileSync("src/components/search/SearchSitter.tsx", "utf8");
    expect(src).toMatch(/visitorSignupUrl: isVisitor \? visitorSectorSignupUrl\(visitorSearchPath\) : null/);
    expect(src).toMatch(/isVisitor=\{isVisitor\}/);
    expect(src).toMatch(/visitorSearchPath=\{visitorSearchPath\}/);
    expect(src).toMatch(/const isVisitor = !user && !authLoading/);
  });
});

describe("A6 · carte Alma des profils publics", () => {
  it("visiteur : lien vers l'inscription avec retour au profil, mesuré", () => {
    const href = profileSignupHref("owner", "/gardiens/abc?tab=gardien");
    render(
      withRouter(
        <AlmaWhisperCard phrase="Léa est disponible." signupHref={href} actionLabel="Créer mon compte pour écrire à Léa" surface="gardien" />,
        "/gardiens/abc?tab=gardien",
      ),
    );
    const link = screen.getByRole("link", { name: /Créer mon compte pour écrire à Léa/ });
    fireEvent.click(link);
    const where = screen.getByTestId("where").textContent!;
    expect(where.startsWith("/inscription?role=owner&redirect=")).toBe(true);
    expect(redirectOf(where)).toBe("/gardiens/abc?tab=gardien");
    expect(trackEvent).toHaveBeenCalledWith(
      "alma_whisper_card_clicked",
      expect.objectContaining({ metadata: expect.objectContaining({ is_visitor: true, surface: "gardien" }) }),
    );
  });

  it("membre : carte de lecture, sans bouton mort", () => {
    render(withRouter(<AlmaWhisperCard phrase="Léa est disponible." />, "/gardiens/abc"));
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Parler à Alma")).toBeNull();
    expect(screen.getByTestId("alma-whisper-card")).toBeTruthy();
  });

  it("le profil public passe l'inscription au visiteur seulement", () => {
    const src = readFileSync("src/pages/PublicSitterProfile.tsx", "utf8");
    expect(src.match(/signupHref=\{!isAuthenticated && !hasSession \? profileSignupHref\(/g)?.length).toBe(2);
    expect(readFileSync("src/components/profile/AlmaWhisperCard.tsx", "utf8")).not.toMatch(/openAlmaDock/);
  });
});

describe("A6 · tableau de bord propriétaire", () => {
  const starProps = {
    ongoingSit: null,
    pendingApps: [],
    sitterProfiles: {},
    latestDraft: null,
    primaryAction: { action: "create_first_sit" as const, draftId: null },
  };

  it("montre le bouton « Publier mon annonce de garde » et plus le champ", () => {
    render(withRouter(<OwnerStarSection {...starProps} />, "/dashboard"));
    const cta = screen.getByRole("link", { name: "Publier mon annonce de garde" });
    expect(cta.getAttribute("href")).toBe("/sits/create");
    expect(document.querySelector("textarea")).toBeNull();
    expect(screen.queryByTestId("sit-draft-star")).toBeNull();
    expect(screen.queryByText(/Décrivez votre absence/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/[–—]/);
  });

  it("le clic est mesuré avec sa source", () => {
    render(withRouter(<OwnerStarSection {...starProps} />, "/dashboard"));
    fireEvent.click(screen.getByRole("link", { name: "Publier mon annonce de garde" }));
    expect(screen.getByTestId("where").textContent).toBe("/sits/create");
    expect(trackEvent).toHaveBeenCalledWith(
      "owner_publish_cta_clicked",
      expect.objectContaining({ source: "owner_dashboard_star" }),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      "dashboard_star_cta_clicked",
      expect.objectContaining({ metadata: expect.objectContaining({ variant: "publish" }) }),
    );
  });

  it("le composant SitDraftFromPrompt reste dans le dépôt, démonté", () => {
    expect(existsSync("src/components/dashboard/SitDraftFromPrompt.tsx")).toBe(true);
    const star = readFileSync("src/components/dashboard/owner/OwnerStarSection.tsx", "utf8");
    expect(star).not.toMatch(/import SitDraftFromPrompt/);
    expect(star).not.toMatch(/<SitDraftFromPrompt/);
  });
});
