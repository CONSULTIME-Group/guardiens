// Lot 4 : priorité du digest gardien. Le créneau de notification est unique
// par gardien et par jour Paris. Les digests de veille et de proximité
// doivent laisser ce créneau au gardien qui attend encore son digest gardien,
// tant que l'attente reste sous 6 heures.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as parisHour from "../../supabase/functions/_shared/paris-hour";
import * as publicationWindow from "../../supabase/functions/_shared/sit-publication-window";
import * as cronTrace from "../../supabase/functions/_shared/cron-trace";

type Rows = Record<string, unknown[]>;

// Chaîne PostgREST inerte : tout filtre est accepté et ignoré, seule la table
// décide des lignes rendues. La sélection par fenêtre est donc réellement
// faite par le code testé, pas par la base.
function fakeClient(rows: Rows) {
  const from = (table: string) => {
    const result = { data: rows[table] ?? [], error: null };
    const chain: Record<string, any> = {
      then: (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
      maybeSingle: async () => ({ data: (rows[table] ?? [])[0] ?? null, error: null }),
      single: async () => ({ data: (rows[table] ?? [])[0] ?? null, error: null }),
    };
    for (const method of ["select", "eq", "neq", "gte", "lte", "lt", "gt", "in", "or", "order", "limit", "range", "filter", "not", "is", "ilike", "like", "contains", "overlaps", "insert", "update", "upsert", "delete"]) {
      chain[method] = () => chain;
    }
    return chain;
  };
  return {
    from: vi.fn(from),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    auth: { admin: { getUserById: async () => ({ data: null, error: null }) } },
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
  };
}

function loadHandler(path: string, rows: Rows) {
  let handler!: (request: Request) => Promise<Response>;
  const client = fakeClient(rows);
  const claimed: string[] = [];
  const env: Record<string, string> = {
    SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key",
  };
  const source = readFileSync(resolve(path), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const inert = async () => ({ data: null, error: null });
  runInNewContext(outputText, {
    exports: {}, Request, Response, URL, Headers, Date, Error, Math, JSON, Number, Array, Set, Map, Promise, Intl, Boolean, String, Object,
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    // Aucun envoi réel : l'appel au relais transactionnel répond 200 à vide.
    fetch: async () => new Response("{}", { status: 200 }),
    Deno: { env: { get: (key: string) => env[key] }, serve: (cb: typeof handler) => { handler = cb; } },
    require: (specifier: string) => {
      if (specifier.includes("supabase-js")) return { createClient: () => client };
      if (specifier.includes("sitNotificationClaim")) return {
        claimSitNotification: async (_c: unknown, userId: string) => { claimed.push(userId); return { granted: true }; },
        releaseSitNotification: inert, reportClaimOutcome: inert, raiseClaimErrorSignal: inert,
      };
      if (specifier.includes("delivery-failure")) return { recordDeliveryFailure: inert };
      if (specifier.includes("cron-run-log")) return { startCronRun: async () => null };
      if (specifier.includes("geocode-lookup")) return { geocodeKeyCandidates: () => [] };
      if (specifier.includes("paris-hour")) return parisHour;
      if (specifier.includes("sit-publication-window")) return publicationWindow;
      if (specifier.includes("cron-trace")) return cronTrace;
      throw new Error(`Unexpected import ${specifier}`);
    },
  });
  return { handler, claimed };
}

const NOW = new Date("2026-09-20T07:10:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

// A attend son digest gardien depuis 1 heure, B depuis 7 heures, C n'a rien
// en file.
const QUEUE = [
  { sitter_id: "aaaaaaaa-0000-0000-0000-000000000001", queued_at: hoursAgo(1), status: "queued", sent_at: null },
  { sitter_id: "bbbbbbbb-0000-0000-0000-000000000002", queued_at: hoursAgo(7), status: "queued", sent_at: null },
];
const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "bbbbbbbb-0000-0000-0000-000000000002";
const C = "cccccccc-0000-0000-0000-000000000003";

describe("send-alert-digest, priorité du digest gardien", () => {
  it("laisse le créneau au gardien en attente récente, sert les autres", async () => {
    const pref = (id: string) => ({
      id: `pref-${id}`, user_id: id, active: true, frequence: "quotidien", zone_type: "france",
      alert_types: ["gardes"], heure_envoi: "08:00",
      profiles: { id, first_name: "Test", email: `${id}@fixture.test`, city: "Lyon" },
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    const { handler, claimed } = loadHandler("supabase/functions/send-alert-digest/index.ts", {
      alert_preferences: [pref(A), pref(B), pref(C)],
      geocode_cache: [],
      sits: [{
        id: "11111111-0000-0000-0000-000000000001", title: "Garde de deux chats",
        status: "published", published_at: hoursAgo(2), start_date: "2026-10-01", end_date: "2026-10-10",
        accepting_applications: true, profiles: { first_name: "Claire", city: "Lyon", country: "FR" }, properties: null,
      }],
      small_missions: [],
      suppressed_emails: [],
      email_preferences: [],
      sitter_digest_queue: QUEUE,
    });
    const response = await handler(new Request("https://fixture.invalid/?force=true", { method: "POST", body: "{}" }));
    vi.useRealTimers();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.skipped_by_reason.sitter_digest_pending).toBe(1);
    expect(payload.sent).toBe(2);
    expect(claimed).not.toContain(A);
    expect(claimed.sort()).toEqual([B, C].sort());
  });
});

describe("send-nearby-daily-digest, priorité du digest gardien", () => {
  it("laisse le créneau au gardien en attente récente, sert les autres", async () => {
    const profile = (id: string) => ({
      id, first_name: "Test", email: `${id}@fixture.test`, city: "Lyon",
      latitude: 45.75, longitude: 4.85, postal_code: "69001", departement_code: "69", account_status: "active",
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    const { handler, claimed } = loadHandler("supabase/functions/send-nearby-daily-digest/index.ts", {
      email_preferences: [A, B, C].map((id) => ({ user_id: id, nearby_daily_radius_km: 100, product_emails: true, new_mission_digest: false, sit_alert_frequency: "daily" })),
      profiles: [profile(A), profile(B), profile(C)],
      sits: [{
        id: "11111111-0000-0000-0000-000000000001", slug: "garde-deux-chats", title: "Garde de deux chats",
        city: "Lyon", start_date: "2026-10-01", end_date: "2026-10-10", user_id: "dddddddd-0000-0000-0000-000000000004",
        status: "published", created_at: hoursAgo(2), published_at: hoursAgo(2), cover_photo_url: null,
        property_id: null, departement_code: "69", accepting_applications: true, country: "FR",
        profiles: { latitude: 45.76, longitude: 4.86, postal_code: "69002", departement_code: "69", country: "FR" },
      }],
      small_missions: [],
      properties: [],
      suppressed_emails: [],
      email_send_log: [],
      sitter_digest_queue: QUEUE,
    });
    const response = await handler(new Request("https://fixture.invalid/", { method: "POST", body: "{}" }));
    vi.useRealTimers();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.skipped_by_reason.sitter_digest_pending).toBe(1);
    expect(payload.users_sent).toBe(2);
    expect(claimed).not.toContain(A);
    expect(claimed.sort()).toEqual([B, C].sort());
  });
});
