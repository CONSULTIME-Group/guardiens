import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, configure } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import {
  applyMemberStatusFilter,
  adminDeptLabel,
  DEFAULT_MEMBER_STATUS_FILTER,
  MEMBER_STATUS_FILTERS,
} from "@/lib/admin/memberList";
import { visibleMemberActions } from "@/pages/admin/_components/users/MemberActionsMenu";
import { NOT_DELETED_FILTER } from "@/pages/admin/_components/dashboard/useDashboardData";

configure({ asyncUtilTimeout: 8000 });
vi.setConfig({ testTimeout: 20000 });

/** Lot ADM15 : page Utilisateurs juste (compteurs, statut, menu, erreurs, téléphone). */

type Call = { table: string; chain: Array<[string, unknown[]]> };
const calls: Call[] = [];
let failList = false;
const ROW = {
  id: "m-1", first_name: "Fien", last_name: "Vrijders", role: "sitter", email: "fien@example.org",
  created_at: "2026-11-09T10:00:00Z", account_status: "active", postal_code: "98714", country: "FR",
};

function chainFor(table: string) {
  const rec: Call = { table, chain: [] };
  calls.push(rec);
  const proxy: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "then") {
          const isList = table === "profiles" && rec.chain.some(([k]) => k === "range")
            && rec.chain.some(([k, a]) => k === "select" && String(a[0]).includes("first_name"));
          const result = isList
            ? failList ? { data: null, count: null, error: { message: "boom" } } : { data: [ROW], count: 1, error: null }
            : { data: [], count: 7, error: null };
          return (res: any, rej: any) => Promise.resolve(result).then(res, rej);
        }
        if (prop === "maybeSingle" || prop === "single") return () => Promise.resolve({ data: null, error: null });
        return (...args: unknown[]) => { rec.chain.push([prop, args]); return proxy; };
      },
    },
  );
  return proxy;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => chainFor(t),
    rpc: () => Promise.resolve({ data: [], error: null }),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "admin-1" } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      resend: () => Promise.resolve({ error: null }),
    },
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }), createSignedUrl: () => Promise.resolve({ data: null }) }) },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1", email: "a@b.c" }, isAuthenticated: true, loading: false, logout() {} }),
}));

const wrap = (ui: React.ReactNode, url = "/admin/users") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};
const has = (c: Call, m: string, ...args: unknown[]) => c.chain.some(([k, a]) => k === m && args.every((x, i) => a[i] === x));
const isList = (c: Call) => c.table === "profiles" && c.chain.some(([k]) => k === "range")
  && c.chain.some(([k, a]) => k === "select" && String(a[0]).includes("first_name"));

const initialWidth = window.innerWidth;
beforeEach(() => { calls.length = 0; failList = false; });
afterEach(() => { Object.defineProperty(window, "innerWidth", { configurable: true, value: initialWidth }); });

describe("ADM15, règles pures", () => {
  it("statut par défaut : comptes supprimés exclus, même filtre que la vue d'ensemble", () => {
    expect(DEFAULT_MEMBER_STATUS_FILTER).toBe("current");
    const rec: Array<[string, unknown[]]> = [];
    const q: any = { or: (...a: unknown[]) => { rec.push(["or", a]); return q; }, eq: (...a: unknown[]) => { rec.push(["eq", a]); return q; } };
    applyMemberStatusFilter(q, "current");
    expect(rec).toEqual([["or", [NOT_DELETED_FILTER]]]);
    rec.length = 0; applyMemberStatusFilter(q, "deleted");
    expect(rec).toEqual([["eq", ["account_status", "deleted"]]]);
    rec.length = 0; applyMemberStatusFilter(q, "all");
    expect(rec).toEqual([]);
    expect(MEMBER_STATUS_FILTERS.map((f) => f.label)).toContain("Supprimés");
  });

  it("département des collectivités d'outre-mer", () => {
    expect(adminDeptLabel("98714")).toBe("987 Polynésie française");
    expect(adminDeptLabel("98800")).toBe("988 Nouvelle-Calédonie");
    expect(adminDeptLabel("69005")).toBe("69 Rhône");
    expect(adminDeptLabel("1350")).toBe("·");
    expect(adminDeptLabel(null)).toBe("·");
  });

  it("menu : compte supprimé en lecture seule, renvoi seulement sur email non confirmé connu", () => {
    const base = { id: "x", name: "X" };
    expect(visibleMemberActions({ ...base, account_status: "deleted" })).toEqual(["last-message", "note"]);
    expect(visibleMemberActions(base)).not.toContain("resend-confirmation");
    expect(visibleMemberActions({ ...base, email_confirmed: false })).toContain("resend-confirmation");
    expect(visibleMemberActions({ ...base, email_confirmed: true })).not.toContain("resend-confirmation");
    expect(visibleMemberActions(base)).toContain("delete");
  });

  it("menu borné à la hauteur disponible, libellés distincts", () => {
    const src = readFileSync("src/pages/admin/_components/users/MemberActionsMenu.tsx", "utf8");
    expect(src).toContain("max-h-[var(--radix-dropdown-menu-content-available-height)]");
    expect(src).toContain("overflow-y-auto");
    expect(src).toContain("collisionPadding={8}");
    expect(src).toContain("Email personnel");
    expect(src).toContain("Message dans la messagerie");
    expect(src).not.toContain("Écrire à ce membre</DropdownMenuItem>");
  });

  it("renvoi de confirmation : confirmation puis ligne de journal", () => {
    const src = readFileSync("src/pages/admin/AdminUsers.tsx", "utf8");
    expect(src).not.toContain("handleResendConfirmation");
    expect(src).toContain('action: "resend_signup_confirmation"');
    expect(src).toContain("Renvoyer l'email de confirmation ?");
    expect(readFileSync("src/lib/admin/labels.ts", "utf8")).toContain("resend_signup_confirmation");
  });
});

describe("ADM15, page", () => {
  it("compteurs hors comptes supprimés et liste sans comptes supprimés par défaut", async () => {
    const { default: Page } = await import("@/pages/admin/AdminUsers");
    wrap(<Page />);
    await waitFor(() => expect(calls.some(isList)).toBe(true));
    const list = calls.find(isList)!;
    expect(has(list, "or", NOT_DELETED_FILTER)).toBe(true);
    const counts = calls.filter((c) => c.table === "profiles" && c.chain.some(([k, a]) => k === "select" && (a[1] as any)?.head));
    const newCount = counts.find((c) => c.chain.some(([k]) => k === "gte"))!;
    expect(has(newCount, "or", NOT_DELETED_FILTER)).toBe(true);
    const verified = counts.find((c) => has(c, "eq", "identity_verification_status", "verified"))!;
    expect(has(verified, "or", NOT_DELETED_FILTER)).toBe(true);
    expect(await screen.findByText("Membres")).toBeTruthy();
    expect(screen.queryByText("Total inscrits")).toBeNull();
    expect(screen.getAllByTestId("users-kpi")).toHaveLength(6);
    expect(await screen.findByText("987 Polynésie française")).toBeTruthy();
  });

  it("lecture en échec : dite, relançable, jamais « aucun membre »", async () => {
    failList = true;
    const { default: Page } = await import("@/pages/admin/AdminUsers");
    wrap(<Page />);
    expect(await screen.findByTestId("users-list-unavailable")).toBeTruthy();
    expect(screen.queryByText("Liste vide pour ces filtres.")).toBeNull();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });

  it("téléphone : une carte par membre, Actions à 44 px", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const { default: Page } = await import("@/pages/admin/AdminUsers");
    wrap(<Page />);
    const cards = await screen.findByTestId("users-cards");
    await waitFor(() => expect(cards.textContent).toContain("Fien Vrijders"));
    const btn = screen.getByRole("button", { name: "Actions pour Fien Vrijders" });
    expect(btn.className).toContain("h-11");
    expect(document.querySelector("table")).toBeNull();
  });
});
