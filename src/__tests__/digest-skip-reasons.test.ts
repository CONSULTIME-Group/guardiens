// Point 1 du lot observabilité : les deux digests comptaient leurs exclusions
// sans jamais dire pourquoi. On exécute les vrais handlers avec une base
// inerte et on vérifie la ventilation nominative renvoyée.
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
// décide des lignes rendues. Aucun réseau, aucun envoi possible.
function fakeClient(rows: Rows) {
  const from = (table: string) => {
    const result = { data: rows[table] ?? [], error: null };
    const chain: Record<string, any> = {
      then: (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
      maybeSingle: async () => ({ data: (rows[table] ?? [])[0] ?? null, error: null }),
      single: async () => ({ data: (rows[table] ?? [])[0] ?? null, error: null }),
    };
    for (const method of ["select", "eq", "neq", "gte", "lte", "lt", "gt", "in", "or", "order", "limit", "range", "filter", "not", "is", "insert", "update", "upsert", "delete"]) {
      chain[method] = () => chain;
    }
    return chain;
  };
  return { from: vi.fn(from), rpc: vi.fn(async () => ({ data: null, error: null })), functions: { invoke: vi.fn(async () => ({ data: null, error: null })) } };
}

function loadHandler(path: string, rows: Rows) {
  let handler!: (request: Request) => Promise<Response>;
  const client = fakeClient(rows);
  const env: Record<string, string> = {
    SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key",
    RESEND_API_KEY: "fixture-resend-key",
  };
  const source = readFileSync(resolve(path), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const inert = async () => ({ data: null, error: null });
  runInNewContext(outputText, {
    exports: {}, Request, Response, URL, Headers, Date, Error, Math, JSON, Number, Array, Set, Map, Promise, Intl, Boolean, String, Object,
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    fetch: () => { throw new Error("Unexpected network call"); },
    Deno: { env: { get: (key: string) => env[key] }, serve: (cb: typeof handler) => { handler = cb; } },
    require: (specifier: string) => {
      if (specifier.includes("supabase-js")) return { createClient: () => client };
      if (specifier.includes("sitNotificationClaim")) return {
        claimSitNotification: async () => ({ granted: false, reason: "fixture" }),
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
  return { handler, client };
}

describe("send-alert-digest, ventilation des exclusions", () => {
  it("nomme chaque motif au lieu d'un compteur muet", async () => {
    const prefs = [
      { user_id: "u1", active: true, frequence: "quotidien", zone_type: "rayon", profiles: { id: "u1", email: null } },
      { user_id: "u2", active: true, frequence: "quotidien", zone_type: "rayon", profiles: { id: "u2", email: null } },
      { user_id: "u3", active: true, frequence: "hebdo", zone_type: "rayon", profiles: { id: "u3", email: "u3@fixture.test", city: "Lyon" } },
    ];
    const { handler } = loadHandler("supabase/functions/send-alert-digest/index.ts", {
      alert_preferences: prefs, geocode_cache: [], sits: [], small_missions: [],
    });
    // Dimanche : le rythme hebdomadaire ne passe pas, motif distinct.
    vi.setSystemTime(new Date("2026-09-20T10:00:00Z"));
    const response = await handler(new Request("https://fixture.invalid/?force=true", { method: "POST", body: "{}" }));
    vi.useRealTimers();
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.prefs_evaluated).toBe(3);
    expect(payload.skipped).toBe(3);
    expect(payload.skipped_by_reason).toEqual({ sans_email: 2, hebdo_hors_jour: 1 });
  });
});

describe("send-nearby-daily-digest, ventilation des exclusions", () => {
  it("nomme chaque motif au lieu d'un compteur muet", async () => {
    const published = new Date().toISOString();
    const { handler } = loadHandler("supabase/functions/send-nearby-daily-digest/index.ts", {
      sits: [{ id: "s1", slug: "s1", title: "Annonce", city: "Lyon", start_date: "2026-10-01", end_date: "2026-10-05", user_id: "owner", status: "published", created_at: published, published_at: published, property_id: null, departement_code: "69", accepting_applications: true, country: "FR", profiles: { latitude: 45.75, longitude: 4.85, postal_code: "69001", departement_code: "69", country: "FR" } }],
      small_missions: [],
      properties: [],
      email_preferences: [
        { user_id: "u1", nearby_daily_radius_km: 100, product_emails: true },
        { user_id: "u2", nearby_daily_radius_km: 100, product_emails: true },
        { user_id: "u3", nearby_daily_radius_km: 100, product_emails: false },
      ],
      profiles: [
        { id: "u1", first_name: "A", email: "u1@fixture.test", latitude: 45.75, longitude: 4.85, departement_code: "69", account_status: "suspended" },
        { id: "u2", first_name: "B", email: "u2@fixture.test", latitude: 45.75, longitude: 4.85, departement_code: "69", account_status: "deleted" },
        { id: "u3", first_name: "C", email: "u3@fixture.test", latitude: 45.75, longitude: 4.85, departement_code: "69", account_status: "active" },
      ],
    });
    const response = await handler(new Request("https://fixture.invalid", { method: "POST", body: JSON.stringify({ manual: true }) }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.users_skipped ?? payload.skipped).toBe(3);
    expect(payload.skipped_by_reason).toEqual({ compte_inactif: 2, emails_produit_coupes: 1 });
  });
});
