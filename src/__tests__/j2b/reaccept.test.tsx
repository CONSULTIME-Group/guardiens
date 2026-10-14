/**
 * Lot J2b : réacceptation des textes légaux (CGU v9, article 15.4).
 * Aucun appel avant la date d'effet, un seul ensuite, fenêtre absente des
 * routes laissées libres, case obligatoire, enregistrement 'reaccept', et
 * parité exacte entre le SQL préparé et src/config/legalVersions.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import sqlSrc from "../../../supabase/prepared-migrations/20261014150000_j2b_versions_legales.sql?raw";
import appSrc from "@/App.tsx?raw";
import mountSrc from "@/components/legal/LegalReacceptMount.tsx?raw";
import gateSrc from "@/components/legal/LegalReacceptGate.tsx?raw";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "member-1" } }) }));

import LegalReacceptMount from "@/components/legal/LegalReacceptMount";
import LegalReacceptGate from "@/components/legal/LegalReacceptGate";
import { LEGAL_VERSIONS, firstReacceptEffectiveOn, reacceptCheckDue } from "@/config/legalVersions";
import { applyPendingLegalAcceptance, rememberLegalAcceptance } from "@/lib/legalAcceptance";
import { CLOSE_ACCOUNT_PATH, isReacceptExemptPath, reacceptCheckboxLabel } from "@/lib/legalReaccept";

const BEFORE = new Date("2026-11-15T21:00:00Z"); // 15/11 22 h à Paris
const AFTER = new Date("2026-11-15T23:30:00Z"); // 16/11 0 h 30 à Paris
const PENDING = [
  { document: "cgs", version: "3", effective_on: "2026-11-16" },
  { document: "cgu", version: "9", effective_on: "2026-11-16" },
];

const callsTo = (fn: string) => rpc.mock.calls.filter((c) => c[0] === fn);

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderAt(path: string, node: React.ReactNode, client: QueryClient = newClient()) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={node} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  rpc.mockReset();
  rpc.mockImplementation(async (fn: string) => {
    if (fn === "my_pending_legal_documents") return { data: PENDING, error: null };
    if (fn === "record_my_legal_acceptance") return { data: true, error: null };
    return { data: null, error: null };
  });
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("lot J2b, calendrier local", () => {
  it("la plus proche date d'effet à réaccepter est le 16/11/2026, jour de Paris", () => {
    expect(firstReacceptEffectiveOn()).toBe("2026-11-16");
    vi.setSystemTime(BEFORE);
    expect(reacceptCheckDue()).toBe(false);
    vi.setSystemTime(AFTER);
    expect(reacceptCheckDue()).toBe(true);
  });
});

describe("lot J2b, appels réseau", () => {
  it("avant la date d'effet : aucun appel, rien d'affiché", async () => {
    vi.setSystemTime(BEFORE);
    const { container } = renderAt("/dashboard", <LegalReacceptMount />);
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(rpc).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe("");
  });

  it("après la date d'effet : un seul appel par session, puis la fenêtre", async () => {
    vi.setSystemTime(AFTER);
    const client = newClient();
    const first = renderAt("/dashboard", <LegalReacceptMount />, client);
    expect(await screen.findByText("Nos conditions évoluent")).toBeTruthy();
    first.unmount();
    renderAt("/sits", <LegalReacceptMount />, client);
    expect(await screen.findByText("Nos conditions évoluent")).toBeTruthy();
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(callsTo("my_pending_legal_documents")).toHaveLength(1);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("une trace Google en cours passe avant la lecture des documents à accepter", async () => {
    vi.setSystemTime(AFTER);
    let release: () => void = () => {};
    rpc.mockImplementation((fn: string) => {
      if (fn === "record_my_legal_acceptance") {
        return new Promise((resolve) => { release = () => resolve({ data: true, error: null }); });
      }
      return Promise.resolve({ data: [], error: null });
    });
    rememberLegalAcceptance("signup_google");
    const trace = applyPendingLegalAcceptance();
    renderAt("/dashboard", <LegalReacceptGate />);
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(callsTo("my_pending_legal_documents")).toHaveLength(0);
    release();
    await trace;
    await waitFor(() => expect(callsTo("my_pending_legal_documents")).toHaveLength(1));
    expect(rpc.mock.calls[0][0]).toBe("record_my_legal_acceptance");
  });

  it("aucun document en attente : aucune fenêtre", async () => {
    vi.setSystemTime(AFTER);
    rpc.mockResolvedValue({ data: [], error: null });
    renderAt("/dashboard", <LegalReacceptGate />);
    await waitFor(() => expect(callsTo("my_pending_legal_documents")).toHaveLength(1));
    expect(screen.queryByText("Nos conditions évoluent")).toBeNull();
  });

  it("une erreur de lecture laisse la navigation ouverte", async () => {
    vi.setSystemTime(AFTER);
    rpc.mockResolvedValue({ data: null, error: { message: "network" } });
    renderAt("/dashboard", <LegalReacceptGate />);
    await waitFor(() => expect(callsTo("my_pending_legal_documents")).toHaveLength(1));
    expect(screen.queryByText("Nos conditions évoluent")).toBeNull();
  });
});

describe("lot J2b, routes laissées libres (CGU 15.4)", () => {
  const exempt = [
    "/messages",
    "/messages/abc",
    "/settings",
    "/settings/notifications",
    "/cgu",
    "/cgs",
    "/confidentialite",
    "/mentions-legales",
    "/cookies",
  ];

  it.each(exempt)("%s : fenêtre absente", async (path) => {
    vi.setSystemTime(AFTER);
    renderAt(path, <LegalReacceptGate />);
    await waitFor(() => expect(callsTo("my_pending_legal_documents")).toHaveLength(1));
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(screen.queryByText("Nos conditions évoluent")).toBeNull();
  });

  it("les autres routes restent couvertes", () => {
    for (const path of exempt) expect(isReacceptExemptPath(path)).toBe(true);
    for (const path of ["/", "/dashboard", "/messagesx", "/sits/1", "/profile", "/cgu-v9"]) {
      expect(isReacceptExemptPath(path)).toBe(false);
    }
  });
});

describe("lot J2b, fenêtre", () => {
  it("case vide par défaut, bouton inactif tant qu'elle est vide, libellé exact", async () => {
    vi.setSystemTime(AFTER);
    renderAt("/dashboard", <LegalReacceptGate />);
    await screen.findByText("Nos conditions évoluent");
    const box = screen.getByRole("checkbox");
    expect(box.getAttribute("aria-checked")).toBe("false");
    expect((screen.getByRole("button", { name: "Continuer" }) as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText(
        "J'accepte les Conditions Générales d'Utilisation (version 9) et les Conditions Générales de Services (version 3)",
      ),
    ).toBeTruthy();
    expect(reacceptCheckboxLabel("2026-11-16")).toBe(
      "J'accepte les Conditions Générales d'Utilisation (version 9) et les Conditions Générales de Services (version 3)",
    );
  });

  it("liens vers /cgu et /cgs dans un nouvel onglet, fermeture du compte vers les paramètres", async () => {
    vi.setSystemTime(AFTER);
    renderAt("/dashboard", <LegalReacceptGate />);
    await screen.findByText("Nos conditions évoluent");
    for (const href of ["/cgu", "/cgs"]) {
      const link = document.querySelector(`a[href="${href}"]`) as HTMLAnchorElement;
      expect(link?.target).toBe("_blank");
    }
    const close = screen.getByText("Fermer mon compte").closest("a") as HTMLAnchorElement;
    expect(close.getAttribute("href")).toBe(CLOSE_ACCOUNT_PATH);
    expect(CLOSE_ACCOUNT_PATH).toBe("/settings?section=danger");
  });

  it("case cochée : record_my_legal_acceptance('reaccept'), puis la fenêtre se ferme", async () => {
    vi.setSystemTime(AFTER);
    renderAt("/dashboard", <LegalReacceptGate />);
    await screen.findByText("Nos conditions évoluent");
    fireEvent.click(screen.getByRole("checkbox"));
    const button = screen.getByRole("button", { name: "Continuer" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    await act(async () => { fireEvent.click(button); });
    expect(rpc).toHaveBeenCalledWith("record_my_legal_acceptance", { p_source: "reaccept" });
    await waitFor(() => expect(screen.queryByText("Nos conditions évoluent")).toBeNull());
    expect(callsTo("my_pending_legal_documents")).toHaveLength(1);
  });

  it("erreur réseau à l'enregistrement : la fenêtre reste, avec un message et un nouvel essai", async () => {
    vi.setSystemTime(AFTER);
    rpc.mockImplementation(async (fn: string) => {
      if (fn === "my_pending_legal_documents") return { data: PENDING, error: null };
      throw new Error("network");
    });
    renderAt("/dashboard", <LegalReacceptGate />);
    await screen.findByText("Nos conditions évoluent");
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Continuer" })); });
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Nos conditions évoluent")).toBeTruthy();
    rpc.mockImplementation(async () => ({ data: true, error: null }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Réessayer" })); });
    await waitFor(() => expect(screen.queryByText("Nos conditions évoluent")).toBeNull());
  });
});

describe("lot J2b, câblage", () => {
  it("monté une seule fois, pour un membre connecté, chargé par lazyWithRetry", () => {
    expect(appSrc.match(/<LegalReacceptMount \/>/g)).toHaveLength(1);
    expect(appSrc).toMatch(/<MemberOnly>[\s\S]*?<LegalReacceptMount \/>[\s\S]*?<\/MemberOnly>/);
    expect(mountSrc).toContain('lazyWithRetry(() => import("./LegalReacceptGate")');
    expect(mountSrc).toContain("reacceptCheckDue()");
  });
  it("aucune déconnexion dans la porte", () => {
    expect(gateSrc).not.toMatch(/logout|signOut/);
  });
});

describe("lot J2b, SQL", () => {
  const block = sqlSrc.slice(
    sqlSrc.indexOf("INSERT INTO public.legal_document_versions (document, version, published_on, effective_on, requires_reaccept)"),
  );
  const insert = block.slice(0, block.indexOf("ON CONFLICT"));
  const rows = [...insert.matchAll(/\('(\w+)', '(\w+)', DATE '([\d-]+)', DATE '([\d-]+)', (true|false)\)/g)].map((m) => ({
    document: m[1],
    version: m[2],
    publishedOn: m[3],
    effectiveOn: m[4],
    requiresReaccept: m[5] === "true",
  }));
  const key = (r: { document: string; version: string }) => `${r.document}:${r.version}`;

  it("parité exacte des lignes avec LEGAL_VERSIONS", () => {
    const fromConfig = LEGAL_VERSIONS.map((v) => ({ ...v }));
    const sort = (a: { document: string; version: string }, b: { document: string; version: string }) =>
      key(a).localeCompare(key(b));
    expect([...rows].sort(sort)).toEqual([...fromConfig].sort(sort));
  });

  it("le nettoyage et le contrôle final suivent les mêmes lignes", () => {
    const del = sqlSrc.slice(sqlSrc.indexOf("DELETE FROM public.legal_document_versions"));
    const kept = [...del.slice(0, del.indexOf(");") + 2).matchAll(/\('(\w+)', '(\w+)'\)/g)].map((m) => `${m[1]}:${m[2]}`);
    expect(kept.sort()).toEqual(LEGAL_VERSIONS.map(key).sort());
    expect(sqlSrc).toContain(`IF v_rows <> ${LEGAL_VERSIONS.length} THEN`);
  });

  it("clé (document, version), versions publiées au jour de Paris", () => {
    expect(sqlSrc).toContain("PRIMARY KEY (document, version)");
    expect(sqlSrc).toMatch(/record_legal_acceptance_for[\s\S]*published_on <= \(now\(\) AT TIME ZONE 'Europe\/Paris'\)::date/);
  });

  it("my_pending_legal_documents : membre connecté seulement (règle Y2)", () => {
    expect(sqlSrc).toContain("REVOKE ALL ON FUNCTION public.my_pending_legal_documents() FROM PUBLIC, anon, authenticated;");
    expect(sqlSrc).toContain("GRANT EXECUTE ON FUNCTION public.my_pending_legal_documents() TO authenticated;");
    expect(sqlSrc).toMatch(/my_pending_legal_documents\(\)[\s\S]*SECURITY DEFINER[\s\S]*auth\.uid\(\) IS NOT NULL[\s\S]*requires_reaccept/);
  });

  it("rejouable : aucune création sans garde", () => {
    expect(sqlSrc).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/);
    expect(sqlSrc).not.toMatch(/CREATE FUNCTION/);
    expect(sqlSrc).toContain("DROP TRIGGER IF EXISTS trg_record_legal_acceptance_on_signup ON auth.users;");
  });
});
