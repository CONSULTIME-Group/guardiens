/**
 * Lot X3b : bandeau entraide du tableau de bord.
 * C-04 : le besoin en cours de l'auteur s'affiche avec ses propositions à lire.
 * C-11 : l'aidant retrouve ses propositions d'aide (statut, besoin, conversation).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

import { OwnerEntraideBandView } from "@/components/dashboard/owner/OwnerEntraideBand";
import type { HelpProposal } from "@/lib/myHelpProposals";

afterEach(cleanup);
const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("C-04, besoin en cours de l'auteur", () => {
  it("affiché avec ses propositions à lire et le lien vers ses réponses", () => {
    wrap(
      <OwnerEntraideBandView
        helpersCount={3}
        helpersRadiusKm={30}
        exchanges={[]}
        mission={{ id: "near", title: "Sortir le chien", city: "lyon" }}
        activeMission={{ id: "m2", title: "Monter une coiffeuse", city: "gonfaron", status: "open", path: "/petites-missions/m2", pendingCount: 2 }}
      />,
    );
    const block = screen.getByTestId("entraide-active-mission");
    expect(block.textContent).toContain("Monter une coiffeuse");
    expect(block.textContent).toContain("Ouverte aux réponses");
    expect(block.textContent).toContain("2 propositions à lire");
    expect(within(block).getByText("Voir les réponses").closest("a")?.getAttribute("href")).toBe("/petites-missions/m2");
    // Le besoin de l'auteur passe avant la mission proche.
    expect(screen.queryByText("Proposer mon aide")).toBeNull();
  });

  it("un projet ouvre sa page /projets/{slug}", () => {
    wrap(
      <OwnerEntraideBandView
        helpersCount={0}
        helpersRadiusKm={30}
        exchanges={[]}
        activeMission={{ id: "p1", title: "Chantier participatif", status: "in_progress", path: "/projets/chantier", pendingCount: 0 }}
      />,
    );
    expect(screen.getByText("Voir les réponses").closest("a")?.getAttribute("href")).toBe("/projets/chantier");
    expect(screen.getByTestId("entraide-active-mission").textContent).not.toContain("à lire");
  });

  it("sans chemin connu, repli sur la page du besoin (tableau gardien)", () => {
    wrap(<OwnerEntraideBandView helpersCount={0} helpersRadiusKm={30} exchanges={[]} activeMission={{ id: "m9", title: "Arroser", status: "open" }} />);
    expect(screen.getByText("Voir les réponses").closest("a")?.getAttribute("href")).toBe("/petites-missions/m9");
  });
});

describe("C-11, propositions d'aide", () => {
  const proposals: HelpProposal[] = [
    { responseId: "r1", missionId: "a", title: "Garder ma chienne", city: "toulon", state: "waiting", label: "En attente de réponse", missionPath: "/petites-missions/a", conversationPath: null, createdAt: null },
    { responseId: "r2", missionId: "c", title: "Chantier participatif", city: null, state: "chosen", label: "Vous êtes la personne retenue", missionPath: "/projets/chantier", conversationPath: "/messages/conv-1", createdAt: null },
  ];

  it("chaque proposition montre le besoin, le statut et ses liens", () => {
    wrap(<OwnerEntraideBandView helpersCount={0} helpersRadiusKm={30} exchanges={[]} proposals={proposals} />);
    const box = screen.getByTestId("help-proposals");
    expect(within(box).getByText("Vos propositions d'aide")).toBeTruthy();
    expect(box.textContent).toContain("Garder ma chienne");
    expect(box.textContent).toContain("Toulon");
    expect(within(box).getByText("En attente de réponse")).toBeTruthy();
    expect(within(box).getByText("Vous êtes la personne retenue")).toBeTruthy();
    const links = within(box).getAllByText("Voir le besoin").map((a) => a.closest("a")?.getAttribute("href"));
    expect(links).toEqual(["/petites-missions/a", "/projets/chantier"]);
    expect(within(box).getByText("Conversation").closest("a")?.getAttribute("href")).toBe("/messages/conv-1");
  });

  it("sans proposition, aucun bloc", () => {
    wrap(<OwnerEntraideBandView helpersCount={0} helpersRadiusKm={30} exchanges={[]} />);
    expect(screen.queryByTestId("help-proposals")).toBeNull();
  });
});
