/**
 * Lot SEO-2 projets : tests inertes (aucune base réelle, aucun envoi).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
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
let nextRpc: () => Promise<{ data: unknown; error: unknown }> = () => Promise.resolve({ data: null, error: null });
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
      rpc: () => nextRpc(),
    },
  };
});
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: () => undefined }) }));
const captured: any[] = [];
vi.mock("@/components/missions/PublicMissionView", async () => {
  // PageMeta réelle : les balises de A sont celles que la production poserait.
  const { default: PageMeta } = await vi.importActual<any>("@/components/PageMeta");
  return {
    default: (props: any) => {
      captured.push(props);
      return (
        <>
          <PageMeta
            title={props.mission.title}
            description={`Description ${props.mission.title}`}
            canonical={props.canonical}
            jsonLd={{ "@context": "https://schema.org", "@type": "Event", name: props.mission.title }}
          />
          <h1>{props.mission.title}</h1>
        </>
      );
    },
  };
});

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
  nextRpc = () => Promise.resolve({ data: null, error: null });
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

// ---------- Lectures concurrentes et lecture auteur ----------
let goTo: (p: string) => void = () => undefined;
const Nav = () => { goTo = useNavigate(); return null; };
function renderWithNav(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Nav />
      <Routes>
        <Route path="/projets/:slug" element={<ProjetDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}
const row = (slug: string, title: string) => ({ id: `${slug}-id`, slug, title, category: "projet", status: "open" });
const canon = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;

describe("robustesse de la fiche projet", () => {
  it("auteur en échec (rejet) : projet affiché, auteur vide, page prête", async () => {
    nextResult = () => Promise.resolve({ data: row("a", "Projet A"), error: null });
    nextRpc = () => Promise.reject(new Error("rpc down"));
    renderProjet("/projets/a");
    await screen.findByText("Projet A");
    // Page libérée : plus d'écran de chargement (PublicMissionView, simulée
    // ici, porte la PageMeta qui lève le drapeau Prerender).
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
    expect(captured.at(-1).author).toBeNull();
    expect(screen.queryByText("Ce projet a été retiré")).toBeNull();
  });

  it("auteur en erreur renvoyée : même dégradation", async () => {
    nextResult = () => Promise.resolve({ data: row("a", "Projet A"), error: null });
    nextRpc = () => Promise.resolve({ data: null, error: { message: "boom" } });
    renderProjet("/projets/a");
    await screen.findByText("Projet A");
    expect(captured.at(-1).author).toBeNull();
  });

  it("A puis B, réponses dans le désordre : B seul est rendu, A ignorée", async () => {
    const pending: Record<string, (v: any) => void> = {};
    const order: string[] = [];
    nextResult = () => new Promise((r) => { const k = order.length === 0 ? "a" : "b"; order.push(k); pending[k] = r; });
    renderWithNav("/projets/a");
    await act(async () => { await Promise.resolve(); });
    act(() => goTo("/projets/b"));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { pending.b({ data: row("b", "Projet B"), error: null }); });
    await screen.findByText("Projet B");
    await act(async () => { pending.a({ data: row("a", "Projet A"), error: null }); });
    expect(screen.queryByText("Projet A")).toBeNull();
    expect(captured.every((p) => p.mission.title !== "Projet A")).toBe(true);
    expect(captured.at(-1).canonical).toBe("https://guardiens.fr/projets/b");
  });

  it("A affiché puis navigation vers B : ancien titre et canonical jamais émis pendant le chargement de B", async () => {
    let resolveB!: (v: any) => void;
    let calls = 0;
    nextResult = () => (++calls === 1
      ? Promise.resolve({ data: row("a", "Projet A"), error: null })
      : new Promise((r) => { resolveB = r; }));
    renderWithNav("/projets/a");
    await screen.findByText("Projet A");
    // Simule le canonical que PageMeta aurait posé pour A.
    const l = document.createElement("link"); l.rel = "canonical"; l.href = "https://guardiens.fr/projets/a"; document.head.appendChild(l);
    (window as any).prerenderReady = true;
    const before = captured.length;
    act(() => goTo("/projets/b"));
    // Premier commit de B : rien de A n'est rendu ni déclaré.
    expect(screen.queryByText("Projet A")).toBeNull();
    expect(captured.length).toBe(before);
    expect(canon()).toBeNull();
    expect((window as any).prerenderReady).toBe(false);
    await act(async () => { resolveB({ data: row("b", "Projet B"), error: null }); });
    await screen.findByText("Projet B");
    expect(captured.at(-1).canonical).toBe("https://guardiens.fr/projets/b");
  });

  it("PageMeta réelle : au premier commit de B, aucune balise de A (titre, description, canonical, JSON-LD)", async () => {
    let resolveB!: (v: any) => void;
    let calls = 0;
    nextResult = () => (++calls === 1
      ? Promise.resolve({ data: row("a", "Projet A"), error: null })
      : new Promise((r) => { resolveB = r; }));
    renderWithNav("/projets/a");
    await screen.findByText("Projet A");
    await waitFor(() => expect(canon()).toBe("https://guardiens.fr/projets/a"));
    expect(document.title).toContain("Projet A");
    expect(meta("description")).toBe("Description Projet A");
    expect(document.head.querySelectorAll('script[type="application/ld+json"][data-page-meta="true"]').length).toBe(1);
    act(() => goTo("/projets/b"));
    expect(document.title).not.toContain("Projet A");
    expect(meta("description")).toBeNull();
    expect(canon()).toBeNull();
    expect(document.head.querySelector('[data-page-meta="true"]')).toBeNull();
    expect(document.head.innerHTML).not.toContain("Projet A");
    expect((window as any).prerenderReady).toBe(false);
    expect(window.prerenderMetaPending).toBe(true);
    await act(async () => { resolveB({ data: row("b", "Projet B"), error: null }); });
    await screen.findByText("Projet B");
    await waitFor(() => expect(canon()).toBe("https://guardiens.fr/projets/b"));
    expect(document.title).toContain("Projet B");
    expect(meta("description")).toBe("Description Projet B");
  });

  it("démontage pendant la lecture : aucune mise à jour tardive", async () => {
    let resolveIt!: (v: any) => void;
    nextResult = () => new Promise((r) => { resolveIt = r; });
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { unmount } = renderProjet("/projets/a");
    unmount();
    await act(async () => { resolveIt({ data: row("a", "Projet A"), error: null }); });
    expect(captured.length).toBe(0);
    errors.mockRestore();
  });

  it("Réessayer : l'écran d'erreur disparaît dès le clic, puis le projet s'affiche", async () => {
    let calls = 0;
    let resolve2!: (v: any) => void;
    nextResult = () => (++calls === 1
      ? Promise.resolve({ data: null, error: { message: "Failed to fetch" } })
      : new Promise((r) => { resolve2 = r; }));
    renderProjet("/projets/a");
    const btn = await screen.findByRole("button", { name: "Réessayer" });
    act(() => btn.click());
    expect(screen.queryByText("Ce projet n'a pas pu être chargé")).toBeNull();
    expect(meta("prerender-status-code")).toBeNull();
    await act(async () => { resolve2({ data: row("a", "Projet A"), error: null }); });
    await screen.findByText("Projet A");
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
    // Entraide ordinaire : la variante UUID declare aussi une redirection permanente.
    expect(src).toContain("setCanonicalRedirect(`/petites-missions/${(m as any).slug}`)");
  });

  it("verrou de rendu : /projets/ attend PageMeta", () => {
    const re = new RegExp(read("src/main.tsx").match(/const LATE_META_PATH = \/(.+)\/;/)![1]);
    expect(re.test("/projets/un-projet")).toBe(true);
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
