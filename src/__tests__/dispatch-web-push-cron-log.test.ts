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

const serviceKey = "fixture-service-key";

function harness(jobs: Array<Record<string, unknown>>) {
  let handler!: (request: Request) => Promise<Response>;
  const inserts: Array<{ table: string; row: unknown }> = [];
  const admin = {
    from: (table: string) => ({ insert: async (row: unknown) => { inserts.push({ table, row }); return { error: null }; } }),
    rpc: vi.fn(async (name: string) => {
      if (name === "push_claim_jobs") return { data: jobs, error: null };
      if (name === "push_job_eligible") return { data: true, error: null };
      if (name === "push_close_job") return { data: true, error: null };
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
      if (specifier.includes("web-push/auth")) return auth;
      if (specifier.includes("web-push/config")) return config;
      if (specifier.includes("web-push/endpoint")) return endpoint;
      if (specifier.includes("web-push/payload")) return payload;
      if (specifier.includes("web-push/transport")) return transport;
      throw new Error(`Unexpected import ${specifier}`);
    },
  });
  return {
    inserts,
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
});
