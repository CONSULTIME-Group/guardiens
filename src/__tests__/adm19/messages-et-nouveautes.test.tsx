/**
 * Lot ADM19 (demande de Jérémie du 10/11/2026) : la liste des annonces retrouve
 * sa colonne « Messages », la fiche « Détails » disparaît des annonces et de
 * l'entraide au profit d'une action utile sur la ligne, et les nouveautés
 * depuis la dernière visite se voient (menu mobile, étiquette sur la ligne).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const { rpcSpy, newsCounts } = vi.hoisted(() => ({
  rpcSpy: vi.fn(),
  newsCounts: { sits: 0, small_missions: 0 } as Record<string, number>,
}));

vi.mock("@/integrations/supabase/client", () => {
  const counter = (table: string) => {
    const b: Record<string, unknown> = new Proxy({}, {
      get: (_t, k: string) => {
        if (k === "then") return (ok: (v: unknown) => unknown) => Promise.resolve({ count: newsCounts[table] ?? 0, error: null }).then(ok);
        return () => b;
      },
    });
    return b;
  };
  return {
    supabase: {
      rpc: (...a: unknown[]) => rpcSpy(...a),
      from: (table: string) => ({ select: () => counter(table) }),
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }) },
    },
  };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1" }, logout: vi.fn(), isAuthenticated: true, loading: false }),
}));
vi.mock("@/hooks/useAdmin", () => ({ useAdmin: () => ({ isAdmin: true, loading: false }) }));
vi.mock("@/hooks/useFeatureFlag", () => ({ useFeatureFlag: () => ({ enabled: true, loading: false }) }));
vi.mock("@/lib/admin/readError", async (orig) => ({ ...(await orig<Record<string, unknown>>()), reportAdminReadError: vi.fn() }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));

import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  isNewListing,
  isNewMission,
  markAdminNewsSeen,
  NEWS_VISIT_GAP_MS,
  newsTotalLabel,
  readNewsSince,
  readNewsVisitSince,
  NEWS_DEFAULT_WINDOW_MS,
} from "@/hooks/useAdminNews";

const read = (p: string) => readFileSync(p, "utf8");
const LISTINGS = read("src/pages/admin/AdminListings.tsx");
const MISSIONS = read("src/pages/admin/AdminSmallMissions.tsx");

const EMPTY_LIST = { sources: { signals: true, sits: true, queues: true, relances: true, health: true }, signals: [], sits: [], queues: [], relances_failed_7d: 0, health: [] };

beforeEach(() => {
  rpcSpy.mockReset();
  newsCounts.sits = 0;
  newsCounts.small_missions = 0;
  try { localStorage.clear(); } catch { /* stockage indisponible */ }
});

describe("Annonces : la colonne Messages", () => {
  it("a son en-tête et sa cellule, et le lien sous le titre disparaît", () => {
    expect(LISTINGS).toContain(">Messages</TableHead>");
    expect(LISTINGS).toContain('data-testid="row-messages"');
    expect(LISTINGS).not.toContain("Lecture des messages en cours");
    expect(LISTINGS).not.toContain("Messages indisponibles");
  });

  it("le nombre ouvre les conversations, zéro reste muet, une lecture en échec se dit", () => {
    const cell = LISTINGS.slice(LISTINGS.indexOf('data-testid="row-messages"'), LISTINGS.indexOf('{st?.views ?? "·"}'));
    expect(cell).toContain('openDrill(listing, "conversations")');
    expect(cell).toContain("st.messages > 0");
    expect(cell).toContain(">0</span>");
    expect(cell).toContain('statsError ? "Indisponible" : "·"');
  });

  it("le tableau compte sept colonnes partout", () => {
    const heads = LISTINGS.slice(LISTINGS.indexOf("<TableHeader>"), LISTINGS.indexOf("</TableHeader>")).match(/<TableHead[ >]/g) ?? [];
    expect(heads).toHaveLength(7);
    expect(LISTINGS).not.toContain("colSpan={6}");
    expect((LISTINGS.match(/colSpan=\{7\}/g) ?? []).length).toBe(5);
  });
});

describe("Détails retiré, une action utile à la place", () => {
  it("Annonces : plus de fiche Détails, Diffuser visible sur les annonces à pourvoir, fiche du membre gardée au menu", () => {
    expect(LISTINGS).not.toContain("Détails");
    expect(LISTINGS).not.toContain("DossierDetailSheet");
    expect(LISTINGS).not.toContain("detailListing");
    // Même règle que le signal et la pastille : en ligne depuis 48 h, départ à venir, aucune candidature active.
    expect(LISTINGS).toContain("isListingToStaff({ ...listing, activeApplications: st.applications })");
    expect(LISTINGS).toContain('data-testid="row-broadcast"');
    expect(LISTINGS).toContain("Fiche du membre");
  });

  it("Entraide : plus de fiche Détails, Diffuser sur un besoin ouvert sans envoi réussi, sinon Voir", () => {
    expect(MISSIONS).not.toContain("Détails");
    expect(MISSIONS).not.toContain("DossierDetailSheet");
    expect(MISSIONS).not.toContain("detailMission");
    const row = MISSIONS.slice(MISSIONS.indexOf('data-testid="row-broadcast-mission"') - 260, MISSIONS.indexOf('data-testid="row-view-mission"') + 40);
    expect(row).toContain('m.status === "open" && notified === 0 && !blocked');
    expect(row).toContain("setProximityMission");
    expect(row).toContain("/petites-missions/");
    expect(MISSIONS).toContain("Fiche de l'auteur");
  });

  it("le lien ?mission= filtre toujours la liste sur le besoin cité", () => {
    expect(MISSIONS).toContain("if (focusMissionId) return list.filter((m) => m.id === focusMissionId);");
  });
});

describe("Nouveautés depuis la dernière visite", () => {
  const T0 = Date.parse("2026-11-10T14:00:00Z");

  it("le repère de la visite précédente reste stable pendant toute la visite", () => {
    // Première ouverture : sans repère, sept jours en arrière.
    expect(readNewsVisitSince("listings", "admin-1", T0)).toBe(new Date(T0 - NEWS_DEFAULT_WINDOW_MS).toISOString());
    markAdminNewsSeen("/admin/listings", "admin-1", T0);
    // Retour sur la page dans la visite : même limite qu'à l'arrivée.
    expect(readNewsVisitSince("listings", "admin-1", T0 + 5 * 60_000)).toBe(new Date(T0 - NEWS_DEFAULT_WINDOW_MS).toISOString());
    markAdminNewsSeen("/admin/listings", "admin-1", T0 + 5 * 60_000);
    expect(readNewsVisitSince("listings", "admin-1", T0 + 8 * 60_000)).toBe(new Date(T0 - NEWS_DEFAULT_WINDOW_MS).toISOString());
    // Nouvelle visite : la limite devient la fin de la précédente.
    const later = T0 + 5 * 60_000 + NEWS_VISIT_GAP_MS + 60_000;
    expect(readNewsVisitSince("listings", "admin-1", later)).toBe(new Date(T0 + 5 * 60_000).toISOString());
    markAdminNewsSeen("/admin/listings", "admin-1", later);
    expect(readNewsVisitSince("listings", "admin-1", later + 60_000)).toBe(new Date(T0 + 5 * 60_000).toISOString());
    // Le compteur du menu, lui, repart à zéro dès l'ouverture.
    expect(readNewsSince("listings", "admin-1", later + 60_000)).toBe(new Date(later).toISOString());
  });

  it("Annonces et Entraide gardent chacune leur repère", () => {
    expect(readNewsVisitSince("entraide", "admin-1", T0)).toBe(new Date(T0 - NEWS_DEFAULT_WINDOW_MS).toISOString());
    markAdminNewsSeen("/admin/listings", "admin-1", T0 + 60_000);
    // Ouvrir Annonces ne touche ni au repère d'Entraide ni à la limite de ses lignes.
    expect(readNewsVisitSince("entraide", "admin-1", T0 + 2 * 60_000)).toBe(new Date(T0 - NEWS_DEFAULT_WINDOW_MS).toISOString());
    // Et un autre administrateur a ses propres repères.
    expect(readNewsVisitSince("listings", "admin-2", T0 + 2 * 60_000)).toBe(new Date(T0 + 2 * 60_000 - NEWS_DEFAULT_WINDOW_MS).toISOString());
  });

  it("une annonce est nouvelle si elle est en ligne et publiée depuis le repère (règle du compteur)", () => {
    const since = "2026-11-08T00:00:00Z";
    expect(isNewListing({ published_at: "2026-11-08T06:04:14Z", status: "published" }, since)).toBe(true);
    expect(isNewListing({ published_at: "2026-11-07T23:59:59Z", status: "published" }, since)).toBe(false);
    expect(isNewListing({ published_at: "2026-11-09T06:00:00Z", status: "draft" }, since)).toBe(false);
    expect(isNewListing({ published_at: null, status: "published" }, since)).toBe(false);
    expect(isNewListing({ published_at: "2026-11-09T06:00:00Z", status: "published" }, null)).toBe(false);
  });

  it("un besoin est nouveau s'il est déposé depuis le repère, visible, de type besoin (règle du compteur)", () => {
    const since = "2026-11-08T00:00:00Z";
    const base = { created_at: "2026-11-09T10:00:00Z", mission_type: "besoin", status: "open", hidden_at: null, moderation_hidden_at: null };
    expect(isNewMission(base, since)).toBe(true);
    expect(isNewMission({ ...base, mission_type: "offre" }, since)).toBe(false);
    expect(isNewMission({ ...base, status: "cancelled" }, since)).toBe(false);
    expect(isNewMission({ ...base, hidden_at: "2026-11-09T11:00:00Z" }, since)).toBe(false);
    expect(isNewMission({ ...base, moderation_hidden_at: "2026-11-09T11:00:00Z" }, since)).toBe(false);
    expect(isNewMission({ ...base, created_at: "2026-11-07T10:00:00Z" }, since)).toBe(false);
  });

  it("la ligne porte l'étiquette « Nouvelle » ou « Nouveau », le repère est lu avant l'ouverture", () => {
    expect(LISTINGS).toContain('data-testid="row-new"');
    expect(LISTINGS).toContain("isNewListing(listing, newSince)");
    expect(LISTINGS).toContain('readNewsVisitSince("listings", adminUser.id)');
    expect(MISSIONS).toContain('data-testid="row-new"');
    expect(MISSIONS).toContain("isNewMission(m, newSince)");
    expect(MISSIONS).toContain('readNewsVisitSince("entraide", adminUser.id)');
  });

  it("phrase du total pour le menu mobile", () => {
    expect(newsTotalLabel({})).toBeNull();
    expect(newsTotalLabel({ listings: 0, entraide: 0 })).toBeNull();
    expect(newsTotalLabel({ listings: 1 })).toBe("1 nouvelle annonce depuis votre dernière visite");
    expect(newsTotalLabel({ listings: 2, entraide: 1 })).toBe("2 nouvelles annonces, 1 nouveau besoin d'entraide depuis votre dernière visite");
  });

  it("le bouton du menu mobile porte le compteur gris, séparé de la pastille rouge", async () => {
    rpcSpy.mockResolvedValue({ data: EMPTY_LIST, error: null });
    newsCounts.sits = 2;
    newsCounts.small_missions = 1;
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/users"]}><AdminLayout /></MemoryRouter>
      </QueryClientProvider>,
    );
    const btn = await screen.findByTestId("admin-mobile-menu-button");
    await waitFor(() => expect(within(btn).getByTestId("admin-news").textContent).toBe("3"));
    expect(btn.getAttribute("aria-label")).toBe("Ouvrir le menu, 2 nouvelles annonces, 1 nouveau besoin d'entraide depuis votre dernière visite");
    expect(within(btn).queryByTestId("admin-badge")).toBeNull();
  });
});
