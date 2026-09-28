/**
 * Lot D2, refonte du tableau de bord gardien : gardes de composition et
 * rendus de l'accueil, de la vedette, de l'encart unique et du bandeau entraide.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AffinitySitCard } from "@/hooks/useSitterTopAffinitySits";
import type { AffinityResult } from "@/lib/affinityScore";

const missing = { items: [] as any[] };
vi.mock("@/hooks/useSitterMissingOpportunities", () => ({ useSitterMissingOpportunities: () => ({}) }));
vi.mock("@/lib/missingOpportunities", () => ({ pickMissingOpportunities: () => missing.items }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

import SitterCockpit from "@/components/dashboard/sitter/SitterCockpit";
import SitterMatchSection from "@/components/dashboard/sitter/SitterMatchSection";
import SitterMissingOpportunities from "@/components/dashboard/sitter/SitterMissingOpportunities";
import { OwnerEntraideBandView } from "@/components/dashboard/owner/OwnerEntraideBand";
import { SITTER_ENTRAIDE_HEADLINE } from "@/components/dashboard/SitterDashboard";
import { sitterDigestLine } from "@/hooks/useOwnerDigestLine";

const src = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf8");
const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

const aff = (total: number, score = 82, matched = ["Chiens dans son expérience", "Présence en journée", "Langue commune", "Jardin"]): AffinityResult => ({
  score, total, matched, matchedDetailed: [], explanation: [], notes: [], displayed: true, hiddenReason: null,
  scoreReliable: true, hasDeclaredIncompatibility: false, distributable: true, confidence: 1, sortScore: score,
});
const sit = (over: Partial<AffinitySitCard>): AffinitySitCard => ({
  id: "s", title: "Garde", city: "gex", start_date: "2027-08-13", end_date: "2027-08-30",
  cover_photo_url: null, pet_photo_url: null, owner_first_name: "Jennifer", pet_species: ["dog"],
  affinity: null, distance_km: null, environments: [], ...over,
});

describe("SitterDashboard, composition lot D2", () => {
  const dash = src("components/dashboard/SitterDashboard.tsx");
  it.each([
    "HelpsWithReminder", "MutualAidRadiusLine", "MesCoupsDeMain", "CommunityPulseBanner",
    "PetAdviceSection", "SitterStoryTiles", "FreePeriodBanner", "NearbyAssociationCard", "SitterEntraideSection",
  ])("ne rend plus <%s>", (name) => {
    expect(dash).not.toMatch(new RegExp(`<${name}[\\s/>]`));
  });
  it("garde RoleActivationBanner et AlmaFirstMeeting conditionnel", () => {
    expect(dash).toContain("<RoleActivationBanner");
    expect(dash).toMatch(/showAlmaFirstMeeting && \(/);
  });
  it("utilise le bandeau entraide partagé avec la phrase gardien", () => {
    expect(dash).toContain("<OwnerEntraideBand");
    expect(dash).toContain("headline={SITTER_ENTRAIDE_HEADLINE}");
  });
  it("AccessGateBanner seulement si le niveau d'accès est incomplet", () => {
    expect(dash).toMatch(/showAccessGate && \(\s*<AccessGateBanner/);
  });
});

describe("Accueil gardien", () => {
  it("gouache pleine : ni illustration-blend, ni opacité, ni voile", () => {
    const cockpitSrc = src("components/dashboard/sitter/SitterCockpit.tsx");
    expect(cockpitSrc).not.toMatch(/illustration-blend|opacity|gradient|mask-image|notebook-card/);
    wrap(<SitterCockpit firstName="ingrid" isAvailable hour={9} />);
    const img = screen.getByTestId("sitter-cockpit-gouache");
    expect(img.className).not.toMatch(/opacity|blend/);
    expect(img.getAttribute("src")).toContain("sitter-cockpit-morning");
    expect(img.parentElement?.children).toHaveLength(1);
  });
  it("sans signal ni action : titre selon l'heure, pas de ligne, pas de rangée", () => {
    wrap(<SitterCockpit firstName="ingrid" isAvailable={false} hour={20} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bonsoir, Ingrid.");
    expect(screen.queryByTestId("sitter-cockpit-line")).toBeNull();
    expect(screen.queryByTestId("sitter-cockpit-todos")).toBeNull();
    expect(screen.getByText("Indisponible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modifier" }).getAttribute("href")).toBe("/profile?section=profil");
    expect(screen.getByTestId("sitter-cockpit-gouache").getAttribute("src")).toContain("sitter-match-empty");
  });
  it("branche nouveau gardien : « Bienvenue »", () => {
    wrap(<SitterCockpit firstName="ingrid" isAvailable greeting="Bienvenue" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bienvenue, Ingrid.");
  });
  it("avec prochaine garde : ligne et lien « Préparer »", () => {
    wrap(
      <SitterCockpit
        firstName="ingrid"
        isAvailable
        line={{ text: "Votre prochaine garde : du 13 au 30 août 2027, à Chassenard.", link: { label: "Préparer", to: "/sits/g1" } }}
      />,
    );
    expect(screen.getByTestId("sitter-cockpit-line").textContent).toContain("du 13 au 30 août 2027, à Chassenard.");
    expect(screen.getByRole("link", { name: "Préparer" }).getAttribute("href")).toBe("/sits/g1");
  });
  it("avec digest : phrase exacte au singulier et au pluriel", () => {
    expect(sitterDigestLine({ new_sits_nearby: 1 })).toBe("1 nouvelle garde près de chez vous depuis votre dernière visite.");
    expect(sitterDigestLine({ new_sits_nearby: 4 })).toBe("4 nouvelles gardes près de chez vous depuis votre dernière visite.");
    expect(sitterDigestLine({ new_sits_nearby: 0 })).toBeNull();
    expect(sitterDigestLine({ new_sits_nearby: 3, is_first_visit: true })).toBeNull();
  });
  it("avec actions : 3 pastilles au plus, dans l'ordre", () => {
    wrap(
      <SitterCockpit
        firstName="ingrid"
        isAvailable
        todos={[
          { key: "apps", label: "Candidatures en attente de réponse", to: "/sits", count: 2 },
          { key: "messages", label: "Messages à lire", to: "/messages", count: 1 },
          { key: "postal", label: "Votre code postal", to: "/profile?focus=postal_code" },
          { key: "helps", label: "Votre phrase d'entraide", to: "/ma-ligne" },
        ]}
      />,
    );
    const links = screen.getByTestId("sitter-cockpit-todos").querySelectorAll("a");
    expect(links).toHaveLength(3);
    expect(links[2].textContent).toBe("Votre code postal");
  });
});

describe("Vedette gardien", () => {
  const trio = [
    sit({ id: "a", title: "Garde à Gex", affinity: aff(6) }),
    sit({ id: "b", title: "Garde à Chassenard", city: "CHASSENARD", distance_km: 12.4, affinity: aff(5, 71) }),
    sit({ id: "c", title: "Garde à Lyon", affinity: aff(2, 90) }),
  ];
  it("une seule carte vedette, puis « Aussi pour vous » en lignes", () => {
    wrap(<SitterMatchSection topSits={trio} fallbackSits={[]} rankingSource="distance" isLoading={false} totalPublished={11} />);
    expect(screen.getAllByTestId("sitter-star-card")).toHaveLength(1);
    expect(screen.getByText("Aussi pour vous")).toBeInTheDocument();
    expect(screen.getByText("Une garde faite pour vous")).toBeInTheDocument();
    expect(screen.getByText("Affinité calculée sur 6 critères comparés entre vos deux profils.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les 11 gardes disponibles" })).toBeInTheDocument();
  });
  it("3 raisons au plus, issues du calcul", () => {
    wrap(<SitterMatchSection topSits={trio} fallbackSits={[]} rankingSource="distance" isLoading={false} />);
    const card = screen.getByTestId("sitter-star-card");
    expect(card.querySelectorAll("li")).toHaveLength(3);
    expect(card.textContent).not.toContain("Jardin");
  });
  it("« Aussi pour vous » affiche l'année (garde de Chassenard)", () => {
    wrap(<SitterMatchSection topSits={trio} fallbackSits={[]} rankingSource="distance" isLoading={false} />);
    const row = screen.getByText("Garde à Chassenard").closest("a")!;
    expect(row.textContent).toContain("Chassenard · du 13 au 30 août 2027 · 12 km");
  });
  it("pas de pourcentage sous 4 critères comparés", () => {
    wrap(<SitterMatchSection topSits={[sit({ id: "z", title: "Peu de critères", affinity: aff(3) }), trio[2]]} fallbackSits={[]} rankingSource="distance" isLoading={false} />);
    expect(screen.queryByTestId("sitter-star-ring")).toBeNull();
    expect(screen.queryByText(/Affinité calculée/)).toBeNull();
    expect(screen.getByText("Garde à Lyon").closest("a")!.textContent).not.toMatch(/%/);
  });
  it("nouveau gardien : aucune carte vedette, trois lignes « Des gardes pour vous »", () => {
    wrap(<SitterMatchSection topSits={trio} fallbackSits={[]} rankingSource="distance" isLoading={false} layout="rows" totalPublished={3} />);
    expect(screen.queryByTestId("sitter-star-card")).toBeNull();
    expect(screen.getByText("Des gardes pour vous")).toBeInTheDocument();
    expect(screen.getByTestId("sitter-sit-rows").querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Voir les 3 gardes disponibles" })).toBeInTheDocument();
  });
});

describe("Encart unique sous « Aussi pour vous »", () => {
  beforeEach(() => { missing.items = []; });
  it("sans occasion manquée : invitation à élargir la zone, compte réel", () => {
    wrap(<SitterMissingOpportunities fallbackTotalPublished={11} />);
    expect(screen.getByText("Recevez les nouvelles gardes en premier.")).toBeInTheDocument();
    expect(screen.getByText(/^11 gardes sont publiées en ce moment\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Élargir ma zone" }).getAttribute("href")).toBe("/mon-secteur");
  });
  it("singulier : « 1 garde est publiée en ce moment. »", () => {
    wrap(<SitterMissingOpportunities fallbackTotalPublished={1} />);
    expect(screen.getByText(/^1 garde est publiée en ce moment\./)).toBeInTheDocument();
  });
  it("cède la place aux occasions manquées quand il y en a", () => {
    missing.items = [{ key: "vehicle", sentence: "8 des 11 annonces en ligne demandent un gardien véhiculé.", href: "/profile?section=mobilite", ctaLabel: "Répondre" }];
    wrap(<SitterMissingOpportunities fallbackTotalPublished={11} />);
    expect(screen.getByText("Ces réponses comptent pour les annonces en ligne")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Répondre" })).toBeInTheDocument();
    expect(screen.queryByText("Recevez les nouvelles gardes en premier.")).toBeNull();
  });
});

describe("Bandeau entraide, variante gardien", () => {
  it("phrase d'accroche gardien et compte exact", () => {
    wrap(<OwnerEntraideBandView helpersCount={7} helpersRadiusKm={30} exchanges={[]} headline={SITTER_ENTRAIDE_HEADLINE} />);
    expect(screen.getByText(SITTER_ENTRAIDE_HEADLINE)).toBeInTheDocument();
    expect(screen.getByText(/^7 personnes sont prêtes à aider à moins de 30 km\. Un service contre un service/)).toBeInTheDocument();
  });
  it("la mission active remplace la mission proche", () => {
    wrap(
      <OwnerEntraideBandView
        helpersCount={2}
        helpersRadiusKm={30}
        exchanges={[]}
        headline={SITTER_ENTRAIDE_HEADLINE}
        mission={{ id: "m1", title: "Arroser le potager", city: "gex", date_needed: "2027-05-02" }}
        activeMission={{ id: "m2", title: "Monter une étagère", city: "gex", status: "open" }}
      />,
    );
    expect(screen.getByTestId("entraide-active-mission").textContent).toContain("Monter une étagère");
    expect(screen.getByRole("link", { name: "Voir les réponses" }).getAttribute("href")).toBe("/petites-missions/m2");
    expect(screen.queryByText("Arroser le potager")).toBeNull();
  });
  it("rendu propriétaire inchangé sans phrase d'accroche", () => {
    wrap(<OwnerEntraideBandView helpersCount={7} helpersRadiusKm={30} exchanges={[]} />);
    expect(screen.getByText("7 personnes sont prêtes à aider à moins de 30 km.")).toBeInTheDocument();
    expect(screen.queryByText(SITTER_ENTRAIDE_HEADLINE)).toBeNull();
  });
});

describe("Lot D4, encart d'invitation pendant le chargement", () => {
  it("SitterDashboard ne transmet le compte qu'une fois le chargement terminé", () => {
    expect(src("components/dashboard/SitterDashboard.tsx")).toContain(
      "fallbackTotalPublished={nbaLoading ? undefined : totalPublished}",
    );
  });
  it("encart absent pendant le chargement (compte non transmis)", () => {
    missing.items = [];
    wrap(<SitterMissingOpportunities fallbackTotalPublished={undefined} />);
    expect(screen.queryByText("Recevez les nouvelles gardes en premier.")).toBeNull();
  });
  it("encart présent avec le compte réel une fois chargé", () => {
    missing.items = [];
    wrap(<SitterMissingOpportunities fallbackTotalPublished={8} />);
    expect(screen.getByText("Recevez les nouvelles gardes en premier.")).toBeInTheDocument();
    expect(screen.getByText(/8 gardes sont publiées en ce moment\./)).toBeInTheDocument();
  });
});
