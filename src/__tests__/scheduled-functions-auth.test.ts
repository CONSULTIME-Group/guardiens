import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Execute the real handlers and auth helper with isolated, inert dependencies.
// The first business operation stops execution so these tests cannot send mail
// or contact Supabase/Prerender, even when a request is authorized.
const businessReached = new Error("authorized business boundary");
const serviceKey = "test-service-secret";
const forgedServiceJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.invalid`;

function harness(functionName: string, admin = false) {
  let handler: (request: Request) => Promise<Response>;
  const getUser = vi.fn(async (token: string) => token === "user-session"
    ? { data: { user: { id: "test-user" } }, error: null }
    : { data: { user: null }, error: { message: "invalid token" } });
  const rpc = vi.fn(async () => ({ data: admin, error: null }));
  const client = { auth: { getUser }, rpc };
  const createClient = vi.fn(() => client);
  const startCronRun = vi.fn(async () => { throw businessReached; });
  const fetch = vi.fn(async () => { throw new Error("unexpected network request"); });
  const env = { SUPABASE_URL: "https://test.invalid", SUPABASE_SERVICE_ROLE_KEY: serviceKey };
  const Deno = {
    env: { get: (key: keyof typeof env) => env[key] },
    serve: (callback: typeof handler) => { handler = callback; },
  };
  function load(path: string, require: (specifier: string) => unknown) {
    const source = readFileSync(resolve(path), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    });
    const exports: Record<string, unknown> = {};
    runInNewContext(outputText, { exports, require, Deno, Request, Response, console, fetch, URL, Date });
    return exports;
  }
  const auth = load("supabase/functions/_shared/require-admin.ts", () => ({ createClient }));
  load(`supabase/functions/${functionName}/index.ts`, (specifier) => {
    if (specifier.includes("require-admin")) return auth;
    if (specifier.includes("supabase-js")) return { createClient };
    if (specifier.includes("cron-run-log")) return { startCronRun };
    // These helpers are reached only after the business boundary above.
    return {};
  });
  return { invoke: (request: Request) => handler(request), getUser, rpc, createClient, startCronRun, fetch };
}

describe.each([
  "consume-seo-dirty",
  "detect-deploy-and-mark-dirty",
  "send-weekly-nearby-digest",
  "auto-close-small-missions",
])("%s authorization", (name) => {
  it.each([
    ["missing credentials", {}],
    ["public apikey only", { apikey: "public-anon-key" }],
    ["anon bearer", { authorization: "Bearer public-anon-key" }],
    ["forged service-role claim", { authorization: `Bearer ${forgedServiceJwt}` }],
  ])("rejects %s before parsing the body or starting work", async (_label, headers) => {
    const h = harness(name);
    const request = new Request("https://test.invalid", { method: "POST", headers, body: "not-json" });
    const parse = vi.spyOn(request, "json");
    const response = await h.invoke(request);
    expect(response.status).toBe(401);
    expect(parse).not.toHaveBeenCalled();
    expect(h.startCronRun).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("rejects a valid non-admin session", async () => {
    const h = harness(name);
    const response = await h.invoke(new Request("https://test.invalid", {
      method: "POST", headers: { authorization: "Bearer user-session" }, body: "{}",
    }));
    expect(response.status).toBe(403);
    expect(h.rpc).toHaveBeenCalledWith("has_role", { _user_id: "test-user", _role: "admin" });
    expect(h.startCronRun).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it.each(["service", "admin"])("allows the %s caller to reach business work", async (kind) => {
    const h = harness(name, kind === "admin");
    const token = kind === "service" ? serviceKey : "user-session";
    await expect(h.invoke(new Request("https://test.invalid", {
      method: "POST", headers: { authorization: `Bearer ${token}` }, body: '{"manual":true}',
    }))).rejects.toBe(businessReached);
    expect(h.startCronRun).toHaveBeenCalledWith(name);
    expect(h.fetch).not.toHaveBeenCalled();
    if (kind === "service") expect(h.getUser).not.toHaveBeenCalled();
  });

  it("keeps preflight requests public and side-effect free", async () => {
    const h = harness(name);
    const response = await h.invoke(new Request("https://test.invalid", { method: "OPTIONS" }));
    expect(response.status).toBe(200);
    expect(h.createClient).not.toHaveBeenCalled();
    expect(h.startCronRun).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });
});
