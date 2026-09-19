import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const serviceKey = "fixture-service-secret";
const profileId = "00000000-0000-4000-8000-000000000001";
const key = `affinity-stale-${profileId}`;
const template = "affinity-onboarding-nudge";
type Row = Record<string, any>;

// A small in-memory PostgREST filter evaluator, independent of the handler.
// Commas inside logical groups and in(...) lists are not separators.
function terms(value: string): string[] {
  let depth = 0;
  let start = 0;
  const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth--;
    if (value[i] === "," && depth === 0) {
      result.push(value.slice(start, i));
      start = i + 1;
    }
  }
  result.push(value.slice(start));
  return result;
}

function matches(row: Row, filter: string): boolean {
  for (const operation of ["and", "or"]) {
    if (filter.startsWith(`${operation}(`) && filter.endsWith(")")) {
      const values = terms(filter.slice(operation.length + 1, -1)).map((term) => matches(row, term));
      return operation === "and" ? values.every(Boolean) : values.some(Boolean);
    }
  }
  const match = filter.match(/^(.+?)\.(eq|in)\.(.*)$/);
  if (!match) throw new Error(`Unsupported fixture filter: ${filter}`);
  const [, field, operator, expected] = match;
  const actual = field.split("->>").reduce((value, part) => value?.[part], row);
  return operator === "eq" ? actual === expected : terms(expected.slice(1, -1)).includes(actual);
}

function harness(logs: Row[], options: { suppressed?: boolean; optedOut?: boolean; flagOff?: boolean } = {}) {
  let handler: (request: Request) => Promise<Response>;
  const finish = vi.fn(async () => {});
  const fail = vi.fn(async () => {});
  const startCronRun = vi.fn(async () => ({ finish, fail }));
  const rpc = vi.fn(async (name: string) => {
    expect(name).toBe("detect_affinity_stale");
    return { data: [{ profile_id: profileId, first_name: "Fixture", email: "fixture@example.invalid", hours_since_started: 48 }], error: null };
  });
  const from = vi.fn((table: string) => {
    if (table === "admin_signals") {
      const chain: Row = {};
      for (const method of ["select", "eq"]) chain[method] = () => chain;
      chain.is = async () => ({ data: [], error: null });
      chain.insert = async () => ({ error: { code: "23505" } });
      return chain;
    }
    const predicates: ((row: Row) => boolean)[] = [];
    const chain: Row = {};
    chain.select = chain.limit = () => chain;
    chain.eq = (field: string, value: unknown) => { predicates.push((row) => row[field] === value); return chain; };
    chain.or = (filter: string) => { predicates.push((row) => matches(row, `or(${filter})`)); return chain; };
    chain.maybeSingle = async () => {
      if (table === "feature_flags") return { data: { enabled: !options.flagOff }, error: null };
      if (table === "suppressed_emails") return { data: options.suppressed ? { email: "fixture@example.invalid" } : null, error: null };
      if (table === "email_preferences") return { data: { product_emails: !options.optedOut }, error: null };
      expect(table).toBe("email_send_log");
      return { data: logs.find((row) => predicates.every((predicate) => predicate(row))) ?? null, error: null };
    };
    return chain;
  });
  const createClient = vi.fn(() => ({ from, rpc }));
  const fetch = vi.fn(async () => new Response(JSON.stringify({ success: true, sent: true }), { status: 200 }));
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: serviceKey, RESEND_API_KEY: "fixture-provider-key" };
  const Deno = { env: { get: (name: keyof typeof env) => env[name] }, serve: (fn: typeof handler) => { handler = fn; } };
  function load(file: string, require: (specifier: string) => unknown) {
    const source = readFileSync(resolve(file), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
    const exports: Row = {};
    runInNewContext(outputText, { exports, require, Deno, Request, Response, Date, fetch, console: { error: vi.fn() } });
    return exports;
  }
  const auth = load("supabase/functions/_shared/require-admin.ts", () => ({ createClient }));
  load("supabase/functions/nudge-affinity-onboarding/index.ts", (specifier) => {
    if (specifier.includes("require-admin")) return auth;
    if (specifier.includes("supabase-js")) return { createClient };
    if (specifier.includes("cron-run-log")) return { startCronRun };
    throw new Error(`Unexpected import: ${specifier}`);
  });
  return { fetch, from, finish, fail, rpc, invoke: () => handler(new Request("https://fixture.invalid", { method: "POST", headers: { Authorization: `Bearer ${serviceKey}` } })) };
}

function modern(status: string, overrides: Row = {}): Row {
  return { id: "fixture-log", message_id: "random-sender-message-id", template_name: template, status, metadata: { idempotency_key: key }, ...overrides };
}

describe("nudge-affinity-onboarding one-shot deduplication", () => {
  it.each(["sent", "pending", "deferred"])("does not invoke the sender for a modern %s entry", async (status) => {
    const h = harness([modern(status)]);
    const response = await h.invoke();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ emails_sent: 0, emails_skipped: 1 });
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.finish).toHaveBeenCalledWith("success", expect.objectContaining({ emails_sent: 0 }));
  });

  it("preserves historical message_id entries and their old template name", async () => {
    const h = harness([{ message_id: key, template_name: "affinity_onboarding_stale_nudge", status: "sent" }]);
    expect(await (await h.invoke()).json()).toMatchObject({ emails_skipped: 1 });
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it.each(["failed", "cancelled", "abandoned", "suppressed"])("does not treat a modern %s entry as a completed or pending send", async (status) => {
    const h = harness([modern(status)]);
    expect(await (await h.invoke()).json()).toMatchObject({ emails_sent: 1 });
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    { metadata: { idempotency_key: "affinity-stale-another-profile" } },
    { template_name: "another-template" },
    { metadata: {} },
  ])("does not block on an unrelated log %j", async (overrides) => {
    const h = harness([modern("sent", overrides)]);
    expect(await (await h.invoke()).json()).toMatchObject({ emails_sent: 1 });
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("preserves the stable idempotency key and payload for a new candidate", async () => {
    const h = harness([]);
    expect((await h.invoke()).status).toBe(200);
    expect(h.fetch).toHaveBeenCalledWith("https://fixture.invalid/functions/v1/send-transactional-email", expect.objectContaining({
      body: JSON.stringify({ templateName: template, recipientEmail: "fixture@example.invalid", idempotencyKey: key, templateData: { firstName: "Fixture", hours: 48 }, logMetadata: { user_id: profileId, hours_since_started: 48 } }),
    }));
    expect(h.fail).not.toHaveBeenCalled();
  });

  it.each([{ suppressed: true }, { optedOut: true }, { flagOff: true }])("retains the existing exclusion %j", async (options) => {
    const h = harness([], options);
    expect((await h.invoke()).status).toBe(200);
    expect(h.fetch).not.toHaveBeenCalled();
  });
});
