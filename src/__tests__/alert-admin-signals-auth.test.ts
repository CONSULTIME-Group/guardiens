import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const serviceKey = "fixture-service-secret";
const forgedJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.invalid`;

function harness(options: { signal?: boolean; noServiceKey?: boolean; readError?: boolean; queues?: Array<{ key: string; count: number; oldest: string | null }>; flagOff?: boolean; queuesError?: boolean } = {}) {
  let handler: (request: Request) => Promise<Response>;
  const writes: string[] = [];
  const from = vi.fn((table: string) => {
    // Lot ADM2 : trace du passage du matin dans cron_run_log.
    if (table === "cron_run_log") {
      const chain: Record<string, any> = {};
      chain.insert = () => { writes.push("cron_run_log:insert"); return chain; };
      chain.update = () => { writes.push("cron_run_log:update"); return chain; };
      chain.select = () => chain;
      chain.eq = async () => ({ error: null });
      chain.maybeSingle = async () => ({ data: { id: "run-1" }, error: null });
      return chain;
    }
    if (table === "feature_flags") {
      const chain: Record<string, any> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({ data: { enabled: !options.flagOff }, error: null });
      return chain;
    }
    if (table !== "admin_signals") throw new Error(`Unexpected table ${table}`);
    const result = { data: options.signal ? [{ signal_type: "fixture-critical", severity: "critical", detected_at: new Date().toISOString(), metadata: { detail: "fixture" } }] : [], error: options.readError ? { message: "fixture read failure" } : null };
    const chain: Record<string, any> = {};
    for (const method of ["select", "is"]) chain[method] = () => chain;
    chain.limit = async () => result;
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return chain;
  });
  const rpc = vi.fn(async (name: string) => (name === "admin_human_queues" && options.queuesError
    ? { data: null, error: { message: "fixture queues failure" } }
    : { data: name === "admin_human_queues" ? (options.queues ?? []) : [], error: null }));
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
      if (specifier === "./digest.ts") {
        const digest = ts.transpileModule(readFileSync(resolve("supabase/functions/alert-admin-signals/digest.ts"), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
        const mod = { exports: {} as Record<string, unknown> };
        // Lot S2 : digest.ts lit la configuration partagée des types de signaux.
        const cfgRequire = (spec: string) => {
          if (spec !== "../_shared/admin-signal-config.ts") throw new Error(`Unexpected import ${spec}`);
          const cfg = ts.transpileModule(readFileSync(resolve("supabase/functions/_shared/admin-signal-config.ts"), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
          const cmod = { exports: {} as Record<string, unknown> };
          runInNewContext(cfg, { exports: cmod.exports, module: cmod, Date, Math, Set, Map, Object, Number });
          return cmod.exports;
        };
        runInNewContext(digest, { exports: mod.exports, module: mod, require: cfgRequire, Date, Math, Set, Map, Object });
        return mod.exports;
      }
      throw new Error(`Unexpected import ${specifier}`);
    },
  });
  const reads = () => (from.mock.calls as unknown[][]).filter(([t]) => t !== "cron_run_log" && t !== "feature_flags");
  const writeRpcs = () => (rpc.mock.calls as unknown[][]).filter(([n]) => n !== "alma_weekly_summary" && n !== "admin_human_queues" && n !== "admin_site_health");
  return { from, rpc, fetch, writes, reads, writeRpcs, invoke: (request: Request) => handler(request) };
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
    expect((h.rpc.mock.calls as unknown[][]).filter(([n]) => n !== "alma_weekly_summary")).toEqual([]);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("keeps an authorized dry run read-only", async () => {
    const h = harness({ signal: true });
    const response = await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: '{"dry_run":true}' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, sent: false, dry_run: true, critical_open: 1, warning_open: 0 });
    expect(h.reads()).toHaveLength(1);
    expect(h.writes).toEqual([]);
    expect(h.writeRpcs()).toEqual([]);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("sends the morning email even when nothing waits, and logs the run (lot ADM2)", async () => {
    const h = harness();
    const response = await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: "{}" }));
    expect(await response.json()).toMatchObject({ ok: true, sent: true, critical_open: 0, warning_open: 0 });
    expect(h.fetch).toHaveBeenCalledTimes(1);
    const [, init] = h.fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({ templateData: { criticalCount: 0, lines: [] } });
    expect(h.rpc).toHaveBeenCalledWith("auto_resolve_admin_signals");
    expect(h.writes).toEqual(["cron_run_log:insert", "cron_run_log:update"]);
  });

  it("keeps a one-off trigger call silent when nothing waits, outside the run log", async () => {
    const h = harness();
    const response = await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: '{"trigger":"cron-failure-x"}' }));
    expect(await response.json()).toMatchObject({ ok: true, sent: false, reason: "no_actionable_critical_signal" });
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.writes).toEqual([]);
  });

  it("puts human queues first in the email", async () => {
    const h = harness({ signal: true, queues: [{ key: "contactMessages", count: 2, oldest: new Date(Date.now() - 2 * 86_400_000).toISOString() }, { key: "reports", count: 0, oldest: null }] });
    await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: "{}" }));
    const [, init] = h.fetch.mock.calls[0] as unknown as [string, RequestInit];
    const data = JSON.parse(String(init.body)).templateData;
    expect(data.criticalCount).toBe(2);
    expect(data.lines[0]).toMatchObject({ title: "2 messages de contact", ageDays: 2, link: "https://guardiens.fr/admin/contact-messages" });
  });

  it("writes failed reads and switched-off signals into the email, never a false calm", async () => {
    const h = harness({ flagOff: true, queuesError: true });
    await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: "{}" }));
    const [, init] = h.fetch.mock.calls[0] as unknown as [string, RequestInit];
    const notices: string[] = JSON.parse(String(init.body)).templateData.notices;
    expect(notices).toHaveLength(2);
    expect(notices.join(" ")).toMatch(/Signaux désactivés/);
    expect(notices.join(" ")).toMatch(/Lecture des files humaines impossible/);
  });

  it("does not reconcile on a dry run", async () => {
    const h = harness();
    const response = await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: '{"dry_run":true}' }));
    expect(await response.json()).toMatchObject({ sent: false, dry_run: true, auto_resolved: [] });
    expect(h.writeRpcs()).toEqual([]);
    expect(h.writes).toEqual([]);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it.each([false, "true", 1])("preserves normal reconciliation for dry_run=%s", async (dry_run) => {
    const h = harness();
    await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { authorization: `Bearer ${serviceKey}` }, body: JSON.stringify({ dry_run }) }));
    expect(h.writeRpcs()).toHaveLength(1);
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
    expect(h.writes).toEqual(["cron_run_log:insert", "cron_run_log:update"]);
  });

  it("does not trust a JWT role when the service key is missing", async () => {
    const h = harness({ noServiceKey: true });
    expect((await h.invoke(new Request("https://fixture.invalid", { headers: { authorization: `Bearer ${forgedJwt}` } }))).status).toBe(401);
    expect(h.from).not.toHaveBeenCalled();
    expect((h.rpc.mock.calls as unknown[][]).filter(([n]) => n !== "alma_weekly_summary")).toEqual([]);
  });

  it("keeps OPTIONS public without privileged reads or sending", async () => {
    const h = harness();
    expect((await h.invoke(new Request("https://fixture.invalid", { method: "OPTIONS" }))).status).toBe(200);
    expect(h.from).not.toHaveBeenCalled();
    expect((h.rpc.mock.calls as unknown[][]).filter(([n]) => n !== "alma_weekly_summary")).toEqual([]);
    expect(h.fetch).not.toHaveBeenCalled();
  });
});
