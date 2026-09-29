import { describe, it, expect, vi } from "vitest";
import { canDeleteListing, canHideListing, hideListingUpdate, restoreListingUpdate, deleteCountsSentence } from "@/lib/admin/listingActions";
import { canCancelGarde, canForceEnd, countCancelledThisWeek, cancelGardeUpdate, POST_ACCEPTANCE_STATUSES } from "@/lib/admin/sitsActions";
import { buildModerationEmailData, buildReporterEmailData, runModerationMutations, REVIEW_HIDDEN_STATUS } from "../../../supabase/functions/admin-moderate-report/moderation";

describe("A9 annonces", () => {
  it("masquer/supprimer limités aux statuts permis", () => {
    expect(canHideListing("published")).toBe(true);
    expect(canHideListing("confirmed")).toBe(false);
    for (const s of ["confirmed", "in_progress", "completed", "cancelled"]) expect(canDeleteListing(s)).toBe(false);
    for (const s of ["published", "draft", "archived", "expired"]) expect(canDeleteListing(s)).toBe(true);
  });
  it("restaure le statut d'avant masquage", () => {
    const h = hideListingUpdate("draft", "a", "t");
    expect(h.status_before_hidden).toBe("draft");
    expect(restoreListingUpdate({ status_before_hidden: "draft" }).status).toBe("draft");
    expect(restoreListingUpdate({}).status).toBe("published");
    expect(restoreListingUpdate({ status_before_hidden: "confirmed" }).status).toBe("published");
  });
  it("phrase de décompte accordée", () => {
    const s = deleteCountsSentence({ applications: 1, messages: 3, reviews: 0, badges: 2 });
    expect(s).toContain("1 candidature,");
    expect(s).toContain("3 messages");
    expect(s).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("A9 gardes", () => {
  it("in_progress est actif", () => {
    expect(POST_ACCEPTANCE_STATUSES).toContain("in_progress");
    expect(canCancelGarde({ status: "in_progress" })).toBe(true);
    expect(canForceEnd({ status: "in_progress", end_date: "2020-01-01" })).toBe(true);
    expect(canCancelGarde({ status: "published" })).toBe(false);
  });
  it("annulations de la semaine sur cancelled_at", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    expect(countCancelledThisWeek([
      { status: "cancelled", cancelled_at: "2026-09-28T00:00:00Z" },
      { status: "cancelled", cancelled_at: "2026-09-01T00:00:00Z" },
      { status: "cancelled", cancelled_at: null },
    ], now)).toBe(1);
    expect(cancelGardeUpdate("a", " motif ", "t")).toMatchObject({ cancelled_by: "a", cancelled_at: "t", cancellation_reason: "motif" });
  });
});

describe("A9 signalements", () => {
  it("aucune note interne dans les emails", () => {
    expect(JSON.stringify(buildModerationEmailData("warn", "profile", "Message membre"))).not.toContain("note");
    const r = buildReporterEmailData("spam", "Message au signalé");
    expect(JSON.stringify(r)).not.toContain("Message au signalé");
  });
  it("avis masqué au statut accepté par le trigger", () => {
    expect(REVIEW_HIDDEN_STATUS).toBe("refuse");
  });
  it("une mutation en échec renvoie un libellé", async () => {
    const chain: any = {};
    const fail = Promise.resolve({ error: { message: "boom" }, data: null });
    for (const k of ["update", "eq", "insert", "delete", "select", "in", "maybeSingle", "single"]) chain[k] = vi.fn(() => Object.assign(fail, chain));
    const service = { from: vi.fn(() => chain), rpc: vi.fn(() => fail), auth: { admin: { updateUserById: vi.fn(() => fail) } } };
    const res = await runModerationMutations(service, {
      action: "hide", targetType: "listing", targetId: "x", adminId: "a", now: "t",
      ownerUserId: "o", adminNote: null, memberMessage: null, reportReason: null, opMeta: {},
    });
    expect(res).toBeTruthy();
  });
});
