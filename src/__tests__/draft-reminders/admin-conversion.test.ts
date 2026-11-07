// Tableau de bord des relances de brouillon (/admin/listings) : calcul pur et lectures groupées.
import { describe, expect, it } from "vitest";
import {
  summarizeDraftConversion, loadDraftConversion, reminderSitId, manualDraftReminderMessage, type ConversionInput,
} from "@/lib/admin/draftReminderConversion";

const NOW = Date.parse("2026-11-07T12:00:00Z");
const ago = (d: number) => new Date(NOW - d * 86400000).toISOString();
const id = (n: number) => `${String(n).repeat(8)}-0000-4000-8000-000000000000`;

function input(over: Partial<ConversionInput> = {}): ConversionInput {
  return {
    logs: [], drafts: [], sits: new Map(), publishedOwners: new Set(), productEmails: new Map(), lastSeen: new Map(),
    now: NOW, periodDays: 30, truncated: false, ...over,
  };
}
const log = (n: number, daysAgo: number, extra: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) => ({
  id: `log-${n}-${daysAgo}`, status: "sent", created_at: ago(daysAgo), delivered_at: ago(daysAgo), first_clicked_at: null, bounced_at: null,
  metadata: { idempotency_key: `sit-draft-reminder-${id(n)}`, sit_id: id(n), ...meta }, ...extra,
});

describe("rattachement d'une relance à son annonce", () => {
  it("lit sit_id, sinon la clé (anciens reports et anciennes relances admin)", () => {
    expect(reminderSitId({ metadata: { sit_id: id(1) } })).toBe(id(1));
    expect(reminderSitId({ metadata: { idempotency_key: `sit-draft-reminder-${id(2)}-2` } })).toBe(id(2));
    expect(reminderSitId({ metadata: { idempotency_key: `stale-draft-manual-${id(3)}-1793969626462` } })).toBe(id(3));
    expect(reminderSitId({ metadata: { idempotency_key: "autre-chose" } })).toBeNull();
  });
});

describe("effet mesuré des relances", () => {
  it("publication sous 7 jours comptée une fois par annonce, après envoi ou après clic", () => {
    const logs = [
      log(1, 20, { first_clicked_at: ago(19) }),
      log(2, 15),
      log(2, 8, {}, { idempotency_key: `sit-draft-reminder-${id(2)}-2`, reminder_stage: 2 }),
      log(3, 12),
    ];
    const sits = new Map([
      [id(1), { id: id(1), title: "Chat à Lyon", status: "published", published_at: ago(18) }], // après le clic
      [id(2), { id: id(2), title: "Maison", status: "published", published_at: ago(6) }],     // sous 7 jours de la seconde
      [id(3), { id: id(3), title: "Jardin", status: "published", published_at: ago(1) }],     // hors fenêtre
    ]);
    const s = summarizeDraftConversion(input({ logs, sits }));
    expect(s.campaign).toMatchObject({ sent: 4, delivered: 4, clicked: 1, remindedSits: 3, publishedSits: 2, publishedAfterClickSits: 1 });
    expect(s.campaign.conversionRate).toBeCloseTo(2 / 3);
    expect(s.details.find(d => d.sitId === id(3))!.attributed).toBeNull();
  });
  it("relances de moins de 7 jours, sans annonce ou vers une annonce supprimée : hors taux, avec avertissement", () => {
    const logs = [log(1, 2), log(2, 10), { ...log(9, 10), metadata: { idempotency_key: "inconnue" } }];
    const s = summarizeDraftConversion(input({ logs, sits: new Map([[id(1), { id: id(1), title: null, status: "draft", published_at: null }]]) }));
    expect(s.campaign).toMatchObject({ sent: 3, remindedSits: 0, publishedSits: 0, immatureSent: 1, unattributed: 1, sitDeleted: 1 });
    expect(s.campaign.conversionRate).toBeNull();
    expect(s.warnings.join(" ")).toMatch(/moins de 7 jours/);
    expect(s.warnings.join(" ")).toMatch(/sans annonce identifiable/);
    expect(s.warnings.join(" ")).toMatch(/supprimée/);
  });
  it("reports, annulations et refus ne sont jamais comptés comme envois ; période respectée", () => {
    const logs = [log(1, 10), { ...log(1, 11), status: "deferred" }, { ...log(2, 9), status: "unsubscribed_category" }, log(3, 60)];
    const s = summarizeDraftConversion(input({ logs }));
    expect(s.campaign.sent).toBe(1);
    expect(s.campaign.otherStatuses).toEqual({ deferred: 1, unsubscribed_category: 1 });
    expect(summarizeDraftConversion(input({ logs, periodDays: null })).campaign.sent).toBe(2);
  });
  it("lecture partielle signalée", () => {
    expect(summarizeDraftConversion(input({ truncated: true })).warnings[0]).toMatch(/partielle/);
  });
});

describe("stock admissible, mêmes règles que le serveur", () => {
  const draft = (n: number, over: Record<string, unknown> = {}) => ({
    id: id(n), user_id: `owner-${n}`, status: "draft", created_at: ago(5), start_date: "2026-12-20", published_at: null, unpublished_at: null, ...over,
  });
  it("motifs de non-relance distincts", () => {
    const drafts = [
      draft(1), // admissible
      draft(2, { start_date: "2026-11-01" }),
      draft(3, { created_at: new Date(NOW - 3600_000).toISOString() }),
      draft(4), draft(5), draft(6), draft(7),
      draft(8, { published_at: ago(10) }), // déjà en ligne une fois : hors stock
    ];
    const logs = [log(6, 20), log(6, 10, {}, { idempotency_key: "k2" }), log(7, 3)];
    const s = summarizeDraftConversion(input({
      drafts, logs, publishedOwners: new Set(["owner-4"]), productEmails: new Map([["owner-5", false]]),
      lastSeen: new Map([["owner-1", ago(1)]]),
    }));
    expect(s.stock.active).toBe(7);
    expect(s.stock.eligible).toBe(1);
    const reasons = Object.fromEntries(s.stock.reasons.map(r => [r.reason, r.count]));
    expect(reasons).toEqual({ draft_no_longer_relevant: 1, too_recent: 1, owner_already_published: 1, product_emails_off: 1, reminder_cap: 1, reminder_spacing: 1 });
    expect(s.stock.reasons.find(r => r.reason === "draft_no_longer_relevant")!.label).toBe("Date de début dépassée");
  });
});

describe("lectures groupées, sans adresse email", () => {
  it("un nombre de lectures borné, jamais une par ligne, aucune colonne d'adresse", async () => {
    const calls: Array<{ table: string; select: string }> = [];
    const drafts = Array.from({ length: 150 }, (_, i) => ({ id: id(1).replace(/^1+/, String(i).padStart(8, "0")), user_id: `o${i}`, status: "draft", created_at: ago(5), start_date: null, published_at: null, unpublished_at: null }));
    const builder = (table: string) => {
      const c: Record<string, any> = {};
      let select = "";
      for (const m of ["eq", "order", "in", "not"]) c[m] = () => c;
      c.select = (s: string) => { select = s; calls.push({ table, select }); return c; };
      c.range = async () => ({ data: table === "sits" ? drafts : [log(1, 10)], error: null });
      c.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok);
      return c;
    };
    const rpcCalls: unknown[] = [];
    const client = { from: builder, rpc: async (_n: string, a: unknown) => { rpcCalls.push(a); return { data: [], error: null }; } };
    const s = await loadDraftConversion(client, 30, NOW);
    expect(s.stock.active).toBe(150);
    for (const c of calls) expect(c.select).not.toMatch(/email/);
    // journal + brouillons + 1 annonce relancée + 2 lots de 100 propriétaires x 2 tables
    expect(calls.length).toBe(2 + 1 + 4);
    expect(rpcCalls).toHaveLength(1);
  });
  it("une lecture en échec fait échouer tout le tableau, jamais des zéros", async () => {
    const c: Record<string, any> = {};
    for (const m of ["select", "eq", "order", "in", "not"]) c[m] = () => c;
    c.range = async () => ({ data: null, error: new Error("offline") });
    await expect(loadDraftConversion({ from: () => c, rpc: async () => ({ data: [], error: null }) }, 30, NOW)).rejects.toThrow("offline");
  });
});

describe("message de l'admin après « Relancer »", () => {
  it("dit le motif, sans adresse", () => {
    expect(manualDraftReminderMessage({ sent: true, stage: 1 })).toBe("Relance envoyée.");
    expect(manualDraftReminderMessage({ sent: true, stage: 2 })).toBe("Seconde relance envoyée.");
    expect(manualDraftReminderMessage({ sent: false, error: "reminder_cap" })).toBe("Aucun envoi : deux relances déjà envoyées.");
    expect(manualDraftReminderMessage({ sent: false, error: "verification_unavailable" })).toMatch(/rien n'a été envoyé/);
    expect(manualDraftReminderMessage({ sent: false, outcome: "deferred", error: "daily_cap" })).toMatch(/différé/);
  });
});
