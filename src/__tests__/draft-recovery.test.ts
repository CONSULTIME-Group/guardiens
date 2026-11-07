import { describe, it, expect } from "vitest";
import { missingDraftItems, loadMissingDraftItems, draftReminderUrl } from "../../supabase/functions/_shared/sit-draft-missing";
import { nextDraftReminderStage, draftReminderStillRelevant } from "../../supabase/functions/_shared/draft-reminder-policy";
import { draftReminderLabel, loadDraftFollowups } from "@/lib/admin/draftFollowup";
import { draftReadiness } from "@/lib/admin/draftReadiness";
const now = Date.parse("2026-11-07T12:00:00Z");
const complete = { title: "Garde de la maison", start_date: "2026-12-24", end_date: "2027-01-03", absence_reason: "Vacances en famille", sitter_expectations: "Arroser nos plantes", city: "Paris", hasProperty: true, hasPhoto: true, hasPets: false };
const sent = { status: "sent", created_at: "2026-10-29T10:00:00Z", metadata: { idempotency_key: "draft-1" } };

describe("Relance conforme au parcours réel", () => {
  it("une garde sans animaux est complète", () => expect(missingDraftItems(complete, "2026-11-07")).toEqual([]));
  it("dates inversées, titre trop long, photo absente sont nommés", () => {
    const ids = missingDraftItems({ ...complete, title: "x".repeat(121), end_date: "2026-12-01", hasPhoto: false }, "2026-11-07").map(m => m.id);
    expect(ids).toContain("date-error"); expect(ids).toContain("title-long"); expect(ids).toContain("photo");
  });
  it("une date absente reste à compléter, elle n'est pas classée passée", () => {
    const result = draftReadiness({ ...complete, id: "a", status: "draft", start_date: null }, { hasProperty: true, hasPhoto: true, hasPets: false }, "2026-11-07");
    expect(result.blocked).toBeNull(); expect(result.missing.map(m => m.id)).toContain("dates");
  });
  it("reprend la même annonce et cible le premier champ manquant", () => {
    const url = new URL(draftReminderUrl("a", [{ id: "photo", label: "Photo" }]));
    expect(url.pathname).toBe("/sits/create"); expect(url.searchParams.get("resume")).toBe("a"); expect(url.searchParams.get("focus")).toBe("photo");
  });
  it("une panne de lecture ne produit jamais une fausse annonce complète", async () => {
    const q: any = { select: () => q, eq: () => q, maybeSingle: () => Promise.resolve({ error: { message: "unavailable" } }), then: (r: any) => Promise.resolve({ error: { message: "unavailable" } }).then(r) };
    await expect(loadMissingDraftItems({ from: () => q }, { user_id: "u" })).rejects.toThrow("draft_context_unavailable");
  });
  it("une photo de galerie et la ville du profil suffisent", async () => {
    const rows: Record<string, any> = { properties: { data: { id: "p", photos: [] } }, owner_gallery: { count: 1 }, profiles: { data: { city: "Paris" } } };
    const client = { from(table: string) { const q: any = { select: () => q, eq: () => q, maybeSingle: () => Promise.resolve(rows[table]), then: (r: any) => Promise.resolve(rows[table]).then(r) }; return q; } };
    await expect(loadMissingDraftItems(client, { ...complete, user_id: "u", city: null, hasPhoto: false })).resolves.toEqual([]);
  });
});

describe("Deux relances au plus, état réel avant envoi", () => {
  it("un échec reste réessayable", () => expect(nextDraftReminderStage([{ ...sent, status: "failed" }], null, now)).toBe(1));
  it("la seconde attend sept jours et une connexion dans les trente jours", () => {
    expect(nextDraftReminderStage([sent], "2026-11-01", now)).toBe(2);
    expect(nextDraftReminderStage([sent], "2026-09-01", now)).toBeNull();
    expect(nextDraftReminderStage([{ ...sent, created_at: "2026-11-05" }], "2026-11-01", now)).toBeNull();
    expect(nextDraftReminderStage([sent], null, now)).toBeNull();
  });
  it("deux envois ou un envoi de seconde relance interdisent une troisième", () => {
    expect(nextDraftReminderStage([sent, { ...sent, metadata: { idempotency_key: "manual" } }], "2026-11-01", now)).toBeNull();
    expect(nextDraftReminderStage([{ ...sent, metadata: { reminder_stage: 2 } }], "2026-11-01", now)).toBeNull();
  });
  it("un report actif bloque, un ancien report drainé ne bloque plus", () => {
    expect(nextDraftReminderStage([{ ...sent, status: "deferred" }], "2026-11-01", now)).toBeNull();
    expect(nextDraftReminderStage([{ ...sent, status: "deferred", created_at: "2026-10-28" }, sent], "2026-11-01", now)).toBe(2);
  });
  it("annonce publiée, retirée, supprimée ou garde commencée : relance annulée", () => {
    for (const sit of [null, { status: "published" }, { status: "draft", published_at: "2026-01-01" }, { status: "draft", unpublished_at: "2026-01-01" }, { status: "draft", start_date: "2026-11-06" }]) expect(draftReminderStillRelevant(sit, "2026-11-07")).toBe(false);
    expect(draftReminderStillRelevant({ status: "draft", start_date: null }, "2026-11-07")).toBe(true);
  });
});

describe("Suivi admin sans déduire des intentions", () => {
  it("distingue envoi, remise, clic, échec et absence de trace", () => {
    expect(draftReminderLabel(null)).toContain("Aucune relance");
    expect(draftReminderLabel(sent)).toBe("Relance envoyée");
    expect(draftReminderLabel({ ...sent, delivered_at: "2026-10-29" })).toBe("Relance remise");
    expect(draftReminderLabel({ ...sent, first_clicked_at: "2026-10-29" })).toContain("clic enregistré");
    expect(draftReminderLabel({ ...sent, bounced_at: "2026-10-29" })).toBe("Relance non remise");
  });
  it("une panne de l'historique ne devient pas aucune relance", async () => {
    const q: any = { select: () => q, in: () => q, not: () => q, order: () => q, eq: () => q, or: () => q, range: () => Promise.resolve({ data: null, error: new Error("offline") }) };
    await expect(loadDraftFollowups({ from: () => q, rpc: () => Promise.resolve({ data: [], error: null }) }, [{ id: "s", user_id: "u" }])).rejects.toThrow("offline");
  });
});
