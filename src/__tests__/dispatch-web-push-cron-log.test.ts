// Point 5 du lot observabilité : dispatch-web-push tournait sans laisser la
// moindre trace, donc restait invisible de la santé des crons. Le journal
// n'est écrit que lorsqu'un envoi a été traité, la file étant vide la plupart
// du temps.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as cronTrace from "../../supabase/functions/_shared/cron-trace";
import * as auth from "../../supabase/functions/_shared/web-push/auth";
import * as config from "../../supabase/functions/_shared/web-push/config";
import * as endpoint from "../../supabase/functions/_shared/web-push/endpoint";
import * as payload from "../../supabase/functions/_shared/web-push/payload";
import * as transport from "../../supabase/functions/_shared/web-push/transport";
import * as budget from "../../supabase/functions/_shared/web-push/dispatch-budget";

const serviceKey = "fixture-service-key";

function harness(jobs: Array<Record<string, unknown>>, nearby: () => { data: unknown; error: unknown } = () => ({ data: [], error: null })) {
  let handler!: (request: Request) => Promise<Response>;
  const inserts: Array<{ table: string; row: unknown }> = [];
  const admin = {
    from: (table: string) => ({ insert: async (row: unknown) => { inserts.push({ table, row }); return { error: null }; } }),
    rpc: vi.fn(async (name: string) => {
      if (name === "push_claim_jobs") return { data: jobs, error: null };
      if (name === "push_job_eligible") return { data: true, error: null };
      if (name === "push_close_job") return { data: true, error: null };
      if (name === "push_claim_nearby_jobs") return nearby();
      return { data: null, error: null };
    }),
  };
  const env: Record<string, string> = {
    SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    VAPID_PUBLIC_KEY: "fixture-public",
    VAPID_PRIVATE_KEY: "fixture-private",
    VAPID_SUBJECT: "mailto:fixture@guardiens.invalid",
  };
  const source = readFileSync(resolve("supabase/functions/dispatch-web-push/index.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  runInNewContext(outputText, {
    exports: {}, Request, Response, URL, Headers, Date, Error, JSON, Math, Number, Promise, Object, Array, Boolean, String, AbortController, setTimeout, clearTimeout,
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    fetch: () => { throw new Error("Unexpected network call"); },
    Deno: { env: { get: (key: string) => env[key] }, serve: (cb: typeof handler) => { handler = cb; } },
    require: (specifier: string) => {
      if (specifier.includes("supabase-js@2/cors")) return { corsHeaders: {} };
      if (specifier.includes("supabase-js")) return { createClient: () => admin };
      if (specifier.includes("web-push@")) return { default: { setVapidDetails: () => {}, sendNotification: async () => ({ statusCode: 201 }) } };
      if (specifier.includes("cron-trace")) return cronTrace;
      if (specifier.includes("dispatch-budget")) return budget;
      if (specifier.includes("web-push/auth")) return auth;
      if (specifier.includes("web-push/config")) return config;
      if (specifier.includes("web-push/endpoint")) return endpoint;
      if (specifier.includes("web-push/payload")) return payload;
      if (specifier.includes("web-push/transport")) return transport;
      throw new Error(`Unexpected import ${specifier}`);
    },
  });
  return {
    inserts, admin,
    run: () => handler(new Request("https://fixture.invalid", {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ limit: 5 }),
    })),
  };
}

describe("dispatch-web-push, visibilité cron", () => {
  it("n'écrit rien quand la file est vide", async () => {
    const h = harness([]);
    const response = await h.run();
    expect(response.status).toBe(200);
    expect(h.inserts).toEqual([]);
  });

  it("écrit un passage dès qu'un job est traité", async () => {
    const h = harness([{ job_id: "job-1", endpoint: "https://invalid.example/push", p256dh: "k", auth: "a", event_kind: "inconnu", payload: {} }]);
    const response = await h.run();
    expect(response.status).toBe(200);
    expect(h.inserts).toHaveLength(1);
    const row = h.inserts[0] as { table: string; row: Record<string, unknown> };
    expect(row.table).toBe("cron_run_log");
    expect(row.row.edge_name).toBe("dispatch-web-push");
    expect(row.row.status).toBe("success");
    expect((row.row.metrics as Record<string, number>).claimed).toBe(1);
    // Aucun endpoint, aucune clé, aucun membre dans le journal.
    expect(JSON.stringify(row.row)).not.toContain("invalid.example");
  });

  const fcm = (id: string) => ({ job_id: id, subscription_id: "s", endpoint: "https://fcm.googleapis.com/fcm/send/abc", auth_key: "a", p256dh_key: "k", event_kind: "message", attempts: 1 });
  const nearbyCalls = (h: ReturnType<typeof harness>) => h.admin.rpc.mock.calls.filter((c) => c[0] === "push_claim_nearby_jobs");

  it("budget total unique : file principale pleine, la file proche n'est pas lue", async () => {
    const h = harness([1, 2, 3, 4, 5].map((i) => fcm(`j${i}`)));
    await h.run();
    expect(nearbyCalls(h)).toHaveLength(0);
  });

  it("budget total unique : la file proche reçoit seulement le reste", async () => {
    const h = harness([fcm("j1"), fcm("j2")]);
    await h.run();
    expect(nearbyCalls(h)[0][1]).toEqual({ p_limit: 3 });
  });

  it("file proche en erreur, file vide : passage partiel journalisé", async () => {
    const h = harness([], () => ({ data: null, error: { message: "boom" } }));
    const response = await h.run();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("partial");
    expect(body.ok).toBe(false);
    const row = (h.inserts[0] as { row: Record<string, unknown> }).row;
    expect(row.status).toBe("partial");
    expect(row.error_message).toBe("push_claim_nearby_jobs failed");
    expect((row.metrics as Record<string, number>).nearby_unavailable).toBe(1);
  });

  it("file proche en erreur : les envois principaux restent faits", async () => {
    const h = harness([fcm("j1")], () => ({ data: null, error: { message: "boom" } }));
    await h.run();
    const closes = h.admin.rpc.mock.calls.filter((c) => c[0] === "push_close_job");
    expect(closes[0][1]).toMatchObject({ p_job_id: "j1", p_outcome: "accepted" });
    expect(((h.inserts[0] as { row: Record<string, unknown> }).row.metrics as Record<string, number>).accepted).toBe(1);
  });
});
