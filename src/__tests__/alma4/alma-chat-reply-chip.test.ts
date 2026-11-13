/**
 * Lot ALMA4 : alma-chat rejoué sur son code source pour le chemin reply_chip.
 * Base simulée : la réplique vient d'alma_cultural_facts, aucun appel au
 * modèle, aucune réservation de tour, une ligne alma_conversations reply_chip.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as prompt from "../../../supabase/functions/_shared/alma-system-prompt";
import * as almaIntent from "../../../supabase/functions/_shared/alma-intent";
import * as siteKnowledge from "../../../supabase/functions/_shared/alma-site-knowledge";
import * as almaFacts from "../../../supabase/functions/_shared/alma-facts";
import * as almaInventory from "../../../supabase/functions/_shared/alma-inventory";
import * as nextAction from "../../../supabase/functions/_shared/alma-next-action";
import * as almaClassify from "../../../supabase/functions/_shared/alma-classify";
import * as almaOutput from "../../../supabase/functions/_shared/alma-output";
import * as normalizeContact from "../../../supabase/functions/_shared/normalize-contact-message";
import * as ownerQuestion from "../../../supabase/functions/_shared/alma-owner-question";
import * as sitLocation from "../../../supabase/functions/_shared/sit-location";
import * as homePhoto from "../../../supabase/functions/_shared/alma-home-photo";
import * as truth from "../../../supabase/functions/_shared/alma-truth";
import * as companion from "../../../supabase/functions/_shared/alma-companion";
import * as places from "../../../supabase/functions/_shared/alma-places";
import * as childCare from "../../../supabase/functions/_shared/mission-child-care";
import * as almaVersion from "../../../supabase/functions/_shared/alma-version";
import * as almaUsage from "../../../supabase/functions/_shared/alma-usage";
import * as almaBond from "../../../supabase/functions/_shared/alma-bond";
import * as almaSafety from "../../../supabase/functions/_shared/alma-safety";
import * as turnCap from "../../../supabase/functions/_shared/alma-turn-cap";
import * as replyChip from "../../../supabase/functions/_shared/alma-reply-chip";
import * as almaIntegrity from "../../../supabase/functions/_shared/alma-integrity";

const SOURCE = "11111111-1111-4111-8111-111111111111";
const NEXT = "22222222-2222-4222-8222-222222222222";
const SEEN = "33333333-3333-4333-8333-333333333333";

interface Fixture {
  facts: any[];
  history?: any[];
  usedToday?: number;
}

function harness(fx: Fixture) {
  let handler!: (request: Request) => Promise<Response>;
  const writes: Array<{ table: string; row: any }> = [];
  const from = vi.fn((table: string) => {
    const filters: Record<string, unknown> = {};
    let single = false;
    let head = false;
    const chain: Record<string, any> = {};
    chain.select = (_cols?: string, opts?: { head?: boolean }) => { head = opts?.head === true; return chain; };
    chain.eq = (c: string, v: unknown) => { filters[c] = v; return chain; };
    chain.gte = chain.lte = chain.order = chain.in = chain.or = chain.not = chain.is = chain.limit = () => chain;
    chain.maybeSingle = chain.single = () => { single = true; return chain; };
    chain.insert = (row: any) => {
      writes.push({ table, row });
      const p: any = Promise.resolve({ error: null });
      p.select = () => ({ single: () => Promise.resolve({ data: { id: "44444444-4444-4444-8444-444444444444" }, error: null }) });
      return p;
    };
    chain.then = (ok: (v: unknown) => unknown, ko: (r: unknown) => unknown) => {
      let rows: any[] = [];
      if (table === "alma_cultural_facts") {
        rows = fx.facts.filter((f) => Object.entries(filters).every(([k, v]) => f[k] === v));
      } else if (table === "alma_whisper_history") rows = fx.history ?? [];
      const result = head
        ? { data: null, error: null, count: table === "alma_conversations" ? fx.usedToday ?? 0 : 0 }
        : { data: single ? rows[0] ?? null : rows, error: null };
      return Promise.resolve(result).then(ok, ko);
    };
    return chain;
  });
  const callLovableAI = vi.fn();
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  const client = { from, rpc, auth: { getUser: vi.fn(async () => ({ data: { user: { id: "a4000000-0000-4000-8000-000000000001" } }, error: null })) } };
  const source = readFileSync(resolve(process.cwd(), "supabase/functions/alma-chat/index.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const mods: Record<string, unknown> = {
    "alma-system-prompt.ts": prompt, "alma-intent.ts": almaIntent, "alma-site-knowledge.ts": siteKnowledge,
    "alma-facts.ts": almaFacts, "alma-inventory.ts": almaInventory, "alma-next-action.ts": nextAction,
    "alma-classify.ts": almaClassify, "alma-output.ts": almaOutput, "normalize-contact-message.ts": normalizeContact,
    "alma-owner-question.ts": ownerQuestion, "sit-location.ts": sitLocation, "alma-home-photo.ts": homePhoto,
    "alma-truth.ts": truth, "alma-companion.ts": companion, "alma-places.ts": places, "mission-child-care.ts": childCare,
    "alma-version.ts": almaVersion, "alma-usage.ts": almaUsage, "alma-bond.ts": almaBond, "alma-safety.ts": almaSafety,
    "alma-turn-cap.ts": turnCap, "alma-integrity.ts": almaIntegrity, "alma-reply-chip.ts": replyChip,
  };
  runInNewContext(outputText, {
    exports: {}, Request, Response, Date, Intl, console: { error: vi.fn(), log: vi.fn() },
    Deno: { env: { get: () => "fixture" }, serve: (fn: typeof handler) => { handler = fn; } },
    require: (name: string) => {
      if (name.includes("supabase-js")) return { createClient: () => client };
      if (name.endsWith("ai-gateway.ts")) return { callLovableAI, CORS_HEADERS: {} };
      if (name.endsWith("alma-frustration-signal.ts")) return { recordAlmaFrustration: async () => {} };
      if (name.endsWith("alma-signals.ts")) return { recordAlmaSignal: async () => {}, raiseImmediateAlmaSignal: async () => {} };
      const key = Object.keys(mods).find((k) => name.endsWith(k));
      if (key) return mods[key];
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return {
    callLovableAI, rpc, writes,
    invoke: async (body: Record<string, unknown>, auth = true) => {
      const r = await handler(new Request("https://fixture.invalid", {
        method: "POST", headers: auth ? { Authorization: "Bearer fixture" } : {},
        body: JSON.stringify(body),
      }));
      return { status: r.status, json: await r.json() };
    },
  };
}

const JOKES = [
  { id: SOURCE, active: true, fact_type: "animal_humor", content: "Première blague.", context_filter: {} },
  { id: NEXT, active: true, fact_type: "animal_humor", content: "Seconde blague, sur les chats.", context_filter: { animal_species: "cat" } },
  { id: SEEN, active: true, fact_type: "animal_humor", content: "Blague déjà lue.", context_filter: {} },
  { id: "55555555-5555-4555-8555-555555555555", active: true, fact_type: "home_care_tip", content: "Un conseil maison.", context_filter: {} },
];
const BODY = { kind: "reply_chip", fact_id: SOURCE, active_role: "sitter", surface: "search", page_path: "/search" };

describe("ALMA4 · alma-chat, chemin reply_chip", () => {
  it("répond par un autre fait de la même famille, sans modèle ni réservation de tour", async () => {
    const h = harness({ facts: JOKES, history: [{ metadata: { fact_id: SEEN } }] });
    const { status, json } = await h.invoke(BODY);
    expect(status).toBe(200);
    expect(json.answer).toBe("Seconde blague, sur les chats.");
    expect(json.reply_fact_id).toBe(NEXT);
    expect(json.chips).toHaveLength(1);
    expect(json.chips[0].label).toBe("Voir les gardes ouvertes");
    expect(json.chips[0].path.startsWith("/search")).toBe(true);
    expect(h.callLovableAI).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();

    const log = h.writes.find((w) => w.table === "alma_conversations")!.row;
    expect(log).toMatchObject({
      input_mode: "reply_chip", question: "Une autre !", answer: "Seconde blague, sur les chats.",
      surface: "search", active_role: "sitter", refusal_reason: null, page_path: "/search",
    });
    expect(log.classification).toMatchObject({ intent: "reply_chip", chip: "another", fact_id: SOURCE, reply_fact_id: NEXT, version: almaVersion.ALMA_VERSION });
    const hist = h.writes.find((w) => w.table === "alma_whisper_history")!.row;
    expect(hist).toMatchObject({ whisper_type: "cultural_fact", dismissed_reason: "reply_chip" });
    expect(hist.metadata).toMatchObject({ fact_id: NEXT, fact_type: "animal_humor", via: "reply_chip" });
  });

  it("tout déjà lu ou plafond du jour atteint : phrase fixe, puce d'action, ligne tracée", async () => {
    const empty = harness({ facts: JOKES, history: [{ metadata: { fact_id: SEEN } }, { metadata: { fact_id: NEXT } }] });
    const a = await empty.invoke({ ...BODY, active_role: "owner" });
    expect(a.json.answer).toBe(replyChip.REPLY_CHIP_EMPTY_ANSWER);
    expect(a.json.chips[0].label).toBe("Publier une annonce");
    expect(empty.writes.some((w) => w.table === "alma_whisper_history")).toBe(false);

    const capped = harness({ facts: JOKES, usedToday: replyChip.REPLY_CHIP_DAILY_LIMIT });
    const b = await capped.invoke(BODY);
    expect(b.json.answer).toBe(replyChip.REPLY_CHIP_EMPTY_ANSWER);
    expect(capped.writes.find((w) => w.table === "alma_conversations")!.row.refusal_reason).toBe("reply_chip_limit");
    expect(capped.callLovableAI).not.toHaveBeenCalled();
  });

  it("refuse sans compte, sans fait connu, ou pour une relance d'usage", async () => {
    const h = harness({ facts: [...JOKES, { id: "66666666-6666-4666-8666-666666666666", active: true, fact_type: "usage_nudge", content: "Relance.", context_filter: {} }] });
    expect((await h.invoke(BODY, false)).status).toBe(401);
    expect((await h.invoke({ ...BODY, fact_id: "pas-un-identifiant" })).status).toBe(400);
    expect((await h.invoke({ ...BODY, fact_id: "77777777-7777-4777-8777-777777777777" })).status).toBe(400);
    expect((await h.invoke({ ...BODY, fact_id: "66666666-6666-4666-8666-666666666666" })).status).toBe(400);
    expect(h.writes).toHaveLength(0);
  });
});
