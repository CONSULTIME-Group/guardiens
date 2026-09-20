import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const targetId = "11111111-1111-4111-8111-111111111111";
const reference = `user-${targetId}@notification.guardiens.invalid`;
const privateAddress = "private@fixture.test";
const ownAddress = "self@fixture.test";
const serviceKey = "fixture-service-secret";
const boundary = new Error("authorized business boundary");
const forgedJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role"}').toString("base64url")}.invalid`;

type Options = {
  address?: string | null;
  resolutionError?: boolean;
  admin?: boolean;
  roleError?: boolean;
  member?: boolean;
  provider?: "success" | "error";
};

// Execute the actual Edge handler with inert DB, rendering and provider doubles.
// No network or email is possible. Most cases stop before any business write.
function harness(options: Options = {}) {
  let handler!: (request: Request) => Promise<Response>;
  const getUser = vi.fn(async (token: string) => ({
    data: { user: token === "member-session" ? { id: "fixture-caller", email: ownAddress } : null },
  }));
  const rpc = vi.fn(async (name: string) => {
    if (name === "has_role") return { data: options.admin === true, error: options.roleError ? { message: "fixture role failure" } : null };
    if (name === "get_user_email_for_notification") return {
      data: options.address === undefined ? privateAddress : options.address,
      error: options.resolutionError ? { message: `DB error ${privateAddress}` } : null,
    };
    throw new Error(`Unexpected RPC ${name}`);
  });
  const queriedRecipients: string[] = [];
  const writes: unknown[] = [];
  const from = vi.fn((table: string) => {
    const chain: Record<string, any> = {};
    for (const method of ["select", "eq", "ilike", "or", "filter", "insert", "update"]) {
      chain[method] = (...args: unknown[]) => {
        if (method === "eq" && args[0] === "recipient_email") queriedRecipients.push(String(args[1]));
        if (method === "insert" || method === "update") writes.push({ table, method, values: args[0] });
        return chain;
      };
    }
    chain.limit = async () => {
      if (!options.provider) throw boundary;
      return { data: [], error: null };
    };
    chain.maybeSingle = async () => {
      if (table === "profiles") return { data: options.member === false ? null : { id: targetId }, error: null };
      if (table === "suppressed_emails") return { data: null, error: null };
      if (table === "email_unsubscribe_tokens") return { data: { token: "fixture-token", used_at: null }, error: null };
      throw new Error(`Unexpected table read ${table}`);
    };
    chain.single = async () => ({ data: { id: "fixture-log" }, error: null });
    chain.then = (callback: (value: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(callback);
    return chain;
  });
  const createClient = vi.fn(() => ({ auth: { getUser }, rpc, from }));
  const resendFetch = vi.fn(async () => new Response(JSON.stringify(options.provider === "success"
    ? { id: "fixture-resend" } : { message: `Rejected recipient ${privateAddress}` }),
  { status: options.provider === "success" ? 200 : 422 }));
  const template = { component: () => null, subject: "Fixture" };
  const registrySource = readFileSync(resolve("supabase/functions/_shared/transactional-email-templates/registry.ts"), "utf8");
  const templateNames = Array.from(registrySource.matchAll(/^  '([^']+)':/gm), (match) => match[1]);
  const TEMPLATES = {
    ...Object.fromEntries(templateNames.map((name) => [name, template])),
    "fixture-future-server-template": template,
    "contact-reply": { ...template, to: ownAddress },
  };
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: serviceKey, RESEND_API_KEY: "fixture-resend-key" };
  const source = readFileSync(resolve("supabase/functions/send-transactional-email/index.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  runInNewContext(outputText, {
    exports: {}, Request, Response, URL, Date, Error,
    crypto: { randomUUID: () => "fixture-message" },
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    fetch: () => { throw new Error("Unexpected network call"); },
    Deno: { env: { get: (key: keyof typeof env) => env[key] }, serve: (cb: typeof handler) => { handler = cb; } },
    require: (specifier: string) => {
      if (specifier.includes("supabase-js")) return { createClient };
      if (specifier.includes("registry")) return { TEMPLATES };
      if (specifier.includes("email-categories")) return { getEmailCategory: () => "transactional" };
      if (specifier.includes("email-suppression")) return { bypassesSuppression: () => false };
      if (specifier.includes("sit-alert-guard")) return { isSitStatusGuardedTemplate: () => false };
      if (specifier.includes("email-cap")) return { BYPASS_TEMPLATES: new Set(["application-accepted"]) };
      if (specifier.includes("resend-guard")) return { resendFetch };
      if (specifier.includes("email-link-wrap")) return { wrapEmailLink: (href: string) => href };
      if (specifier.includes("sender-address")) return { REPLY_TO_ADDRESS: "reply@fixture.test" };
      if (specifier.includes("@react-email")) return { render: () => "<body>Fixture</body>" };
      if (specifier.startsWith("npm:react@")) return { createElement: () => ({}) };
      throw new Error(`Unexpected import ${specifier}`);
    },
  });
  return {
    getUser, rpc, createClient, queriedRecipients, writes, resendFetch, templateNames,
    invoke: (token: string | null = "member-session", recipient = reference, templateName = "application-accepted", extra: Record<string, unknown> = {}) => handler(new Request("https://fixture.invalid", {
      method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ templateName, recipientEmail: recipient, idempotencyKey: "fixture-key", templateData: {}, ...extra }),
    })),
    options: () => handler(new Request("https://fixture.invalid", { method: "OPTIONS" })),
  };
}

describe("notification recipient privacy", () => {
  it.each([null, "anon-key", forgedJwt])("rejects invalid caller %s before address resolution", async (token) => {
    const h = harness();
    expect((await h.invoke(token)).status).toBe(401);
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it.each(["member", "admin", "service"])("resolves reference server-side for %s", async (kind) => {
    const h = harness({ admin: kind === "admin" });
    await expect(h.invoke(kind === "service" ? serviceKey : "member-session")).rejects.toBe(boundary);
    expect(h.rpc).toHaveBeenCalledWith("get_user_email_for_notification", { target_user_id: targetId });
    expect(h.getUser).toHaveBeenCalledTimes(kind === "service" ? 0 : 1);
    expect(h.queriedRecipients).toEqual([privateAddress]);
    expect(h.writes).toEqual([]);
  });
  it("preserves direct email callers without a resolution RPC", async () => {
    const h = harness();
    await expect(h.invoke("member-session", privateAddress)).rejects.toBe(boundary);
    expect(h.rpc.mock.calls.map(([name]) => name)).toEqual(["has_role"]);
    expect(h.queriedRecipients).toEqual([privateAddress]);
  });
  it("preserves fixed template recipient precedence", async () => {
    const h = harness({ admin: true });
    await expect(h.invoke("member-session", reference, "contact-reply")).rejects.toBe(boundary);
    expect(h.rpc.mock.calls.map(([name]) => name)).toEqual(["has_role"]);
    expect(h.queriedRecipients).toEqual([ownAddress]);
  });
  it("refuses sensitive templates for ordinary members", async () => {
    const h = harness();
    const response = await h.invoke("member-session", reference, "identity-verified");
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain(privateAddress);
    expect(h.writes).toEqual([]);
  });
  it.each(["admin", "service"])("preserves sensitive template access for %s", async (kind) => {
    const h = harness({ admin: kind === "admin" });
    await expect(h.invoke(kind === "service" ? serviceKey : "member-session", reference, "identity-verified")).rejects.toBe(boundary);
  });
  it("still refuses a non-member resolved recipient", async () => {
    const h = harness({ member: false });
    expect((await h.invoke()).status).toBe(403);
    expect(h.writes).toEqual([]);
  });
  it.each([
    [null, false, 400], ["", false, 400], [privateAddress, true, 500],
  ] as const)("fails safely for unavailable resolution %s / %s", async (address, resolutionError, status) => {
    const h = harness({ address, resolutionError });
    const response = await h.invoke();
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: "Recipient unavailable" });
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("keeps CORS preflight free of DB calls", async () => {
    const h = harness();
    expect((await h.options()).status).toBe(200);
    expect(h.createClient).not.toHaveBeenCalled();
  });
  it.each(["success", "error"] as const)("uses real address only server-side on provider %s", async (provider) => {
    const h = harness({ provider });
    const response = await h.invoke();
    expect(response.status).toBe(provider === "success" ? 200 : 422);
    expect(h.resendFetch).toHaveBeenCalledTimes(1);
    const providerArgs = h.resendFetch.mock.calls[0] as unknown as [string, { body: string }];
    expect(JSON.parse(providerArgs[1].body).to).toEqual([privateAddress]);
    const body = await response.text();
    expect(body).not.toContain(privateAddress);
    expect(body).not.toContain(reference);
    if (provider === "error") expect(JSON.parse(body).details).toBeNull();
  });
});


// Current browser callsites, including both cancellation templates selected at runtime.
const memberTemplates = [
  "application-accepted", "application-declined", "sit-confirmed",
  "cancellation-by-owner", "cancellation-by-sitter", "sit-invitation",
  "review-received", "help-during-sit", "listing-unpublished-feedback",
];

describe("transactional sender template and worker authorization", () => {
  it.each(["identity-verified", "subscription-expired", "contact-reply", "admin-signals-digest", "new-message", "account-deleted", "fixture-future-server-template"])("refuses server template %s even to self", async (templateName) => {
    const h = harness();
    const response = await h.invoke("member-session", ownAddress, templateName);
    expect(response.status).toBe(403);
    expect(h.queriedRecipients).toEqual([]);
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain(ownAddress);
  });

  it("refuses every registered non-member template to another member", async () => {
    const h = harness();
    const restricted = h.templateNames.filter((name) => !memberTemplates.includes(name));
    expect(restricted.length).toBeGreaterThan(70);
    for (const templateName of restricted) {
      const response = await h.invoke("member-session", privateAddress, templateName);
      expect(response.status, templateName).toBe(403);
    }
    expect(h.queriedRecipients).toEqual([]);
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });

  it.each(memberTemplates)("preserves the existing member template %s", async (templateName) => {
    const h = harness();
    await expect(h.invoke("member-session", reference, templateName)).rejects.toBe(boundary);
    expect(h.queriedRecipients).toEqual([privateAddress]);
    expect(h.writes).toEqual([]);
  });

  it.each(["admin", "service"])("preserves all registered templates for %s", async (kind) => {
    const h = harness({ admin: kind === "admin" });
    for (const templateName of h.templateNames) {
      await expect(h.invoke(kind === "service" ? serviceKey : "member-session", privateAddress, templateName), templateName).rejects.toBe(boundary);
    }
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });

  it("does not grant admin access on a role lookup error", async () => {
    const h = harness({ admin: true, roleError: true });
    expect((await h.invoke("member-session", ownAddress, "identity-verified")).status).toBe(403);
    expect(h.writes).toEqual([]);
  });

  it.each([
    { sourceQueueId: "fixture-queue" },
    { source_queue_id: "fixture-queue" },
    { logMetadata: { idempotency_key: "forged-key", bypass: true } },
  ])("reserves worker fields %j to service role", async (extra) => {
    for (const admin of [false, true]) {
      const h = harness({ admin });
      const response = await h.invoke("member-session", privateAddress, "application-accepted", extra);
      expect(response.status).toBe(403);
      expect(h.queriedRecipients).toEqual([]);
      expect(h.writes).toEqual([]);
      expect(h.resendFetch).not.toHaveBeenCalled();
    }
    const h = harness();
    await expect(h.invoke(serviceKey, privateAddress, "application-accepted", extra)).rejects.toBe(boundary);
  });

  it("accepts harmless empty optional worker fields from a member", async () => {
    const h = harness();
    await expect(h.invoke("member-session", privateAddress, "application-accepted", {
      sourceQueueId: "", source_queue_id: "", logMetadata: {},
    })).rejects.toBe(boundary);
  });
});
