/**
 * Lot ADM3 (18/10/2026) : brouillons prêts à publier et chiffres qui mènent aux annonces.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { draftReadiness, parisToday, type DraftLike, type OwnerDraftContext } from "@/lib/admin/draftReadiness";
import { LISTING_FILTERS, listingFilterScope } from "@/lib/admin/listingSituation";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const TODAY = "2026-10-18";
const ctx: OwnerDraftContext = { hasProperty: true, hasPhoto: true, hasPets: true };
// Brouillon complet, sur le modèle de Brassac (c5c1bc39) en base le 18/10/2026.
const brassac: DraftLike = {
  id: "c5c1bc39", user_id: "u1", status: "draft", title: "Garde 4 chiens et 2 chats", city: "Brassac 82",
  start_date: "2027-01-28", end_date: "2027-02-10",
  absence_reason: "x".repeat(107), sitter_expectations: "y".repeat(322),
  cover_photo_url: null, published_at: null, unpublished_at: null, last_unpublished_reason: null,
};

describe("draftReadiness", () => {
  it("un brouillon complet jamais publié est prêt", () => {
    expect(draftReadiness(brassac, ctx, TODAY)).toEqual({ ready: true, missing: [], blocked: null });
  });

  it("un brouillon retiré par son propriétaire n'est jamais proposé (décision du 18/10)", () => {
    const withdrawn = { ...brassac, published_at: "2026-10-01T10:00:00Z", unpublished_at: "2026-10-05T10:00:00Z", last_unpublished_reason: "plans_changed" };
    expect(draftReadiness(withdrawn, ctx, TODAY)).toMatchObject({ ready: false, blocked: "withdrawn" });
  });

  it("dates passées, ville vide, champ court ou contexte inconnu : pas prêt", () => {
    expect(draftReadiness({ ...brassac, start_date: "2026-10-17" }, ctx, TODAY).blocked).toBe("past");
    expect(draftReadiness({ ...brassac, city: " " }, ctx, TODAY).blocked).toBe("no_city");
    // Marie-Galante le 18/10 : champ « pourquoi » à 6 caractères.
    const short = draftReadiness({ ...brassac, absence_reason: "voyage" }, ctx, TODAY);
    expect(short.ready).toBe(false);
    expect(short.missing.map((m) => m.id)).toEqual(["desc-reason"]);
    expect(draftReadiness(brassac, undefined, TODAY).ready).toBe(false);
    expect(draftReadiness(brassac, { ...ctx, hasPets: false }, TODAY).missing.map((m) => m.id)).toEqual(["pets"]);
    expect(draftReadiness(brassac, { ...ctx, hasPhoto: false }, TODAY).missing.map((m) => m.id)).toEqual(["photo"]);
  });

  it("jour de Paris, pas jour UTC", () => {
    expect(parisToday(new Date("2026-10-18T22:30:00Z"))).toBe("2026-10-19");
  });
});

describe("Filtres de la liste des annonces", () => {
  it("« ready » et « recent » existent, avec leur périmètre serveur", () => {
    expect(LISTING_FILTERS).toContain("ready");
    expect(LISTING_FILTERS).toContain("recent");
    expect(listingFilterScope("ready")).toEqual({ status: "draft", unpublished: "null" });
    expect(listingFilterScope("recent")).toEqual({ publishedSinceDays: 7 });
  });

  it("« Publier à sa place » : brouillon prêt seulement, journal d'audit, garde-fous de la base respectés", () => {
    const src = read("src/pages/admin/AdminListings.tsx");
    expect(src).toContain("isReady(listing) && (");
    expect(src).toContain('action: "publish_on_behalf"');
    expect(src).toContain('.eq("status", "draft")');
    expect(src).toContain('.is("unpublished_at", null)');
    expect(src).toContain("Publication refusée : ${error.message}");
  });

  it("chaque tuile du flux mène à la liste de même périmètre", () => {
    const src = read("src/pages/admin/_components/dashboard/KeyFiguresRow.tsx");
    expect(src).toContain('navigate("/admin/listings?filter=recent")');
    expect(src).toContain('navigate("/admin/listings?filter=ready")');
    const data = read("src/pages/admin/_components/dashboard/useDashboardData.ts");
    expect(data).toContain('.gte("published_at", d7)');
    expect(data).toContain("loadReadyDrafts(supabase)");
  });
});
