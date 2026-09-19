import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const serviceKey = "fixture-service-secret";
const forgedJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role"}').toString("base64url")}.invalid`;
const campaignId = "11111111-1111-4111-8111-111111111111";

function harness(options: { admin?: boolean; stalled?: boolean; selectError?: boolean; updateError?: boolean } = {}) {
  let handler!: (req: Request) => Promise<Response>;
  const writes: Array<{ values: unknown; filters: unknown[] }> = [];
  const getUser = vi.fn(async (token: string) => ({
    data: { user: token === "member-session" ? { id: "fixture-member" } : null },
    error: token === "member-session" ? null : { message: "invalid token" },
  }));
  const rpc = vi.fn(async () => ({ data: options.admin === true, error: null }));
  const from = vi.fn((table: string) => {
    expect(table).toBe("mass_emails");
    let values: unknown;
    const filters: unknown[] = [];
    const chain: Record<string, any> = {
      select: vi.fn(() => chain),
      update: vi.fn((patch: unknown) => { values = patch; return chain; }),
      eq: vi.fn((...args: unknown[]) => { filters.push(["eq", ...args]); return chain; }),
      in: vi.fn((...args: unknown[]) => { filters.push(["in", ...args]); return chain; }),
      or: vi.fn(() => chain),
      then: (callback: (result: unknown) => unknown) => {
        if (values) writes.push({ values, filters });
        const error = values
          ? (options.updateError ? { message: "fixture update error" } : null)
          : (options.selectError ? { message: "fixture read error" } : null);
        return Promise.resolve({ data: values ? null : (options.stalled ? [{ id: campaignId }] : []), error }).then(callback);
      },
    };
    return chain;
  });
  const createClient = vi.fn(() => ({ auth: { getUser }, rpc, from }));
  const fetch = vi.fn(() => { throw new Error("Network forbidden in test"); });
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: serviceKey };
  const Deno = { env: { get: (key: keyof typeof env) => env[key] }, serve: (fn: typeof handler) => { handler = fn; } };
  function load(file: string, require: (specifier: string) => unknown) {
    const source = readFileSync(resolve(file), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
    const exports: Record<string, unknown> = {};
    runInNewContext(outputText, { exports, require, Deno, Request, Response, Date, fetch, console: { log: vi.fn(), error: vi.fn() } });
    return exports;
  }
  const auth = load("supabase/functions/_shared/require-admin.ts", () => ({ createClient }));
  load("supabase/functions/mass-email-watchdog/index.ts", (specifier) => {
    if (specifier.includes("require-admin")) return auth;
    if (specifier.includes("supabase-js")) return { createClient };
    throw new Error(`Unexpected import ${specifier}`);
  });
  return { from, writes, getUser, rpc, createClient, fetch,
    invoke: (headers: Record<string, string> = {}, method = "POST") => handler(new Request("https://fixture.invalid", { method, headers })),
  };
}

describe("mass-email-watchdog authorization", () => {
  it.each([
    ["missing credentials", {}],
    ["public apikey only", { apikey: "public-key" }],
    ["anon bearer", { authorization: "Bearer public-key" }],
    ["forged service-role claim", { authorization: `Bearer ${forgedJwt}` }],
  ])("rejects %s without reading or pausing campaigns", async (_label, headers) => {
    const h = harness({ stalled: true });
    const response = await h.invoke(headers);
    expect({ status: response.status, writes: h.writes }).toEqual({ status: 401, writes: [] });
    expect(h.from).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("rejects a non-admin member", async () => {
    const h = harness({ stalled: true });
    expect((await h.invoke({ authorization: "Bearer member-session" })).status).toBe(403);
    expect(h.rpc).toHaveBeenCalledWith("has_role", { _user_id: "fixture-member", _role: "admin" });
    expect(h.from).not.toHaveBeenCalled();
  });

  it("also denies unauthenticated GET requests", async () => {
    const h = harness({ stalled: true });
    expect((await h.invoke({}, "GET")).status).toBe(401);
    expect(h.writes).toEqual([]);
  });

  it.each(["service", "admin"])("preserves campaign pause for %s", async (kind) => {
    const h = harness({ admin: kind === "admin", stalled: true });
    const response = await h.invoke({ authorization: `Bearer ${kind === "service" ? serviceKey : "member-session"}` });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ paused: 1, ids: [campaignId] });
    expect(h.writes).toEqual([{ values: { status: "paused" }, filters: [["in", "id", [campaignId]], ["eq", "status", "sending"]] }]);
    if (kind === "service") expect(h.getUser).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("preserves the no-candidate result without writes", async () => {
    const h = harness();
    const response = await h.invoke({ authorization: `Bearer ${serviceKey}` });
    expect(await response.json()).toEqual({ paused: 0 });
    expect(h.writes).toEqual([]);
  });

  it("keeps OPTIONS public without database access", async () => {
    const h = harness();
    expect((await h.invoke({}, "OPTIONS")).status).toBe(200);
    expect(h.createClient).not.toHaveBeenCalled();
  });

  it("does not pause anything when the candidate read fails", async () => {
    const h = harness({ stalled: true, selectError: true });
    expect((await h.invoke({ authorization: `Bearer ${serviceKey}` })).status).toBe(500);
    expect(h.writes).toEqual([]);
  });

  it("does not report success when the pause fails", async () => {
    const h = harness({ stalled: true, updateError: true });
    expect((await h.invoke({ authorization: `Bearer ${serviceKey}` })).status).toBe(500);
  });
});
