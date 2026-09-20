import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const serviceKey = "fixture-service-secret";
const forgedJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.invalid`;

function harness(options: { signal?: boolean; noServiceKey?: boolean; readError?: boolean } = {}) {
  let handler: (request: Request) => Promise<Response>;
  const from = vi.fn((table: string) => {
    if (table !== "admin_signals") throw new Error(`Unexpected table ${table}`);
    const result = { data: options.signal ? [{ signal_type: "fixture-critical", severity: "critical", detected_at: new Date().toISOString(), metadata: { detail: "fixture" } }] : [], error: options.readError ? { message: "fixture read failure" } : null };
    const chain: Record<string, any> = {};
    for (const method of ["select", "is"]) chain[method] = () => chain;
    chain.limit = async () => result;
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return chain;
  });
  const rpc = vi.fn(async () => ({ data: [], error: null }));
  const createClient = vi.fn(() => ({ from, rpc }));
  const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true, sent: true }), { status: 200 }));
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: options.noServiceKey ? undefined : serviceKey };
  const Deno = { env: { get: (name: keyof typeof env) => env[name] }, serve: (fn: typeof handler) => { handler = fn; } };
  const source = readFileSync(resolve("supabase/functions/alert-admin-signals/index.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  runInNewContext(outputText, {
    exports: {}, Deno, Request, Response, Date, atob, fetch, console: { error: vi.fn() },
    require: (specifier: string) => {
      if (specifier.endsWith("/cors")) return { corsHeaders: { "Access-Control-Allow-Origin": "*" } };
      if (specifier.includes("supabase-js")) return { createClient };
      throw new Error(`Unexpected import ${specifier}`);
    },
  });
  return { from, rpc, fetch, invoke: (request: Request) => handler(request) };
}

describe("alert-admin-signals service authorization", () => {
  it.each([
    ["missing credentials", {}],
    ["public apikey only", { apikey: "public-key" }],
    ["anon bearer", { authorization: "Bearer public-key" }],
    ["forged service-role JWT", { authorization: `Bearer ${forgedJwt}` }],
    ["malformed JWT", { authorization: "Bearer header.invalid.signature" }],
    ["ordinary user session", { authorization: "Bearer member-session" }],
  ])("rejects %s before parsing or privileged reads", async (_label, headers) => {
    const h = harness({ signal: true });
    const request = new Request("https://fixture.invalid", { method: "POST", headers, body: "not-json" });
    const parse = vi.spyOn(request, "json");
    const response = await h.invoke(request);
    expect(response.status).toBe(401);
    expect(parse).not.toHaveBeenCalled();
    expect(h.from).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("keeps an authorized dry run read-only", async () => {
    const h = harness({ signal: true });
    const response = await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: '{"dry_run":true}' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, sent: false, dry_run: true, critical_open: 1, warning_open: 0 });
    expect(h.from).toHaveBeenCalledTimes(1);
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("keeps a healthy report silent", async () => {
    const h = harness();
    const response = await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: "{}" }));
    expect(await response.json()).toMatchObject({ ok: true, sent: false, reason: "no_critical_signal", warning_open: 0 });
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.rpc).toHaveBeenCalledWith("auto_resolve_admin_signals");
  });

  it("does not reconcile even when a dry run finds no critical signal", async () => {
    const h = harness();
    const response = await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: '{"dry_run":true}' }));
    expect(await response.json()).toMatchObject({ sent: false, reason: "no_critical_signal", auto_resolved: [] });
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it.each([false, "true", 1])("preserves normal reconciliation for dry_run=%s", async (dry_run) => {
    const h = harness();
    await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: JSON.stringify({ dry_run }) }));
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(h.rpc).toHaveBeenCalledWith("auto_resolve_admin_signals");
  });

  it("preserves the authorized alert request using an inert sender", async () => {
    const h = harness({ signal: true });
    const response = await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: "{}" }));
    expect(await response.json()).toMatchObject({ ok: true, sent: true });
    expect(h.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = h.fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://fixture.invalid/functions/v1/send-transactional-email");
    expect(init.headers).toMatchObject({ Authorization: `Bearer ${serviceKey}` });
    expect(JSON.parse(String(init.body))).toMatchObject({ templateName: "admin-signals-digest", templateData: { criticalCount: 1, warningCount: 0 }, idempotencyKey: `admin-signals-${new Date().toISOString().slice(0, 10)}` });
  });

  it("keeps read failures visible without sending", async () => {
    const h = harness({ readError: true });
    expect((await h.invoke(new Request("https://fixture.invalid", { headers: { authorization: `Bearer ${serviceKey}` } }))).status).toBe(500);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("does not trust a JWT role when the service key is missing", async () => {
    const h = harness({ noServiceKey: true });
    expect((await h.invoke(new Request("https://fixture.invalid", { headers: { authorization: `Bearer ${forgedJwt}` } }))).status).toBe(401);
    expect(h.from).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("keeps OPTIONS public without privileged reads or sending", async () => {
    const h = harness();
    expect((await h.invoke(new Request("https://fixture.invalid", { method: "OPTIONS" }))).status).toBe(200);
    expect(h.from).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });
});
