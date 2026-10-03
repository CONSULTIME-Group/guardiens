/**
 * Lot SEO-2 projets : tests inertes (aucune base réelle, aucun envoi).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyProjetLookup,
  legacyProjetRedirectTarget,
  projetCanonicalUrl,
  projetsHubSeo,
  projetStatusCode,
} from "@/lib/projetSeo";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const UUID = "e5724f3e-c22b-4fb9-8962-d24c80435660";
const SLUG = "chantier-participatif-de-plantation";

// ---------- Mocks ----------
let nextResult: () => Promise<{ data: unknown; error: unknown }>;
const writes: string[] = [];
vi.mock("@/integrations/supabase/client", () => {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => nextResult(),
    maybeSingle: () => nextResult(),
    insert: () => { writes.push("insert"); return Promise.resolve({ error: null }); },
    update: () => { writes.push("update"); return chain; },
  };
  return {
    supabase: {
      from: () => chain,
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: () => undefined }) }));
const captured: any[] = [];
vi.mock("@/components/missions/PublicMissionView", () => ({
  default: (props: any) => { captured.push(props); return <h1>{props.mission.title}</h1>; },
}));

import ProjetDetail from "@/pages/ProjetDetail";
import LegacyProjetRedirect from "@/components/seo/LegacyProjetRedirect";

const meta = (name: string) =>
  document.head.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? null;

function renderProjet(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projets/:slug" element={<ProjetDetail />} />
        <Route path="/projets" element={<p>hub</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  captured.length = 0;
  writes.length = 0;
  document.head.innerHTML = "";
  (window as any).prerenderReady = false;
});

// ---------- Règles pures ----------
describe("règles pures", () => {
  it("canonical : slug prioritaire, repli id", () => {
    expect(projetCanonicalUrl({ id: UUID, slug: SLUG })).toBe(`https://guardiens.fr/projets/${SLUG}`);
    expect(projetCanonicalUrl({ id: UUID, slug: "" })).toBe(`https://guardiens.fr/projets/${UUID}`);
    expect(projetCanonicalUrl({ id: UUID, slug: null })).toBe(`https://guardiens.fr/projets/${UUID}`);
  });

  it("erreur réseau distincte de l'absence", () => {
    expect(classifyProjetLookup({ data: null, error: { message: "fetch failed" } }).state).toBe("error");
    expect(classifyProjetLookup(null).state).toBe("error");
    expect(classifyProjetLookup({ data: null, error: null }).state).toBe("absent");
    expect(classifyProjetLookup({ data: { id: UUID }, error: null }).state).toBe("found");
    expect(projetStatusCode("absent")).toBe(404);
    expect(projetStatusCode("error")).toBe(503);
    expect(projetStatusCode("found")).toBeUndefined();
  });

  it("ancienne route : seul un projet redirige, entraide ordinaire intacte", () => {
    expect(legacyProjetRedirectTarget({ id: UUID, slug: SLUG, category: "projet" })).toBe(`/projets/${SLUG}`);
    expect(legacyProjetRedirectTarget({ id: UUID, slug: null, category: "projet" })).toBe(`/projets/${UUID}`);
    expect(legacyProjetRedirectTarget({ id: UUID, slug: "aide-jardin", category: "garden" })).toBeNull();
    expect(legacyProjetRedirectTarget({ id: UUID, slug: "x", category: "animals" })).toBeNull();
  });

  it("hub : jamais prêt en chargement, indexable si un projet éligible, 503 sur erreur", () => {
    expect(projetsHubSeo({ loading: true, error: false, eligibleCount: 0 })).toEqual({ ready: false, noindex: false });
    expect(projetsHubSeo({ loading: false, error: false, eligibleCount: 1 })).toEqual({ ready: true, noindex: false });
    expect(projetsHubSeo({ loading: false, error: false, eligibleCount: 0 })).toEqual({ ready: true, noindex: true });
    expect(projetsHubSeo({ loading: false, error: true, eligibleCount: 0 })).toEqual({ ready: true, noindex: true, statusCode: 503 });
  });
});

// ---------- Fiche projet rendue ----------
describe("fiche projet", () => {
  it("/projets/{uuid} déclare le canonical /projets/{slug}", async () => {
    nextResult = () => Promise.resolve({ data: { id: UUID, slug: SLUG, title: "Plantons ensemble", category: "projet", status: "open" }, error: null });
    renderProjet(`/projets/${UUID}`);
    await screen.findByText("Plantons ensemble");
    expect(captured.at(-1).canonical).toBe(`https://guardiens.fr/projets/${SLUG}`);
  });

  it("projet inexistant : 404, noindex, sans canonical", async () => {
    nextResult = () => Promise.resolve({ data: null, error: null });
    renderProjet("/projets/audit-inexistant-20261003");
    await screen.findByText("Ce projet a été retiré");
    await waitFor(() => expect(meta("prerender-status-code")).toBe("404"));
    expect(meta("robots")).toMatch(/noindex/);
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect((window as any).prerenderReady).toBe(true);
  });

  it("erreur réseau : 503 noindex, jamais le message d'absence", async () => {
    nextResult = () => Promise.resolve({ data: null, error: { message: "Failed to fetch" } });
    renderProjet(`/projets/${SLUG}`);
    await screen.findByText("Ce projet n'a pas pu être chargé");
    expect(screen.queryByText("Ce projet a été retiré")).toBeNull();
    await waitFor(() => expect(meta("prerender-status-code")).toBe("503"));
    expect(meta("robots")).toMatch(/noindex/);
  });

  it("exception levée par la lecture : traitée comme erreur, pas comme absence", async () => {
    nextResult = () => Promise.reject(new Error("network"));
    renderProjet(`/projets/${SLUG}`);
    await screen.findByText("Ce projet n'a pas pu être chargé");
  });

  it("chargement : prerenderReady reste faux tant que la lecture n'a pas répondu", async () => {
    let resolveIt!: (v: any) => void;
    nextResult = () => new Promise((r) => { resolveIt = r; });
    renderProjet(`/projets/${SLUG}`);
    await act(async () => { await Promise.resolve(); });
    expect((window as any).prerenderReady).toBe(false);
    expect(meta("prerender-status-code")).toBeNull();
    await act(async () => { resolveIt({ data: null, error: null }); });
    await waitFor(() => expect((window as any).prerenderReady).toBe(true));
  });

  it("aucune écriture en base pendant ces rendus", () => {
    expect(writes).toEqual([]);
  });
});

// ---------- Redirection de l'ancienne adresse ----------
describe("ancienne adresse /petites-missions/{slug|uuid}", () => {
  it("déclare 301 + Location absolue et remplace l'adresse dans le navigateur", async () => {
    render(
      <MemoryRouter initialEntries={[`/petites-missions/${SLUG}?utm_source=x`]}>
        <Routes>
          <Route path="/petites-missions/:id" element={<LegacyProjetRedirect target={`/projets/${SLUG}`} />} />
          <Route path="/projets/:slug" element={<p>fiche projet</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("fiche projet");
    expect(meta("prerender-status-code")).toBe("301");
    expect(meta("prerender-header")).toBe(`Location: https://guardiens.fr/projets/${SLUG}`);
  });

  it("SmallMissionDetail passe par la redirection déclarée, plus par un navigate seul", () => {
    const src = read("src/pages/SmallMissionDetail.tsx");
    expect(src).toContain("legacyProjetRedirectTarget(m as any)");
    expect(src).toContain("<LegacyProjetRedirect target={projetRedirect} />");
    expect(src).not.toMatch(/navigate\(`\/projets\//);
    // Entraide ordinaire : redirection uuid vers slug inchangée.
    expect(src).toContain("navigate(`/petites-missions/${(m as any).slug}${window.location.search}`, { replace: true });");
  });

  it("verrou de rendu : /projets/ attend PageMeta", () => {
    expect(read("src/main.tsx")).toMatch(/LATE_META_PATH_PREFIXES\s*=\s*\[[\s\S]{0,400}"\/projets\/"/);
  });
});

// ---------- Hub /projets (source) ----------
describe("hub /projets", () => {
  it("noindex piloté par les projets éligibles et l'erreur, jamais par la longueur brute", () => {
    const src = read("src/pages/ProjetsListing.tsx");
    expect(src).toContain("projetsHubSeo({");
    expect(src).toContain("isIndexableProjetMission(p)");
    expect(src).toContain("if (error) throw error;");
    expect(src).not.toContain("noindex={!loading && projets.length === 0}");
  });
});
