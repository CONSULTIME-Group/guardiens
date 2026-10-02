import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
vi.mock("@/components/shared/ApproximateLocationMap", () => ({ default: () => null }));
import PublicMissionView from "@/components/missions/PublicMissionView";

const DESC = "Informations pratiques : accueil à 9h. Inscription sur le formulaire en ligne : https://framaforms.org/x";
const base = (over: any) => ({
  id: "m1", slug: "s", title: "Plantons ensemble", category: "projet", mission_type: "besoin",
  description: DESC, city: "La Rochelle", status: "open", created_at: "2026-09-30T00:00:00Z",
  date_needed: "2026-11-14", photos: [], accepting_applications: true, ...over,
});
const renderIt = (m: any) => render(
  <MemoryRouter>
    <PublicMissionView mission={m} author={null} catMeta={{ label: "Projet" } as any} relatedMissions={[]}
      titlecaseCity={(s) => s || ""} timeAgoFr={() => ""} memberSinceLong={() => null} onShare={() => {}} />
  </MemoryRouter>);

describe("projet à inscription externe", () => {
  it("ouvert : boutons d'inscription", () => {
    renderIt(base({}));
    expect(screen.getAllByText("S'inscrire au chantier").length).toBe(2);
  });
  it("candidatures fermées : aucun bouton, message de fermeture", () => {
    renderIt(base({ accepting_applications: false }));
    expect(screen.queryByText("S'inscrire au chantier")).toBeNull();
    expect(screen.getByText("Ce projet a fermé ses candidatures.")).toBeTruthy();
  });
  it("statut non ouvert : aucun bouton", () => {
    renderIt(base({ status: "completed" }));
    expect(screen.queryByText("S'inscrire au chantier")).toBeNull();
  });
  it("simple lien informatif : candidature Guardiens", () => {
    renderIt(base({ description: "Plus d'infos : https://exemple.org/p" }));
    expect(screen.queryByText("S'inscrire au chantier")).toBeNull();
    expect(screen.getAllByText("Participer à ce projet").length).toBeGreaterThan(0);
  });
});
