import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const serviceKey = "fixture-service-secret";
const forgedJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role"}').toString("base64url")}.invalid`;

function harness(options: { admin?: boolean; flag?: boolean; roleError?: boolean; detectorError?: boolean } = {}) {
  let handler!: (req: Request) => Promise<Response>;
  const getUser = vi.fn(async (token?: string) => ({
    data: { user: token === "member-session" ? { id: "fixture-user" } : null },
    error: token === "member-session" ? null : { message: "invalid token" },
  }));
  const rpc = vi.fn(async (name: string) => {
    if (name === "has_role") return { data: options.roleError ? null : options.admin === true, error: options.roleError ? { message: "role lookup failed" } : null };
    if (["detect_pending_applications", "detect_stalled_discussions"].includes(name)) {
      return { data: [], error: options.detectorError ? { message: "detector unavailable" } : null };
    }
    throw new Error(`Unexpected RPC ${name}`);
  });
  const from = vi.fn((table: string) => {
    const chain = {
      select: vi.fn(() => chain), eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        if (table === "feature_flags") return { data: { enabled: options.flag !== false }, error: null };
        if (table === "user_roles") return { data: options.admin ? { role: "admin" } : null, error: null };
        throw new Error(`Unexpected business table ${table}`);
      }),
    };
    return chain;
  });
  const createClient = vi.fn((_url: string, _key: string, config?: { global?: { headers?: { Authorization?: string } } }) => ({
    auth: { getUser: (token?: string) => getUser(token ?? config?.global?.headers?.Authorization?.slice(7)) }, rpc, from,
  }));
  const finish = vi.fn(); const fail = vi.fn();
  const startCronRun = vi.fn(async () => ({ finish, fail }));
  const fetch = vi.fn(() => { throw new Error("Network forbidden in test"); });
  const env: Record<string, string> = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: serviceKey, SUPABASE_ANON_KEY: "public-key", RESEND_API_KEY: "fixture-resend" };
  const Deno = { env: { get: (key: string) => env[key] }, serve: (fn: typeof handler) => { handler = fn; } };
  function load(file: string, require: (specifier: string) => unknown) {
    const { outputText } = ts.transpileModule(readFileSync(resolve(file), "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    });
    const exports: Record<string, unknown> = {};
    runInNewContext(outputText, { exports, require, Deno, Request, Response, Date, fetch, console: { log: vi.fn(), error: vi.fn() } });
    return exports;
  }
  const auth = load("supabase/functions/_shared/require-admin.ts", () => ({ createClient }));
  load("supabase/functions/nudge-owner-pending-application/index.ts", (specifier) => {
    if (specifier.includes("require-admin")) return auth;
    if (specifier.includes("supabase-js")) return { createClient };
    if (specifier.includes("cron-run-log")) return { startCronRun };
    throw new Error(`Unexpected import ${specifier}`);
  });
  return { invoke: (req: Request) => handler(req), from, rpc, getUser, createClient, startCronRun, finish, fail, fetch };
}

function request(token?: string, body = "{}", method = "POST") {
  return new Request("https://fixture.invalid", { method, headers: token ? { authorization: `Bearer ${token}` } : {}, ...(method === "POST" ? { body } : {}) });
}

describe("owner nudge authorization", () => {
  it.each([undefined, "public-key", forgedJwt, "expired-session"])("rejects invalid credentials %s before any business access", async (token) => {
    const h = harness(); const req = request(token, "not-json"); const parse = vi.spyOn(req, "text");
    expect((await h.invoke(req)).status).toBe(401);
    expect(parse).not.toHaveBeenCalled(); expect(h.from).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled(); expect(h.startCronRun).not.toHaveBeenCalled(); expect(h.fetch).not.toHaveBeenCalled();
  });
  it.each(["{}", '{"mode":"manual","application_id":"fixture"}'])("rejects non-admin sessions in either mode: %s", async (body) => {
    const h = harness();
    expect((await h.invoke(request("member-session", body))).status).toBe(403);
    expect(h.rpc).toHaveBeenCalledExactlyOnceWith("has_role", { _user_id: "fixture-user", _role: "admin" });
    expect(h.from).not.toHaveBeenCalled(); expect(h.startCronRun).not.toHaveBeenCalled(); expect(h.fetch).not.toHaveBeenCalled();
  });
  it("fails closed when the role lookup fails", async () => {
    const h = harness({ admin: true, roleError: true });
    expect((await h.invoke(request("member-session"))).status).toBe(403);
    expect(h.from).not.toHaveBeenCalled();
  });
  it.each([serviceKey, "member-session"])("preserves empty scheduled sweeps for authorized caller %s", async (token) => {
    const h = harness({ admin: true }); const response = await h.invoke(request(token));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mode: "cron", detected: 0, stalled_detected: 0, emails_sent: 0, stalled_emails_sent: 0, errors: [] });
    expect(h.startCronRun).toHaveBeenCalledExactlyOnceWith("nudge-owner-pending-application");
    expect(h.finish).toHaveBeenCalledWith("success", expect.objectContaining({ errors_count: 0 }));
    expect(h.rpc).toHaveBeenCalledWith("detect_pending_applications"); expect(h.rpc).toHaveBeenCalledWith("detect_stalled_discussions");
    expect(h.fetch).not.toHaveBeenCalled();
    if (token === serviceKey) expect(h.getUser).not.toHaveBeenCalled();
  });
  it("preserves the administrator manual lookup without starting a cron", async () => {
    const h = harness({ admin: true });
    expect((await h.invoke(request("member-session", '{"mode":"manual","application_id":"fixture"}'))).status).toBe(404);
    expect(h.from).toHaveBeenCalledWith("user_roles"); expect(h.rpc).toHaveBeenCalledWith("detect_pending_applications");
    expect(h.startCronRun).not.toHaveBeenCalled(); expect(h.fetch).not.toHaveBeenCalled();
  });
  it("does not bypass the existing manual user check with service credentials", async () => {
    const h = harness();
    expect((await h.invoke(request(serviceKey, '{"mode":"manual","application_id":"fixture"}'))).status).toBe(401);
    expect(h.startCronRun).not.toHaveBeenCalled(); expect(h.fetch).not.toHaveBeenCalled();
  });
  it("preserves the disabled feature flag for an authorized caller", async () => {
    const h = harness({ flag: false }); const response = await h.invoke(request(serviceKey));
    expect(await response.json()).toEqual({ skipped: "admin_signals_active is off" });
    expect(h.rpc).not.toHaveBeenCalled(); expect(h.startCronRun).not.toHaveBeenCalled();
  });
  it("keeps an authorized detector error visible", async () => {
    const h = harness({ detectorError: true });
    expect((await h.invoke(request(serviceKey))).status).toBe(500);
    expect(h.fail).toHaveBeenCalled(); expect(h.fetch).not.toHaveBeenCalled();
  });
  it("keeps OPTIONS public and without database access", async () => {
    const h = harness(); expect((await h.invoke(request(undefined, "", "OPTIONS"))).status).toBe(200);
    expect(h.createClient).not.toHaveBeenCalled(); expect(h.fetch).not.toHaveBeenCalled();
  });
  it("rejects a public apikey without a bearer token", async () => {
    const h = harness();
    expect((await h.invoke(new Request("https://fixture.invalid", { method: "POST", headers: { apikey: "public-key" }, body: "{}" }))).status).toBe(401);
    expect(h.from).not.toHaveBeenCalled();
  });
  it("rejects an unauthenticated GET request", async () => {
    const h = harness(); expect((await h.invoke(request(undefined, "", "GET"))).status).toBe(401);
    expect(h.from).not.toHaveBeenCalled(); expect(h.startCronRun).not.toHaveBeenCalled();
  });
});
