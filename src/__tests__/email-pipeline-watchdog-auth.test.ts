import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const serviceKey = "fixture-service-secret";
const forgedJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role"}').toString("base64url")}.invalid`;

function harness(options: { admin?: boolean; anomaly?: boolean; recent?: boolean; noHealth?: boolean; healthError?: boolean; providerFailure?: boolean; uncertain?: number; staleSending?: number; claimReadError?: boolean; diagnosticError?: boolean } = {}) {
  let handler!: (req: Request) => Promise<Response>;
  const getUser = vi.fn(async (token: string) => ({ data: { user: token === "member-session" ? { id: "fixture-member" } : null }, error: null }));
  const rpc = vi.fn(async (name: string) => {
    if (name === "has_role") return { data: options.admin === true, error: null };
    if (name === "get_email_pipeline_health") return {
      data: options.noHealth ? [] : [{ oldest_pending_age_seconds: options.anomaly ? 601 : null, attempts_1h: 0, dlq_last_hour: 0, failure_rate_1h: 0, stuck_rate_limit: false, deferred_stale_rows: [] }],
      error: options.healthError ? { message: "fixture health failure" } : null,
    };
    if (name === "email_mirror_drift_count") return { data: 0, error: null };
    if (name === "log_client_error") return { data: null, error: options.diagnosticError ? { message: "private error" } : null };
    throw new Error(`Unexpected RPC ${name}`);
  });
  const from = vi.fn((table: string) => {
    const chain: Record<string, any> = {};
    if (table === "member_email_send_claims") {
      let state = "";
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn((_column, value) => { state = value; return chain; });
      chain.lt = vi.fn(() => chain);
      chain.then = (resolve: any, reject: any) => Promise.resolve({ count: state === "uncertain" ? options.uncertain ?? 0 : options.staleSending ?? 0, error: options.claimReadError ? { message: "private database failure" } : null }).then(resolve, reject);
      return chain;
    }
    expect(table).toBe("error_logs");
    for (const method of ["select", "eq", "gte", "is", "update", "lt"]) chain[method] = vi.fn(() => chain);
    chain.then = (resolve: any, reject: any) => Promise.resolve({ error: null }).then(resolve, reject);
    chain.limit = vi.fn(async () => ({ data: options.recent ? [{ id: "fixture-log" }] : [], error: null }));
    return chain;
  });
  const createClient = vi.fn(() => ({ auth: { getUser }, rpc, from }));
  const resendFetch = vi.fn(async () => new Response("{}", { status: options.providerFailure ? 429 : 200 }));
  const fetch = vi.fn(() => { throw new Error("Network forbidden in fixture"); });
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: serviceKey, RESEND_API_KEY: "fixture-provider-key" };
  const Deno = { env: { get: (key: keyof typeof env) => env[key] }, serve: (fn: typeof handler) => { handler = fn; } };
  function load(file: string, require: (specifier: string) => unknown) {
    const source = readFileSync(resolve(file), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
    const exports: Record<string, unknown> = {};
    runInNewContext(outputText, { exports, require, Deno, Request, Response, Date, fetch, console: { log: vi.fn(), error: vi.fn(), warn: vi.fn() } });
    return exports;
  }
  const auth = load("supabase/functions/_shared/require-admin.ts", () => ({ createClient }));
  const monitor = load("supabase/functions/_shared/member-email-claim-monitor.ts", () => { throw new Error("Unexpected monitor import"); });
  load("supabase/functions/email-pipeline-watchdog/index.ts", (specifier) => {
    if (specifier.includes("member-email-claim-monitor")) return monitor;
    if (specifier.includes("require-admin")) return auth;
    if (specifier.includes("supabase-js")) return { createClient };
    if (specifier.includes("resend-guard")) return { resendFetch };
    if (specifier.includes("email-categories")) return { EMAIL_CATEGORY_MAP: { "fixture-transactional": "transactional", "fixture-product": "product" } };
    throw new Error(`Unexpected import ${specifier}`);
  });
  return { getUser, rpc, from, createClient, resendFetch, fetch,
    invoke: (headers: Record<string, string> = {}, method = "POST") => handler(new Request("https://fixture.invalid", { method, headers })),
  };
}

describe("email-pipeline-watchdog authorization", () => {
  it.each([
    ["missing credentials", {}],
    ["public apikey only", { apikey: "public-key" }],
    ["anon bearer", { authorization: "Bearer public-key" }],
    ["forged service-role claim", { authorization: `Bearer ${forgedJwt}` }],
  ])("rejects %s before health reads, logging or email", async (_label, headers) => {
    const h = harness({ anomaly: true });
    const response = await h.invoke(headers);
    expect({ status: response.status, alerts: h.resendFetch.mock.calls.length }).toEqual({ status: 401, alerts: 0 });
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.from).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("rejects a non-admin member before business reads", async () => {
    const h = harness({ anomaly: true });
    expect((await h.invoke({ authorization: "Bearer member-session" })).status).toBe(403);
    expect(h.rpc).toHaveBeenCalledExactlyOnceWith("has_role", { _user_id: "fixture-member", _role: "admin" });
    expect(h.resendFetch).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated GET as well", async () => {
    const h = harness({ anomaly: true });
    expect((await h.invoke({}, "GET")).status).toBe(401);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it.each(["service", "admin"])("preserves anomaly logging and one grouped alert for %s", async (kind) => {
    const h = harness({ admin: kind === "admin", anomaly: true });
    const response = await h.invoke({ authorization: `Bearer ${kind === "service" ? serviceKey : "member-session"}` });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, anomalies: 1, alerted: 1, resend_status: 200, member_claims: { uncertain: 0, stale_sending: 0 } });
    expect(h.rpc).toHaveBeenCalledWith("get_email_pipeline_health", { p_transactional_templates: ["fixture-transactional"] });
    expect(h.rpc).toHaveBeenCalledWith("log_client_error", expect.objectContaining({ _fingerprint: "email_pipeline:email_pipeline_queue_backlog" }));
    expect(h.resendFetch).toHaveBeenCalledTimes(1);
    if (kind === "service") expect(h.getUser).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("keeps a healthy pipeline silent", async () => {
    const h = harness();
    const response = await h.invoke({ authorization: `Bearer ${serviceKey}` });
    expect(await response.json()).toMatchObject({ ok: true, anomalies: 0, member_claims: { uncertain: 0, stale_sending: 0 } });
    expect(h.from).toHaveBeenCalledWith("member_email_send_claims");
    expect(h.rpc).not.toHaveBeenCalledWith("log_client_error", expect.anything());
    expect(h.resendFetch).not.toHaveBeenCalled();
  });

  it("keeps hourly alert throttling while logging the anomaly", async () => {
    const h = harness({ anomaly: true, recent: true });
    const response = await h.invoke({ authorization: `Bearer ${serviceKey}` });
    expect(await response.json()).toMatchObject({ ok: true, anomalies: 1, alerted: 0, reason: "throttled" });
    expect(h.rpc).toHaveBeenCalledWith("log_client_error", expect.anything());
    expect(h.resendFetch).not.toHaveBeenCalled();
  });

  it("keeps OPTIONS public without client creation", async () => {
    const h = harness();
    expect((await h.invoke({}, "OPTIONS")).status).toBe(200);
    expect(h.createClient).not.toHaveBeenCalled();
  });

  it("preserves an empty health result without alerting", async () => {
    const h = harness({ noHealth: true });
    expect(await (await h.invoke({ authorization: `Bearer ${serviceKey}` })).json()).toMatchObject({ ok: true, health: null, member_claims: { uncertain: 0, stale_sending: 0 } });
    expect(h.resendFetch).not.toHaveBeenCalled();
  });

  it("returns a health read error without alerting", async () => {
    const h = harness({ healthError: true });
    expect((await h.invoke({ authorization: `Bearer ${serviceKey}` })).status).toBe(500);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });

  it("preserves the provider status when alert delivery fails", async () => {
    const h = harness({ anomaly: true, providerFailure: true });
    const result = await (await h.invoke({ authorization: `Bearer ${serviceKey}` })).json();
    expect(result.resend_status).toBe(429);
    expect(h.resendFetch).toHaveBeenCalledTimes(1);
  });
});


describe("member claim monitoring in the actual watchdog", () => {
  it.each([false, true])("logs member claim diagnostics without an email (empty auth health: %s)", async (noHealth) => {
    const h = harness({ uncertain: 2, staleSending: 3, noHealth });
    const response = await h.invoke({ authorization: `Bearer ${serviceKey}` });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ member_claims: { uncertain: 2, stale_sending: 3 } });
    expect(h.rpc).toHaveBeenCalledWith("log_client_error", expect.objectContaining({ _fingerprint: "email_pipeline:member_email_claims_uncertain", _context: expect.objectContaining({ uncertain: 2, stale_sending: 3 }) }));
    expect(h.rpc).toHaveBeenCalledWith("log_client_error", expect.objectContaining({ _fingerprint: "email_pipeline:member_email_claims_stale_sending" }));
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("does not add member claims to the existing grouped email", async () => {
    const h = harness({ uncertain: 2, anomaly: true });
    const response = await h.invoke({ authorization: `Bearer ${serviceKey}` });
    expect(await response.json()).toMatchObject({ anomalies: 1, alerted: 1, member_claims: { uncertain: 2 } });
    expect(h.resendFetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(h.resendFetch.mock.calls)).not.toContain("member_email_claims_");
  });
  it("returns incomplete monitoring as 500 with a private-data-free diagnostic", async () => {
    const h = harness({ claimReadError: true });
    const response = await h.invoke({ authorization: `Bearer ${serviceKey}` });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private");
    expect(h.rpc).toHaveBeenCalledWith("log_client_error", expect.objectContaining({ _fingerprint: "email_pipeline:member_email_claims_unavailable" }));
    expect(h.rpc).toHaveBeenCalledWith("get_email_pipeline_health", expect.anything());
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("does not report success when the diagnostic write fails", async () => {
    const h = harness({ uncertain: 1, diagnosticError: true });
    expect((await h.invoke({ authorization: `Bearer ${serviceKey}` })).status).toBe(500);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
});


it("preserves existing pipeline alerts even when claim monitoring is unavailable", async () => {
  const h = harness({ claimReadError: true, anomaly: true });
  const response = await h.invoke({ authorization: `Bearer ${serviceKey}` });
  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({ ok: false, anomalies: 1, alerted: 1, member_claims: null, monitoring_error: "member_email_claims_unavailable" });
  expect(h.resendFetch).toHaveBeenCalledTimes(1);
});
