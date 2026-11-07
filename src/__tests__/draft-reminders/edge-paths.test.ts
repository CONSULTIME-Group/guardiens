// Les deux chemins de relance exécutés tels quels (Deno simulé, base factice,
// service d'envoi simulé) : aucun réseau, aucun email réel.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as eligibility from "../../../supabase/functions/_shared/draft-reminder-eligibility";
import * as missing from "../../../supabase/functions/_shared/sit-draft-missing";
import { fakeDb, baseData, draftRow, sentLog, SIT, OWNER, EMAIL, type FakeDbData, type Row } from "./fakeDb";

const SERVICE = "fixture-service";
const ADMIN = "admin-session";

function load(name: string, db: ReturnType<typeof fakeDb>, send: (body: Row) => { status: number; body: Row }) {
  let handler!: (req: Request) => Promise<Response>;
  const sends: Row[] = [];
  const writes: Array<{ table: string; values: Row; filters: unknown[][] }> = [];
  const baseFrom = db.client.from;
  const from = (table: string) => {
    if (table === "feature_flags") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { enabled: true }, error: null }) }) }) };
    if (table === "user_roles") {
      const c: Row = { select: () => c, eq: () => c, maybeSingle: async () => ({ data: { role: "admin" }, error: null }) };
      return c;
    }
    if (table === "admin_signals") {
      const entry = { table, values: {} as Row, filters: [] as unknown[][] };
      const c: Row = {
        update: (v: Row) => { entry.values = v; writes.push(entry); return c; },
        eq: (...a: unknown[]) => { entry.filters.push(["eq", ...a]); return c; },
        is: (...a: unknown[]) => { entry.filters.push(["is", ...a]); return Promise.resolve({ error: null }); },
      };
      return c;
    }
    return baseFrom(table);
  };
  const rpc = vi.fn(async (fn: string) => {
    if (fn === "detect_stale_drafts") return { data: [{ sit_id: SIT, owner_id: OWNER, owner_email: EMAIL, owner_first_name: "Camille", days_since_created: 3 }], error: null };
    throw new Error(`Unexpected rpc ${fn}`);
  });
  const client = { from, rpc, auth: { getUser: async () => ({ data: { user: { id: "admin-id" } } }) } };
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toContain("/functions/v1/send-transactional-email");
    const body = JSON.parse(String(init.body));
    sends.push(body);
    const r = send(body);
    return new Response(JSON.stringify(r.body), { status: r.status });
  });
  const env: Row = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: SERVICE, SUPABASE_ANON_KEY: "anon" };
  const { outputText } = ts.transpileModule(readFileSync(resolve(`supabase/functions/${name}/index.ts`), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  runInNewContext(outputText, {
    exports: {}, Request, Response, URL, Date, JSON, Math, Promise, fetch, console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    Deno: { env: { get: (k: string) => env[k] }, serve: (fn: typeof handler) => { handler = fn; } },
    require: (spec: string) => {
      if (spec.includes("supabase-js")) return { createClient: () => client };
      if (spec.includes("draft-reminder-eligibility")) return eligibility;
      if (spec.includes("sit-draft-missing")) return missing;
      if (spec.includes("require-admin")) return { requireAdminOrServiceRole: async () => null };
      if (spec.includes("cron-run-log")) return { withCronRunLog: (_n: string, h: typeof handler) => h, startCronRun: async () => ({ finish: vi.fn(), fail: vi.fn() }) };
      if (spec.includes("owner-nearby")) return { loadOwnerSitterPool: async () => [], ownerNearbyContext: () => ({ count: 0, label: null }) };
      throw new Error(`Unexpected import ${spec}`);
    },
  });
  return { handler, sends, writes, fetch };
}

const ok = (): { status: number; body: Row } => ({ status: 200, body: { success: true, sent: true } });
const manual = (data: FakeDbData, send = ok) => {
  const h = load("nudge-stale-draft", fakeDb(data), send);
  return { ...h, call: () => h.handler(new Request("https://fixture.invalid", {
    method: "POST", headers: { authorization: `Bearer ${ADMIN}` }, body: JSON.stringify({ mode: "manual", sit_id: SIT, signal_id: "signal-1" }),
  })) };
};

describe("relance admin (nudge-stale-draft, mode manuel)", () => {
  it("envoie avec la clé d'annonce partagée, jamais une clé horodatée, et ne renvoie pas l'adresse", async () => {
    const h = manual(baseData());
    const res = await h.call();
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toMatchObject({ sent: true, outcome: "sent", stage: 1 });
    expect(text).not.toContain("@");
    expect(h.sends).toHaveLength(1);
    expect(h.sends[0].idempotencyKey).toBe(`sit-draft-reminder-${SIT}`);
    expect(h.sends[0].recipientEmail).toBe(EMAIL);
    expect(h.sends[0].logMetadata).toMatchObject({ sit_id: SIT, reminder_stage: 1, source: "nudge-stale-draft" });
    // Le signal résolu est bien celui de ce brouillon.
    expect(h.writes[0].values).toMatchObject({ action_taken: "email_sent" });
    expect(h.writes[0].filters).toEqual(expect.arrayContaining([["eq", "signal_type", "stale_draft"], ["eq", "entity_id", SIT], ["is", "resolved_at", null]]));
  });
  it.each([
    ["deux relances déjà faites", baseData({ logs: [sentLog(20, `sit-draft-reminder-${SIT}`), sentLog(10, `sit-draft-reminder-${SIT}-2`)] }), "reminder_cap"],
    ["relance automatique il y a 2 jours", baseData({ logs: [sentLog(2, `sit-draft-reminder-${SIT}`)] }), "reminder_spacing"],
    ["relances désactivées", baseData({ preferences: [{ user_id: OWNER, product_emails: false }] }), "product_emails_off"],
    ["adresse supprimée", baseData({ suppressed: [EMAIL] }), "suppressed"],
    ["déjà publié ailleurs", baseData({ sits: [draftRow(), { id: "p", user_id: OWNER, published_at: "2026-01-01" }] }), "owner_already_published"],
    ["date passée", baseData({ sits: [draftRow({ start_date: "2026-11-01" })] }), "draft_no_longer_relevant"],
  ])("%s : aucun envoi, motif rendu, signal ouvert", async (_l, data, reason) => {
    const h = manual(data);
    const res = await h.call();
    expect(await res.json()).toMatchObject({ sent: false, outcome: "skipped", error: reason });
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.writes).toHaveLength(0);
  });
  it("lecture de l'historique en échec : 503 et aucun envoi", async () => {
    const h = manual(baseData({ failing: ["history"] }));
    const res = await h.call();
    expect(res.status).toBe(503);
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it("refus du service d'envoi (préférence) : pas compté comme envoyé, signal ouvert", async () => {
    const h = manual(baseData(), () => ({ status: 200, body: { success: false, reason: "unsubscribed_category" } }));
    expect(await (await h.call()).json()).toMatchObject({ sent: false, outcome: "skipped", error: "unsubscribed_category" });
    expect(h.writes).toHaveLength(0);
  });
  it("panne du service d'envoi : échec affiché, signal ouvert", async () => {
    const h = manual(baseData(), () => ({ status: 503, body: { error: "draft_verification_unavailable" } }));
    expect(await (await h.call()).json()).toMatchObject({ sent: false, outcome: "failed" });
    expect(h.writes).toHaveLength(0);
  });
});

describe("relance automatique (send-sit-draft-reminder)", () => {
  const cron = (data: FakeDbData, drafts: Row[], send = ok) => {
    const db = fakeDb(data);
    const realFrom = db.client.from;
    // La liste du jour : requête sits avec .lt et .limit, servie par le jeu fourni.
    db.client.from = (table: string) => {
      const chain = realFrom(table);
      if (table !== "sits") return chain;
      const limit = chain.limit;
      chain.limit = (...a: unknown[]) => { limit(...a); return Promise.resolve({ data: drafts, error: null }); };
      return chain;
    };
    const h = load("send-sit-draft-reminder", db, send);
    return { ...h, call: () => h.handler(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${SERVICE}` }, body: "{}" })) };
  };
  it("deux brouillons du même propriétaire : un seul email dans le passage", async () => {
    const second = draftRow({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" });
    const h = cron(baseData({ sits: [draftRow(), second] }), [draftRow(), second]);
    const body = await (await h.call()).json();
    expect(h.sends).toHaveLength(1);
    expect(h.sends[0].idempotencyKey).toBe(`sit-draft-reminder-${SIT}`);
    expect(body).toMatchObject({ sent: 1, skipped: 1, errors_count: 0 });
  });
  it("refus « relances désactivées » du service d'envoi : compté comme non envoyé, pas comme panne", async () => {
    const h = cron(baseData(), [draftRow()], () => ({ status: 200, body: { success: false, reason: "unsubscribed_category" } }));
    expect(await (await h.call()).json()).toMatchObject({ sent: 0, skipped: 1, errors_count: 0 });
  });
  it("lecture impossible : erreur journalisée, aucun envoi", async () => {
    const h = cron(baseData({ failing: ["suppressed_emails"] }), [draftRow()]);
    expect(await (await h.call()).json()).toMatchObject({ sent: 0, errors_count: 1 });
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it("même politique que l'admin : relance récente, aucun nouvel envoi", async () => {
    const h = cron(baseData({ logs: [sentLog(2, `stale-draft-manual-${SIT}-1793969626462`)] }), [draftRow()]);
    expect(await (await h.call()).json()).toMatchObject({ sent: 0, skipped: 1 });
    expect(h.fetch).not.toHaveBeenCalled();
  });
});
