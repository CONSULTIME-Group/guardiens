/**
 * Lot perf 5 : la fiche publique d'une annonce est lue dès le HTML pour un
 * visiteur, avec les mêmes lectures que PublicSitDetail, reprises une fois.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, activeRole: null, hasSession: false, authChecked: true }) }));
vi.mock("@/hooks/useSubscriptionAccess", () => ({ useSubscriptionAccess: () => ({ hasAccess: false }) }));
vi.mock("@/components/layout/PublicHeader", () => ({ default: () => null }));
vi.mock("@/components/layout/PublicFooter", () => ({ default: () => null }));
vi.mock("@/components/PageMeta", () => ({ default: () => null }));
vi.mock("@/components/sits/NearbySitsModule", () => ({ default: () => null }));
vi.mock("@/components/sits/ApplicationModal", () => ({ default: () => null }));
vi.mock("@/components/seo/LegacyProjetRedirect", () => ({ default: () => null }));
vi.mock("@/components/sits/PublicSitView", () => ({ default: (p: any) => <h1 data-testid="fiche">{p?.sit?.title} · {p?.pets?.length} · {p?.owner?.first_name}</h1> }));

const requested: string[] = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    rpc: (fn: string) => { requested.push(`rpc:${fn}`); return Promise.resolve({ data: [], error: null }); },
    from: (table: string) => {
      requested.push(table);
      const builder: any = new Proxy({}, { get: (_t, key: string) => key === "then" ? (ok: any) => Promise.resolve({ data: [], error: null }).then(ok) : key === "maybeSingle" ? () => Promise.resolve({ data: null, error: null }) : () => builder });
      return builder;
    },
  },
}));

import PublicSitDetail from "@/pages/PublicSitDetail";
import { SIT_PREFETCH_SPEC, sitPrefetchScript } from "../../../scripts/vite-plugin-listings-prefetch.mjs";

const sit = { id: "s1", slug: "garde-lyon", title: "Garde à Lyon", user_id: "o1", property_id: "p1", status: "published", city: "Lyon", country: "FR", departement_code: "69" };
const run = (html: string) => new Function(html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""))();

beforeEach(() => { requested.length = 0; (window as any).__GUARDIENS_SIT__ = undefined; localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("fiche lue dès le HTML (lot perf 5)", () => {
  it("parité : mêmes tables, colonnes et filtres que PublicSitDetail", () => {
    const src = readFileSync("src/pages/PublicSitDetail.tsx", "utf8");
    for (const [k, v] of Object.entries(SIT_PREFETCH_SPEC) as [string, any][]) {
      if (v.rpc) { expect(src, k).toContain(`rpc("${v.rpc}", { ${v.arg}: sitData.${v.from} })`); continue; }
      expect(src, k).toMatch(new RegExp(`from\\("${v.table}"[^)]*\\)[\\s.]*select\\("${v.select.replace(/[*]/g, "\\*")}"\\)`));
    }
    expect(src).toMatch(/rpc\("get_public_sit", \{ p_param: param \}\)/);
    expect(src).toMatch(/takeSitPrefetch\(param, !user\)/);
  });

  it("visiteur : l'annonce puis toutes ses lectures, avec la clé publique", async () => {
    const calls: { url: string; body?: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: any) => {
      calls.push({ url, body: init.body });
      return { ok: true, json: async () => (url.includes("rpc/get_public_sit") ? [sit] : [{ id: "x" }]) } as any;
    }));
    window.history.replaceState(null, "", "/annonces/garde-lyon");
    run(sitPrefetchScript("https://x.supabase.co", "anon"));
    const data = await (window as any).__GUARDIENS_SIT__.p;
    expect(calls[0].url).toBe("https://x.supabase.co/rest/v1/rpc/get_public_sit");
    expect(JSON.parse(calls[0].body!)).toEqual({ p_param: "garde-lyon" });
    expect(calls.map((c) => c.url)).toContain("https://x.supabase.co/rest/v1/owner_gallery?select=photo_url,position,width,height&user_id=eq.o1&order=position.asc");
    expect(calls.map((c) => c.url)).toContain("https://x.supabase.co/rest/v1/public_pets?select=*&property_id=eq.p1");
    expect(JSON.parse(calls.find((c) => c.url.endsWith("rpc/public_profile_reviews"))!.body!)).toEqual({ p_user_id: "o1" });
    expect(Object.keys(data).sort()).toEqual(["badges", "gallery", "houseGuide", "owner", "ownerProfile", "pets", "property", "reviews", "sit"]);
  });

  it("rien pour un membre, pour /annonces/international ni pour la liste", () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    localStorage.setItem("sb-x-auth-token", "{}");
    window.history.replaceState(null, "", "/annonces/garde-lyon");
    run(sitPrefetchScript("https://x.supabase.co", "anon"));
    localStorage.clear();
    for (const p of ["/annonces/international", "/annonces", "/annonces/demo/chalet"]) {
      window.history.replaceState(null, "", p);
      run(sitPrefetchScript("https://x.supabase.co", "anon"));
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("la fiche reprend les lectures du HTML : aucune lecture de plus", async () => {
    (window as any).__GUARDIENS_SIT__ = { at: Date.now(), param: "garde-lyon", p: Promise.resolve({
      sit: [sit], owner: [{ id: "o1", first_name: "Anne", city: "Lyon" }], property: [{ id: "p1", photos: [] }], reviews: [], badges: [],
      gallery: [], pets: [{ id: "pt", species: "cat" }], ownerProfile: [], houseGuide: [],
    }) };
    render(<MemoryRouter initialEntries={["/annonces/garde-lyon"]}><Routes><Route path="/annonces/:id" element={<PublicSitDetail />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(document.querySelector('[data-testid="fiche"]')?.textContent).toBe("Garde à Lyon · 1 · Anne"));
    expect(requested).toEqual([]);
  });

  it("autre fiche dans le HTML : lecture habituelle", async () => {
    (window as any).__GUARDIENS_SIT__ = { at: Date.now(), param: "autre", p: Promise.resolve({ sit: [] }) };
    render(<MemoryRouter initialEntries={["/annonces/garde-lyon"]}><Routes><Route path="/annonces/:id" element={<PublicSitDetail />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(requested).toContain("rpc:get_public_sit"));
  });
});
