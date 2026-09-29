import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, configure, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { normalizeMemberCard } from "@/lib/admin/memberCard";
import { visibleMemberActions } from "@/pages/admin/_components/users/MemberActionsMenu";

configure({ asyncUtilTimeout: 8000 });
vi.setConfig({ testTimeout: 20000 });

/* ── Données simulées ── */
const USER = {
  id: "u-1", first_name: "Camille", last_name: "Durand", email: "camille@example.fr", role: "sitter",
  city: "Lyon", postal_code: "69001", country: "FR", avatar_url: null, profile_completion: 80,
  created_at: "2026-01-10T10:00:00Z", last_seen_at: null, identity_verified: false,
  identity_verification_status: "pending", account_status: "active", is_founder: false,
  identity_document_url: "doc.jpg", identity_selfie_url: null,
};
const CARD = {
  identity: { ...USER, roles: ["user"], has_identity_documents: true, email_confirmed: false, is_manual_super: false, identity_verified_at: null, identity_last_log_at: "2026-02-01T00:00:00Z" },
  owner: { sits_by_status: { published: 1 }, recent_sits: [{ id: "s-1", title: "Garde à Lyon", start_date: "2026-10-01", end_date: "2026-10-10", status: "published", applications_count: 2 }] },
  sitter: { applications_by_status: { pending: 1 }, completed_sits: 3, is_available: true, recent_applications: [{ id: "a-1", sit_id: "s-9", sit_title: "Chats à Annecy", status: "pending", created_at: "2026-09-01T00:00:00Z" }] },
  mutual_aid: { missions_by_status: {}, responses_by_status: {} },
  reviews: { received_count: 2, received_avg: 4.5, given_count: 1, hidden_count: 0 },
  reports: { targeting_by_status: {}, made_count: 0 },
  messaging: { conversations_count: 4, last_activity_at: "2026-09-20T00:00:00Z", last_conversation_id: "c-1" },
  team_messages: [{ id: "m-1", sent_at: "2026-09-10T00:00:00Z", status: "success", excerpt: "Bonjour Camille", error_message: null, conversation_id: "c-2" }],
  moderation: { admin_notes: "Très fiable", suspension_reason: null },
  history: [{ id: "h-1", created_at: "2026-09-11T00:00:00Z", action: "toggle_super_gardien", note: null, admin_name: "Jérémie" }],
};

let cardMode: "ok" | "error" = "ok";
vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const result = table === "profiles" ? { data: [USER], count: 1, error: null } : { data: [], count: 0, error: null };
    const p: any = new Proxy({}, {
      get(_t, prop: string) {
        if (prop === "then") return (res: any, rej: any) => Promise.resolve(result).then(res, rej);
        if (prop === "maybeSingle" || prop === "single") return () => Promise.resolve({ data: null, error: null });
        return () => p;
      },
    });
    return p;
  };
  return {
    supabase: {
      from: (t: string) => chain(t),
      rpc: (name: string) => {
        if (name === "admin_get_member_card") {
          return Promise.resolve(cardMode === "ok" ? { data: CARD, error: null } : { data: null, error: { message: "boom" } });
        }
        return Promise.resolve({ data: [], error: null });
      },
      functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
      auth: {
        getUser: () => Promise.resolve({ data: { user: null } }),
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        resend: () => Promise.resolve({ error: null }),
      },
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
      channel: () => ({ on() { return this; }, subscribe() { return this; } }),
      removeChannel: () => {},
    },
  };
});
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "admin-1", email: "a@b.c" }, isAuthenticated: true, loading: false, logout() {} }),
}));

let lastSearch = "";
const LocationSpy = () => { lastSearch = useLocation().search; return null; };
const wrap = (url: string, ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>{ui}<LocationSpy /></MemoryRouter>
    </QueryClientProvider>,
  );
};
const loadPage = async () => (await import("@/pages/admin/AdminUsers")).default;

beforeEach(() => { cardMode = "ok"; lastSearch = ""; });

describe("A12, fonction admin_get_member_card (SQL)", () => {
  const dir = "drizzle/migrations";
  const file = readdirSync(dir).find((f) => f.includes("admin_get_member_card"))!;
  const sql = readFileSync(join(dir, file), "utf8");
  it("refuse un non-admin", () => {
    expect(sql).toMatch(/NOT public\.has_role\(auth\.uid\(\), 'admin'::app_role\)/);
    expect(sql).toMatch(/RAISE EXCEPTION/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.admin_get_member_card\(uuid\) FROM PUBLIC, anon/);
  });
  it("lecture seule, sans table ni colonne", () => {
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b\s/);
    expect(sql).not.toMatch(/CREATE TABLE|ALTER TABLE/i);
    expect(sql).toMatch(/STABLE/);
  });
  it("ne lit aucun contenu de message entre membres", () => {
    expect(sql).not.toMatch(/public\.messages\b/);
    expect(sql).not.toMatch(/\bFROM\s+messages\b/i);
  });
  it("listes vides par défaut (COALESCE), jamais null", () => {
    for (const k of ["recent_sits", "recent_applications", "team_messages", "history"]) {
      expect(sql).toContain(`'${k}'`);
    }
    expect((sql.match(/'\[\]'::jsonb/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
  it("un membre sans activité se normalise en listes vides, sans erreur", () => {
    const c = normalizeMemberCard({ identity: { id: "x" }, owner: {}, sitter: {}, history: null });
    expect(c.owner.recent_sits).toEqual([]);
    expect(c.sitter.recent_applications).toEqual([]);
    expect(c.team_messages).toEqual([]);
    expect(c.history).toEqual([]);
    expect(c.reviews.received_count).toBe(0);
    expect(normalizeMemberCard(null).identity).toBeNull();
  });
});

describe("A12, menu d'actions", () => {
  it("entrées selon le statut", () => {
    const base = { id: "x", name: "X" };
    expect(visibleMemberActions({ ...base, account_status: "suspended" })).toContain("reactivate");
    expect(visibleMemberActions({ ...base, account_status: "suspended" })).not.toContain("suspend");
    expect(visibleMemberActions({ ...base, account_status: "active" })).toContain("suspend");
    expect(visibleMemberActions({ ...base, email_confirmed: true })).not.toContain("resend-confirmation");
    expect(visibleMemberActions({ ...base, email_confirmed: false })).toContain("resend-confirmation");
    expect(visibleMemberActions({ ...base, has_identity_documents: false })).not.toContain("documents");
    expect(visibleMemberActions({ ...base, has_identity_documents: true })).toContain("documents");
  });

  it("« Supprimer définitivement » est séparé, destructif, et chaque entrée ouvre le bon dialogue", async () => {
    const Page = await loadPage();
    wrap("/admin/users", <Page />);
    const openMenu = async () => { const b = await screen.findByRole("button", { name: "Actions pour Camille Durand" }); b.focus(); fireEvent.keyDown(b, { key: "Enter" }); };

    await openMenu();
    const del = await screen.findByRole("menuitem", { name: "Supprimer définitivement" });
    expect(del.getAttribute("data-destructive")).toBe("true");
    expect(del.className).toContain("text-destructive");
    expect(del.previousElementSibling?.getAttribute("role")).toBe("separator");
    expect(screen.getByRole("menuitem", { name: "Consulter les pièces déposées" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Réactiver le compte" })).toBeNull();

    const cases: Array<[string, string | RegExp]> = [
      ["Supprimer définitivement", "Suppression définitive"],
      ["Suspendre le compte", "Suspendre le compte"],
      ["Note interne", "Note interne"],
      ["Changer le rôle", "Changer le rôle"],
      ["Voir le dernier message", /Dernier message envoyé à Camille Durand/],
    ];
    for (const [item, title] of cases) {
      await openMenu();
      fireEvent.click(await screen.findByRole("menuitem", { name: item }));
      const dlg = await screen.findByRole(item === "Supprimer définitivement" ? "alertdialog" : "dialog");
      expect(within(dlg).getByText(title)).toBeTruthy();
      fireEvent.keyDown(dlg, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole(item === "Supprimer définitivement" ? "alertdialog" : "dialog")).toBeNull());
    }
  });

  it("au plus 2 boutons par ligne du tableau", async () => {
    const Page = await loadPage();
    wrap("/admin/users", <Page />);
    await screen.findByRole("button", { name: "Actions pour Camille Durand" });
    const rows = screen.getAllByRole("row").slice(1);
    for (const r of rows) expect(within(r).queryAllByRole("button").length).toBeLessThanOrEqual(2);
  });
});

describe("A12, panneau fiche membre", () => {
  it("s'ouvre au clic sur le nom, rend les sections, se ferme en retirant ?membre=", async () => {
    const Page = await loadPage();
    wrap("/admin/users", <Page />);
    fireEvent.click(await screen.findByRole("button", { name: "Ouvrir la fiche de Camille Durand" }));
    await waitFor(() => expect(lastSearch).toContain("membre=u-1"));
    const panel = await screen.findByRole("dialog");
    for (const t of ["Vérification", "Propriétaire", "Gardien", "Entraide", "Avis", "Signalements", "Messagerie", "Messages de l'équipe", "Note interne", "Historique"]) {
      expect(within(panel).getByRole("heading", { name: t })).toBeTruthy();
    }
    expect(within(panel).getByText("Garde à Lyon").closest("a")?.getAttribute("href")).toBe("/admin/listings?sit=s-1");
    expect(within(panel).getByText("Super gardien modifié")).toBeTruthy();
    expect(within(panel).getByText("Aucune demande d'entraide publiée.")).toBeTruthy();
    expect(within(panel).getByRole("button", { name: "Actions pour Camille Durand" })).toBeTruthy();
    expect(within(panel).getByRole("button", { name: "Enregistrer la note" })).toBeTruthy();
    expect(panel.textContent ?? "").not.toMatch(/\b[a-z]+_[a-z_]+\b/);
    fireEvent.keyDown(panel, { key: "Escape" });
    await waitFor(() => expect(lastSearch).not.toContain("membre="));
  });

  it("s'ouvre directement par ?membre=", async () => {
    const Page = await loadPage();
    wrap("/admin/users?membre=u-1", <Page />);
    const panel = await screen.findByRole("dialog");
    expect(await within(panel).findByRole("heading", { name: "Camille Durand" })).toBeTruthy();
  });

  it("affiche « Chiffre indisponible » quand la lecture échoue", async () => {
    cardMode = "error";
    const Page = await loadPage();
    wrap("/admin/users?membre=u-1", <Page />);
    const panel = await screen.findByRole("dialog");
    expect(await within(panel).findByText("Chiffre indisponible")).toBeTruthy();
  });
});
