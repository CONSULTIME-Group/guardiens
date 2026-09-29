import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, configure } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createSeqGuard, ilikeContains } from "@/lib/admin/requestSeq";
import { buildCsv, csvCell, CSV_BOM, TRUNCATED_NOTICE } from "@/lib/admin/csv";
import { dedupeByMessageId } from "@/lib/admin/emailLogStats";

// Cause de l'instabilité : ces écrans admin se chargent par import dynamique
// (1,3 s mesurées seul). Sous la charge de la suite complète, ce premier rendu
// dépasse le délai par défaut de 1 s de waitFor/findBy et de 5 s par test.
configure({ asyncUtilTimeout: 8000 });
vi.setConfig({ testTimeout: 20000 });

/**
 * Faux client : chaque chaîne de requête enregistre ses appels
 * (table, méthode, arguments) et se résout sur une liste vide.
 */
type Call = { table: string; chain: Array<[string, unknown[]]> };
const calls: Call[] = [];
const rpcCalls: Array<[string, unknown]> = [];

function chainFor(table: string) {
  const rec: Call = { table, chain: [] };
  calls.push(rec);
  const result = { data: [], count: 0, error: null };
  const proxy: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "then") return (res: any, rej: any) => Promise.resolve(result).then(res, rej);
        if (prop === "maybeSingle" || prop === "single") return () => Promise.resolve({ data: null, error: null });
        return (...args: unknown[]) => {
          rec.chain.push([prop, args]);
          return proxy;
        };
      },
    },
  );
  return proxy;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => chainFor(t),
    rpc: (name: string, args: unknown) => {
      rpcCalls.push([name, args]);
      return Promise.resolve({ data: name.startsWith("admin_message") ? null : [], error: null });
    },
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }), createSignedUrl: () => Promise.resolve({ data: null }) }) },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1", email: "a@b.c" }, isAuthenticated: true, loading: false, logout() {} }),
}));

const wrap = (ui: React.ReactNode, url: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
};

const has = (c: Call, m: string, ...args: unknown[]) =>
  c.chain.some(([k, a]) => k === m && args.every((x, i) => a[i] === x));

beforeEach(() => {
  calls.length = 0;
  rpcCalls.length = 0;
});

describe("garde de séquence", () => {
  it("une réponse périmée est ignorée, la dernière demandée gagne", async () => {
    const guard = createSeqGuard();
    const applied: string[] = [];
    const run = async (label: string, delay: number) => {
      const t = guard.next();
      await new Promise((r) => setTimeout(r, delay));
      if (guard.isCurrent(t)) applied.push(label);
    };
    await Promise.all([run("lente", 30), run("rapide", 5)]);
    expect(applied).toEqual(["rapide"]);
  });
  it("ilike : % et _ échappés", () => {
    expect(ilikeContains("a%b_c")).toBe("%a\\%b\\_c%");
  });
});

describe("export CSV", () => {
  it("commence par le BOM UTF-8", () => {
    expect(buildCsv(["A"], [["x"]]).startsWith(CSV_BOM)).toBe(true);
  });
  it("neutralise = + - @ par une apostrophe", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("+33")).toBe(`"'+33"`);
    expect(csvCell("-1")).toBe(`"'-1"`);
    expect(csvCell("@x")).toBe(`"'@x"`);
    expect(csvCell("Lyon")).toBe(`"Lyon"`);
    expect(csvCell('a"b')).toBe(`"a""b"`);
  });
});

describe("déduplication par message_id", () => {
  it("garde le dernier statut", () => {
    const r = dedupeByMessageId([
      { id: "1", message_id: "m", status: "pending", created_at: "2026-09-01T10:00:00Z" },
      { id: "2", message_id: "m", status: "sent", created_at: "2026-09-01T10:01:00Z" },
    ] as any);
    expect(r).toHaveLength(1);
    expect((r[0] as any).status).toBe("sent");
  });
});

describe("onglet Projets au premier rendu", () => {
  it("aucune requête de liste sur l'entraide", async () => {
    const { default: Page } = await import("@/pages/admin/AdminSmallMissions");
    wrap(<Page />, "/admin/small-missions?tab=projets");
    await waitFor(() => {
      expect(calls.some((c) => c.table === "small_missions" && has(c, "range"))).toBe(true);
    });
    const listCalls = calls.filter(
      (c) => c.table === "small_missions" && c.chain.some(([k, a]) => k === "select" && String(a[0]).includes("poster")),
    );
    expect(listCalls.length).toBeGreaterThan(0);
    for (const c of listCalls) {
      expect(has(c, "eq", "category", "projet")).toBe(true);
      expect(has(c, "neq", "category", "projet")).toBe(false);
    }
    expect(screen.queryByLabelText("Catégorie")).toBeNull();
  });
});

describe("filtres passés dans l'URL", () => {
  it("AdminUsers ?user= filtre sur ce membre et le dit s'il est introuvable", async () => {
    const { default: Page } = await import("@/pages/admin/AdminUsers");
    wrap(<Page />, "/admin/users?user=u-42");
    await waitFor(() => {
      expect(calls.some((c) => c.table === "profiles" && has(c, "eq", "id", "u-42"))).toBe(true);
    });
    expect(await screen.findByText("Aucun membre ne correspond à cet identifiant.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retirer le filtre" })).toBeTruthy();
  });

  it("AdminListings ?sit= lit l'annonce sans filtre de statut", async () => {
    const { default: Page } = await import("@/pages/admin/AdminListings");
    wrap(<Page />, "/admin/listings?sit=s-7");
    await waitFor(() => {
      expect(calls.some((c) => c.table === "sits" && has(c, "eq", "id", "s-7"))).toBe(true);
    });
    const c = calls.find((x) => x.table === "sits" && has(x, "eq", "id", "s-7"))!;
    expect(c.chain.some(([k, a]) => (k === "eq" || k === "neq") && a[0] === "status")).toBe(false);
    expect(await screen.findByText("Aucune annonce ne correspond à cet identifiant.")).toBeTruthy();
  });

  it("AdminListings ?owner= filtre sur le propriétaire", async () => {
    const { default: Page } = await import("@/pages/admin/AdminListings");
    wrap(<Page />, "/admin/listings?owner=o-1");
    await waitFor(() => {
      expect(calls.some((c) => c.table === "sits" && has(c, "eq", "user_id", "o-1"))).toBe(true);
    });
  });

  it("AdminVerifications ?id= signale un membre sans vérification en attente", async () => {
    const { default: Page } = await import("@/pages/admin/AdminVerifications");
    wrap(<Page />, "/admin/verifications?id=v-9");
    expect(
      await screen.findByText("Ce membre n'a aucune vérification en attente. Consultez l'historique ci-dessous."),
    ).toBeTruthy();
  });

  it("AdminMessages ?conversation= ouvre l'onglet Conversations et cherche ce fil", async () => {
    const { default: Page } = await import("@/pages/admin/AdminMessages");
    wrap(<Page />, "/admin/messages?conversation=c-3");
    await waitFor(() => {
      expect(rpcCalls.some(([n, a]) => n === "admin_get_conversation_messages" && (a as any).p_conversation_id === "c-3")).toBe(true);
    });
    expect(await screen.findByText("Ce fil est introuvable ou ne contient aucun message.")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Conversations" }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("bandeaux données partielles", () => {
  it("le libellé est celui demandé", () => {
    expect(TRUNCATED_NOTICE).toBe("Données partielles, plus de 50 000 lignes sur la période");
  });
  it("les écrans lisent truncated, plus aucun seuil codé en dur", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of [
      "src/pages/admin/AdminEmails.tsx",
      "src/pages/admin/AdminLifecycle.tsx",
      "src/pages/admin/AdminNurturing.tsx",
      "src/pages/admin/_components/SitterDigestTab.tsx",
      "src/pages/admin/AdminSmallMissions.tsx",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toContain("TRUNCATED_NOTICE");
      expect(src, f).not.toMatch(/\.limit\((5000|10000|20000|50000)\)/);
    }
  });
});
