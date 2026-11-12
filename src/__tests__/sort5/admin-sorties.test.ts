// Lot SORT5 (13/11/2026) : lecture et pilotage des sorties dans l'espace admin.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ADMIN_OUTING_SOURCES,
  adminFillRate,
  adminOutingState,
  adminPlacesLabel,
  adminSourcesLabel,
  filterAdminOutings,
  lastSeenLabel,
  normalizeOverview,
  organizerAway,
  type AdminOutingRow,
} from "@/lib/admin/outingsAdmin";

const read = (p: string) => readFileSync(p, "utf8");
const sql = read("drizzle/migrations/0149_sort5_admin_sorties.sql");
const page = read("src/pages/admin/AdminOutings.tsx");
const NOW = new Date("2026-11-13T10:00:00Z");

const row = (over: Partial<AdminOutingRow> = {}): AdminOutingRow => ({
  id: "o1", slug: "belote-a-quatre-12345678", title: "Belote à quatre", category: "jeux", city: "Lyon",
  place_kind: "home", starts_at: "2026-11-20T17:00:00Z", created_at: "2026-11-12T09:00:00Z", status: "open",
  hidden_at: null, capacity: 4, reserved: 2, taken: 1, sources: { site: 1 }, alerts_sent: 3, reports_open: 0,
  organizer_id: "u1", organizer_first_name: "Martine", organizer_last_seen_at: "2026-11-12T18:00:00Z", ...over,
});

describe("lecture réservée aux admins", () => {
  it("les deux fonctions refusent tout appelant sans rôle admin et restent fermées aux visiteurs", () => {
    expect(sql.match(/IF auth\.uid\(\) IS NULL OR NOT public\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\) THEN/g)).toHaveLength(2);
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_outings_overview(integer) FROM PUBLIC, anon;");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_outing_set_hidden(uuid, boolean) FROM PUBLIC, anon;");
  });
  it("une seule lecture, bornée, sans toucher à l'entraide", () => {
    expect(sql).toContain("LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500)");
    expect(sql).not.toMatch(/small_missions/);
    expect(sql).not.toMatch(/\bemail\b/);
  });
  it("les compteurs demandés par Jérémie sont rendus", () => {
    for (const key of ["published_total", "with_attendee", "joins_by_source", "alerts_sent", "alerts_stopped", "reports_open", "flags"]) {
      expect(sql).toContain(`'${key}'`);
    }
  });
});

describe("règles de lecture", () => {
  it("l'état : masquage, puis annulation, puis date, puis places", () => {
    expect(adminOutingState(row({ hidden_at: "2026-11-12T10:00:00Z", status: "cancelled" }), NOW)).toBe("hidden");
    expect(adminOutingState(row({ status: "cancelled" }), NOW)).toBe("cancelled");
    expect(adminOutingState(row({ starts_at: "2026-11-01T17:00:00Z" }), NOW)).toBe("past");
    expect(adminOutingState(row({ taken: 2 }), NOW)).toBe("full");
    expect(adminOutingState(row(), NOW)).toBe("open");
  });
  it("places et origines en mots", () => {
    expect(adminPlacesLabel(row())).toBe("3 sur 4");
    expect(adminSourcesLabel({ site: 2, lien: 1 })).toBe("2 site, 1 lien partagé");
    expect(adminSourcesLabel({})).toBe("Aucun inscrit");
    expect(ADMIN_OUTING_SOURCES.map((s) => s.value)).toEqual(["site", "lien", "alerte", "garde"]);
  });
  it("part des sorties avec un inscrit, jamais de division par zéro", () => {
    expect(adminFillRate({ published_total: 0, with_attendee: 0 })).toBeNull();
    expect(adminFillRate({ published_total: 8, with_attendee: 3 })).toBe(38);
  });
  it("organisateur absent depuis 30 jours : seulement pour une sortie ouverte à venir", () => {
    expect(lastSeenLabel("2026-11-12T18:00:00Z", NOW)).toBe("Vu aujourd'hui");
    expect(lastSeenLabel(null, NOW)).toBe("Visite inconnue");
    expect(organizerAway(row({ organizer_last_seen_at: "2026-10-01T10:00:00Z" }), NOW)).toBe(true);
    expect(organizerAway(row({ organizer_last_seen_at: "2026-10-01T10:00:00Z", status: "cancelled" }), NOW)).toBe(false);
    expect(organizerAway(row(), NOW)).toBe(false);
  });
  it("« À regarder » : masquée, signalée ou organisateur absent", () => {
    const rows = [row({ id: "a" }), row({ id: "b", reports_open: 1 }), row({ id: "c", hidden_at: "2026-11-12T10:00:00Z" }),
      row({ id: "d", organizer_last_seen_at: "2026-09-01T10:00:00Z" }), row({ id: "e", starts_at: "2026-11-01T17:00:00Z" })];
    expect(filterAdminOutings(rows, "attention", NOW).map((r) => r.id)).toEqual(["b", "c", "d"]);
    expect(filterAdminOutings(rows, "upcoming", NOW).map((r) => r.id)).toEqual(["a", "b", "d"]);
    expect(filterAdminOutings(rows, "all", NOW)).toHaveLength(5);
  });
  it("une réponse incomplète se lit sans erreur", () => {
    const o = normalizeOverview({ counters: { published_total: "3" }, outings: [{ id: "x", capacity: "4", reserved: "1", taken: "2" }] });
    expect(o.counters.published_total).toBe(3);
    expect(o.counters.joins_total).toBe(0);
    expect(o.outings[0].taken).toBe(2);
    expect(normalizeOverview(null).outings).toEqual([]);
  });
});

describe("écran", () => {
  it("route, entrée de menu au quotidien, titre", () => {
    expect(read("src/App.tsx")).toContain('<Route path="/admin/sorties" element={<AdminOutings />} />');
    expect(read("src/components/admin/AdminSidebar.tsx")).toContain('{ to: "/admin/sorties", icon: CalendarHeart, label: "Sorties" }');
  });
  it("masquer et rétablir passent par une confirmation et le journal", () => {
    expect(page.match(/<ConfirmDialog/g)).toHaveLength(2);
    expect(page).toContain('action: hidden ? "outing_hidden" : "outing_restored"');
    expect(page).toContain("journal à compléter");
  });
  it("une lecture en échec se dit, jamais une liste vide", () => {
    expect(page).toContain("<ErrorState onRetry={() => refetch()} />");
    expect(page).toContain('reportAdminReadError("admin_outings_overview", error)');
  });
});
