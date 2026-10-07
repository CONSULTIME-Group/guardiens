/**
 * Lot L3 : les 5 phrases réelles rejouées sur le code source d'alma-chat tel
 * que déployé, avec le contexte réel simulé (Martine : both, espace
 * propriétaire, brouillon du 03/09 périmé ; 16 annonces publiées, toutes en
 * France dont 2 en Polynésie française). Aucun appel au modèle n'est attendu.
 */
import { readFileSync } from "node:fs";
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
import { ALMA_REPLAY_CASES } from "@/data/almaReplayCases";
import { checkReplayAnswer } from "@/lib/alma/replayChecks";

const MARTINE = "097ad66d-4da8-4182-af58-4e4250e585c6";
const PUBLISHED = [
  ...Array.from({ length: 14 }, (_, i) => ({ country: "FR", city: `Commune ${i}`, departement_code: String(10 + i) })),
  { country: "PF", city: "Papeete", departement_code: "987" },
  { country: "PF", city: "Moorea", departement_code: "987" },
];
const OWN_SITS = [{ id: "68f35bdd-554d-47c5-b401-197b2b63ce91", title: "Suite à plusieurs annulations je cherche un gardien pour Angus du 3/9 au 20/9", status: "draft", city: "Damgan", start_date: "2026-09-03", end_date: "2026-09-20" }];
const DEPS = [{ code: "56", nom: "Morbihan", nom_region: "Bretagne" }, { code: "987", nom: "Polynésie française", nom_region: "Outre-mer" }];

function harness(profile: Record<string, unknown>) {
  let handler!: (request: Request) => Promise<Response>;
  const writes: Array<{ table: string; row: any }> = [];
  const from = vi.fn((table: string) => {
    const filters: Record<string, unknown> = {};
    let single = false;
    const chain: Record<string, any> = {};
    chain.select = () => chain;
    chain.eq = (c: string, v: unknown) => { filters[c] = v; return chain; };
    chain.gte = chain.lte = chain.order = chain.in = chain.or = chain.like = chain.neq = chain.ilike = chain.not = chain.is = chain.limit = chain.contains = chain.overlaps = chain.filter = chain.range = () => chain;
    chain.maybeSingle = chain.single = () => { single = true; return chain; };
    chain.insert = (row: any) => { writes.push({ table, row }); const p: any = Promise.resolve({ error: null }); p.select = () => ({ single: () => Promise.resolve({ data: { id: "conv-1" }, error: null }) }); return p; };
    chain.then = (resolve: (v: unknown) => unknown, reject: (r: unknown) => unknown) => {
      let rows: any[] = [];
      if (table === "profiles") rows = [profile];
      else if (table === "sits") rows = filters.user_id ? OWN_SITS : PUBLISHED;
      else if (table === "departements") rows = DEPS;
      return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null, count: 0 }).then(resolve, reject);
    };
    return chain;
  });
  const callLovableAI = vi.fn(async () => ({ ok: true, data: { choices: [{ message: { content: "Réponse du modèle." } }] } }));
  const client = { from, rpc: vi.fn(async () => ({ data: [], error: null })), auth: { getUser: vi.fn(async () => ({ data: { user: { id: MARTINE } }, error: null })) } };
  const source = readFileSync("supabase/functions/alma-chat/index.ts", "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const mods: Record<string, unknown> = {
    "alma-system-prompt.ts": prompt, "alma-intent.ts": almaIntent, "alma-site-knowledge.ts": siteKnowledge,
    "alma-facts.ts": almaFacts, "alma-inventory.ts": almaInventory, "alma-next-action.ts": nextAction,
    "alma-classify.ts": almaClassify, "alma-output.ts": almaOutput, "normalize-contact-message.ts": normalizeContact,
    "alma-owner-question.ts": ownerQuestion, "sit-location.ts": sitLocation, "alma-home-photo.ts": homePhoto, "alma-truth.ts": truth,
  };
  runInNewContext(outputText, {
    exports: {}, Request, Response, Date, console: { error: vi.fn(), log: vi.fn() },
    Deno: { env: { get: () => "fixture" }, serve: (fn: typeof handler) => { handler = fn; } },
    require: (name: string) => {
      if (name.includes("supabase-js")) return { createClient: () => client };
      if (name.endsWith("ai-gateway.ts")) return { callLovableAI, CORS_HEADERS: {} };
      if (name.endsWith("alma-frustration-signal.ts")) return { recordAlmaFrustration: async () => {} };
      if (name.endsWith("alma-signals.ts")) return { recordAlmaSignal: async () => {} };
      const key = Object.keys(mods).find((k) => name.endsWith(k));
      if (key) return mods[key];
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return {
    callLovableAI, writes,
    invoke: async (c: (typeof ALMA_REPLAY_CASES)[number]) => {
      const r = await handler(new Request("https://fixture.invalid", {
        method: "POST", headers: { Authorization: "Bearer fixture" },
        body: JSON.stringify({ message: c.question, active_role: c.activeRole, surface: c.surface, history: c.history.map((content) => ({ role: "user", content })) }),
      }));
      return r.json();
    },
  };
}

export const REPLAY_OUTPUT: Record<string, { answer: string; action: string; path: string }> = {};

describe("L3, rejeu des 5 phrases réelles sur alma-chat", () => {
  for (const id of ["cas-43", "cas-44", "cas-45", "cas-46", "cas-47"]) {
    it(`${id} conforme`, async () => {
      const c = ALMA_REPLAY_CASES.find((x) => x.id === id)!;
      const h = harness({ role: c.accountRole, first_name: "Martine", city: "Damgan", departement_code: "56", country: "FR" });
      const out = await h.invoke(c);
      REPLAY_OUTPUT[id] = { answer: out.answer, action: out.action?.label, path: out.action?.path };
      console.log(`[${id}] ${c.question}\n  réponse : ${out.answer}\n  action : ${out.action?.label} -> ${out.action?.path}`);
      expect(h.callLovableAI).not.toHaveBeenCalled();
      const v = checkReplayAnswer({ question: c.question, answer: out.answer, action: out.action, expect: c.expect });
      expect(v.reasons).toEqual([]);
      expect(out.answer).not.toMatch(/[\u2013\u2014]|voisin|gratuit|international|dossier/i);
      expect(h.writes[0]?.row?.proposed_action?.label ?? "").not.toMatch(/^Publier le brouillon/);
    });
  }
});
