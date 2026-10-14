/**
 * Lot A5 (audit Alma en arène du 14/10/2026) : sources et périmètre conformes
 * à la doctrine. Décisions de Jérémie du 14/10/2026 : l'outre-mer suit la
 * règle du site (isFrancePlace), chevaux et poneys en entraide sans
 * « quotidien » ni « régulier » (CGU 6.3).
 *
 * Recette : chaque chemin de la carte a un libellé ; aucune amorce ne contient
 * de chemin ; FRANCE_CODES et isFrancePlace alignés ; « Je cherche une garde
 * au Québec » d'un gardien du Rhône fait entrer l'annonce canadienne dans le
 * contexte d'Alma ; verrou de doctrine étendu à la carte, à draft-sit-from-prompt
 * et aux chuchotements.
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
import * as companion from "../../../supabase/functions/_shared/alma-companion";
import * as places from "../../../supabase/functions/_shared/alma-places";
import * as childCare from "../../../supabase/functions/_shared/mission-child-care";
import * as almaVersion from "../../../supabase/functions/_shared/alma-version";
import * as almaUsage from "../../../supabase/functions/_shared/alma-usage";
import * as almaBond from "../../../supabase/functions/_shared/alma-bond";
import * as sitPlace from "../../../supabase/functions/_shared/sit-place";
import { ALMA_PAGE_LABELS, almaPageKindLabel, almaPageLabel } from "../../../supabase/functions/_shared/alma-page-labels";
import * as siteRules from "@/lib/sitSearchRules";
import { ENTRAIDE_IDEAS } from "@/lib/entraideIdeas";
import { buildConversationStagnantWhisper } from "@/lib/alma/whisper-triggers";
import { parseAlmaMessage } from "@/components/ai/alma/AlmaConversation";

const read = (p: string) => readFileSync(p, "utf8");
const { ALMA_SITE_KNOWLEDGE, selectKnowledge } = siteKnowledge;

/** Annonces publiées et ouvertes relues en base le 14/10/2026 (extrait). */
const CA_SIT = {
  id: "ca000000-0000-4000-8000-000000000001",
  slug: "un-noel-magique-au-c-ur-du-magnifique-quebec-entoure-de-natu-saint-ludger-quebec-45219d",
  title: "Un Noël magique au cœur du magnifique Québec, entouré de nature et de chats",
  country: "CA", city: "Saint Ludger, Québec, Canada", departement_code: null,
  start_date: "2026-12-15", end_date: "2027-01-12", status: "published", accepting_applications: true,
};
const ROWS = [
  CA_SIT,
  { id: "fr000000-0000-4000-8000-000000000069", slug: "garde-yorkshire-69", title: "Garde de notre petit yorkshire", country: "FR", city: "Lyon", departement_code: "69", start_date: "2026-12-20", end_date: "2027-01-20", status: "published", accepting_applications: true },
  { id: "fr000000-0000-4000-8000-000000000038", slug: "garde-vienne-38", title: "Garde de 2 chiens et un chat", country: "FR", city: "Vienne", departement_code: "38", start_date: "2026-12-10", end_date: "2027-01-03", status: "published", accepting_applications: true },
  { id: "pf000000-0000-4000-8000-000000000987", slug: "garde-taravao", title: "Garde de maison et animaux à Taravao, Tahiti", country: "PF", city: "Hauteur de Taravao", departement_code: "987", start_date: "2026-12-01", end_date: "2027-01-13", status: "published", accepting_applications: true },
];

describe("A5 · libellés de pages", () => {
  it("chaque chemin et alias de la carte du site a un libellé", () => {
    const missing = ALMA_SITE_KNOWLEDGE.flatMap((e) => [e.path, ...(e.aliases ?? [])]).filter((p) => !ALMA_PAGE_LABELS[p]);
    expect(missing).toEqual([]);
  });
  it("/mon-abonnement s'appelle « Mon accès », la page Québec a son nom", () => {
    expect(almaPageLabel("/mon-abonnement")).toBe("Mon accès");
    expect(almaPageLabel("/gardiennage-maison-quebec")).toBe("Gardiennage de maison au Québec");
    expect(ALMA_PAGE_LABELS["/tarifs"]).toBe("Guardiens est gratuit");
  });
  it("une adresse réelle trouve la nature de sa page, jamais un nom fabriqué", () => {
    expect(almaPageLabel(`/annonces/${CA_SIT.slug}`)).toBeNull();
    expect(almaPageKindLabel(`/annonces/${CA_SIT.slug}`)).toBe("Fiche d'une annonce");
    expect(almaPageKindLabel("/annonces/international")).toBe("Les gardes à l'international");
    expect(almaPageKindLabel("/house-sitting/lyon")).toBe("Page d'une ville");
    expect(almaPageKindLabel("/sits/abc/edit")).toBe("Modifier une annonce");
  });
  it("dans la conversation : la page Québec et Mon accès sont nommées, une annonce garde son titre", () => {
    const quebec = parseAlmaMessage("Tout est réuni sur /gardiennage-maison-quebec.");
    expect(quebec.links[0]).toMatchObject({ title: "Gardiennage de maison au Québec", kind: "action" });
    expect(parseAlmaMessage("Voyez /mon-abonnement.").links[0].title).toBe("Mon accès");
    const sit = parseAlmaMessage(`Regardez /annonces/${CA_SIT.slug}.`).links[0];
    expect(sit).toMatchObject({ kind: "source", label: "Fiche d'une annonce" });
    expect(parseAlmaMessage("Lisez /faq.").links[0]).toMatchObject({ title: "La FAQ", kind: "source" });
  });
});

describe("A5 · amorces et entrée abonnement", () => {
  it("aucune amorce ne contient de chemin (« / » suivi d'une lettre)", () => {
    const withPath = ALMA_SITE_KNOWLEDGE.filter((e) => /\/[a-z]/i.test(e.opener)).map((e) => e.key);
    expect(withPath).toEqual([]);
  });
  it("entrée abonnement selon la doctrine : Guardiens est gratuit, page Mon accès, pour tous", () => {
    const e = ALMA_SITE_KNOWLEDGE.find((x) => x.key === "abonnement")!;
    expect(e.label).toBe("Mon accès");
    expect(e.audience).toBe("all");
    expect(e.purpose).toMatch(/^Guardiens est gratuit, pour tous les membres/);
    expect(e.purpose.replace(/Guardiens est gratuit/g, "")).not.toMatch(/gratuit|abonnement|factur|offert/i);
    expect(selectKnowledge({ question: "C'est payant ?", role: "owner" })[0].key).toBe("abonnement");
  });
});

describe("A5 · périmètre aligné sur la règle du site", () => {
  const CODES = ["FR", "fr", " FR ", "PF", "NC", "RE", "GP", "MQ", "YT", "WF", "CA", "IT", "BE", "", null];
  it("FRANCE_CODES et isFrancePlace disent la même chose pour chaque pays", () => {
    for (const c of CODES) {
      const site = siteRules.isFrancePlace({ country: c });
      const alma = truth.FRANCE_CODES.has(String(c ?? "").trim().toUpperCase());
      expect(alma, String(c)).toBe(site);
    }
    expect([...truth.FRANCE_CODES]).toEqual(["FR"]);
  });
  it("hors de France pour Alma = règle de la page internationale (pays connu, autre que FR)", () => {
    for (const c of CODES) {
      const intl = !!c && String(c).trim() !== "" && String(c).trim().toUpperCase() !== "FR";
      expect(truth.hasForeignSits([{ country: c }]), String(c)).toBe(intl);
    }
  });
  it("une seule source : le site réexporte le module partagé avec Alma", () => {
    expect(siteRules.isFrancePlace).toBe(sitPlace.isFrancePlace);
    expect(siteRules.resolveSitPlace).toBe(sitPlace.resolveSitPlace);
    expect(read("src/lib/sitSearchRules.ts")).toContain("supabase/functions/_shared/sit-place");
    expect(read("supabase/functions/_shared/alma-truth.ts")).toContain('from "./sit-place.ts"');
  });
  it("lieu du propriétaire d'abord, comme le site", () => {
    const row = { country: "FR", city: "Lyon", owner: { city: "Papeete", country: "PF" } };
    expect(siteRules.isFrancePlace(row)).toBe(false);
    expect(truth.hasForeignSits([row])).toBe(true);
  });
  it("phrase de périmètre construite depuis les pays des annonces publiées", () => {
    expect(truth.scopeSentence(ROWS)).toBe("Guardiens propose des gardes en France, et aujourd'hui aussi au Canada et en Polynésie française.");
    expect(truth.scopeSentence(ROWS.filter((r) => r.country === "FR"))).toBe("Guardiens propose des gardes en France.");
    expect(truth.scopeDirective(ROWS)).toContain("au Canada et en Polynésie française");
    for (const f of ["supabase/functions/_shared/alma-truth.ts", "supabase/functions/_shared/alma-companion.ts"]) {
      expect(read(f), f).not.toContain("Polynésie française comprise");
    }
  });
  it("Papeete et Tahiti : Polynésie française, hors de France", () => {
    expect(truth.foreignPlaceIn("Je cherche une garde à Papeete")?.iso).toBe("PF");
    expect(truth.foreignPlaceIn("une garde à Tahiti")?.inCountry).toBe("en Polynésie française");
  });
});

describe("A5 · inventaire hors département", () => {
  it("« Je cherche une garde au Québec » d'un gardien du Rhône : l'annonce canadienne entre dans l'inventaire", () => {
    const foreign = truth.foreignPlaceIn("Je cherche une garde au Québec");
    expect(foreign?.iso).toBe("CA");
    const asked = truth.askedPlaceSits({ foreign, french: null, rows: ROWS, personDept: "69" });
    expect(asked.map((r) => r.id)).toEqual([CA_SIT.id]);
    const inv = { ...almaInventory.emptyInventory({ postal_code: "69005" }), hors_departement: asked.map(almaInventory.inventoryItemOfSit), lieu_demande_hors_france: true };
    const block = almaInventory.formatInventory(inv, { foreignOpen: true });
    expect(block).toContain(`/annonces/${CA_SIT.slug}`);
    expect(block).toContain("/annonces/international");
    expect(block).toContain("hors de son département");
  });
  it("une autre région française : 3 annonces au plus, jamais celles du département de la personne", () => {
    const deps = [{ code: "56", nom: "Morbihan", nom_region: "Bretagne" }, { code: "29", nom: "Finistère", nom_region: "Bretagne" }];
    const rows = [
      { id: "fr-56", country: "FR", city: "Vannes", departement_code: "56", start_date: "2026-11-01" },
      { id: "fr-29", country: "FR", city: "Quimper", departement_code: "29", start_date: "2026-11-02" },
    ];
    const french = truth.frenchPlaceSitsIn("une garde en Bretagne", deps, rows);
    const asked = truth.askedPlaceSits({ foreign: null, french, rows, personDept: "56" });
    expect(asked.map((r) => r.departement_code)).toEqual(["29"]);
    const many = Array.from({ length: 6 }, (_, i) => ({ ...CA_SIT, id: `ca-${i}` }));
    expect(truth.askedPlaceSits({ foreign: { iso: "CA" }, french: null, rows: many, personDept: "69" })).toHaveLength(3);
  });
  it("le gardien reçoit « Postuler » sur la garde du lieu demandé", () => {
    const facts = almaFacts.buildVerifiedFacts({ role: "sitter", ownSits: [], received: [], sent: [], missions: [], today: "2026-10-14" });
    const inventory = { ...almaInventory.emptyInventory({ postal_code: "69005" }), hors_departement: [almaInventory.inventoryItemOfSit(CA_SIT)] };
    const r = nextAction.computeNextAction({ facts, inventory, accountRole: "sitter", activeRole: "sitter", question: "Je cherche une garde au Québec", register: "reassurance", completion: 70, foreignOpen: true, today: "2026-10-14" } as any);
    expect(r.action?.path).toBe(`/sits/${CA_SIT.id}?postuler=1`);
    expect(r.action?.reason).toBe("annonce_lieu_demande");
  });
});

/** alma-chat rejoué sur son code source, base simulée qui applique les filtres eq. */
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
      else if (table === "sits") rows = filters.user_id ? [] : ROWS.filter((r: any) => Object.entries(filters).every(([k, v]) => !(k in r) || r[k] === v));
      else if (table === "departements") rows = [{ code: "69", nom: "Rhône", nom_region: null }];
      return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null, count: 0 }).then(resolve, reject);
    };
    return chain;
  });
  const callLovableAI = vi.fn(async (_req: any) => ({ ok: true, data: { choices: [{ message: { content: "Une garde vous attend au Québec, pour Noël." } }] } }));
  const client = { from, rpc: vi.fn(async () => ({ data: [], error: null })), auth: { getUser: vi.fn(async () => ({ data: { user: { id: "a5000000-0000-4000-8000-000000000069" } }, error: null })) } };
  const { outputText } = ts.transpileModule(read("supabase/functions/alma-chat/index.ts"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const mods: Record<string, unknown> = {
    "alma-system-prompt.ts": prompt, "alma-intent.ts": almaIntent, "alma-site-knowledge.ts": siteKnowledge,
    "alma-facts.ts": almaFacts, "alma-inventory.ts": almaInventory, "alma-next-action.ts": nextAction,
    "alma-classify.ts": almaClassify, "alma-output.ts": almaOutput, "normalize-contact-message.ts": normalizeContact,
    "alma-owner-question.ts": ownerQuestion, "sit-location.ts": sitLocation, "alma-home-photo.ts": homePhoto, "alma-truth.ts": truth, "alma-companion.ts": companion, "alma-places.ts": places, "mission-child-care.ts": childCare, "alma-version.ts": almaVersion, "alma-usage.ts": almaUsage, "alma-bond.ts": almaBond,
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
    invoke: async (message: string) => {
      const r = await handler(new Request("https://fixture.invalid", {
        method: "POST", headers: { Authorization: "Bearer fixture" },
        body: JSON.stringify({ message, active_role: "sitter", surface: "sitter_dashboard", history: [] }),
      }));
      return r.json();
    },
  };
}

describe("A5 · sonde alma-chat, « Je cherche une garde au Québec »", () => {
  it("un gardien du Rhône : l'annonce canadienne et la page internationale arrivent au modèle", async () => {
    const h = harness({ role: "sitter", first_name: "Camille", city: "Lyon", postal_code: "69005", departement_code: "69", country: "FR" });
    const out = await h.invoke("Je cherche une garde au Québec");
    expect(h.callLovableAI).toHaveBeenCalled();
    const sent = JSON.stringify(h.callLovableAI.mock.calls[0][0].messages);
    expect(sent).toContain(`/annonces/${CA_SIT.slug}`);
    expect(sent).toContain("/annonces/international");
    expect(sent).toContain("au Canada et en Polynésie française");
    expect(sent).not.toContain("Polynésie française comprise");
    expect(out.action?.path ?? "").toContain(CA_SIT.id);
    const log = h.writes.find((w) => w.table === "alma_conversations")?.row;
    expect(log?.classification?.version).toBe("2026-10-14.a5");
  });
});

describe("A5 · sources citées par Alma", () => {
  it("un article qui compare avec la pension sort des sources, la FAQ reste", () => {
    const rows = [
      { source: "article", title: "Garde à domicile ou pension ?", snippet: "Comparatif honnête", url: "/actualites/x" },
      { source: "faq", title: "Je suis un professionnel", snippet: "éducateurs, pensions, pet-sitters", url: "/faq" },
      { source: "conseil", title: "Conseil animal", snippet: "Halètement intense par forte chaleur", url: "/conseils" },
    ];
    expect(truth.doctrineSources(rows).map((r) => r.source)).toEqual(["faq", "conseil"]);
    expect(read("supabase/functions/alma-chat/index.ts")).toContain("doctrineSources(data)");
  });
  it("migration préparée : 9 articles, UPDATE gardés par l'ancien texte, recette à 0", () => {
    const sql = read("supabase/prepared-migrations/20261014190000_a5_alma_sources.sql");
    const updates = sql.match(/UPDATE public\.articles/g) ?? [];
    const guards = sql.match(/AND position\(\$a5\$/g) ?? [];
    expect(updates.length).toBe(20);
    expect(guards.length).toBe(updates.length);
    for (const slug of ["labrador-retriever-guide-race", "garde-chien-lyon-solutions", "securite-confiance-house-sitting", "devenir-gardien-guide-complet", "proprietaire-preparer-garde-maison", "choisir-gardien-bons-criteres"]) {
      expect(sql, slug).toContain(`slug = '${slug}'`);
    }
    // Les textes posés disent la rencontre facultative, jamais recommandée.
    const written = [...sql.matchAll(/\$a5\$,\n {2}\$a5\$([\s\S]*?)\$a5\$\)/g)].map((m) => m[1]).join("\n");
    expect(written).not.toMatch(/recommand|indispensable|obligatoire/i);
    expect(written).not.toMatch(/[–—]/);
    expect(written).toMatch(/si vous le souhaitez tous les deux/);
  });
});

describe("A5 · entraide : tuiles réelles, chevaux et poneys ponctuels", () => {
  it("la ligne d'exemples du prompt reprend les 6 tuiles de la page Entraide", () => {
    for (const idea of ENTRAIDE_IDEAS) {
      const label = idea.label.charAt(0).toLowerCase() + idea.label.slice(1);
      expect(prompt.ALMA_SYSTEM_PROMPT, idea.key).toContain(label);
    }
    expect(prompt.ALMA_SYSTEM_PROMPT).not.toMatch(/partie d'échecs, de Scrabble ou de belote/);
  });
  it("chevaux et poneys : coup de main ponctuel dans le prompt et la consigne d'aide", () => {
    expect(prompt.ALMA_SYSTEM_PROMPT).toContain("coup de main ponctuel");
    const intent = almaIntent.detectAlmaIntent("je cherche de l'aide pour mes chevaux", []);
    expect(almaIntent.almaHelpDirective(intent) ?? "").toContain("coup de main ponctuel");
    expect(nextAction.suggestMissionTitle("j'ai 15 chevaux et poneys")).toBe("Un coup de main ponctuel pour mes chevaux et poneys");
  });
  it("brouillon d'entraide pour des chevaux : ni « quotidien » ni « régulier »", () => {
    const answer = "Je vous propose le titre « Soins quotidiens pour mes chevaux ».\nBROUILLON: Soins quotidiens pour mes chevaux | Je cherche quelqu'un pour nourrir régulièrement mes deux poneys. Le pré est à Vienne, le foin est sur place.";
    const r = nextAction.applyDraftToAction(answer, { label: "Demander un coup de main", path: "/petites-missions/creer", reason: "aide_entraide" });
    expect(r.title).toBe("Soins ponctuels pour mes chevaux");
    const params = new URLSearchParams(r.action!.path.split("?")[1]);
    expect(`${params.get("titre")} ${params.get("description")}`).not.toMatch(/quotidien|r[ée]guli/i);
    expect(params.get("description")).toBe("Le pré est à Vienne, le foin est sur place.");
    expect(r.answer).toContain("« Soins ponctuels pour mes chevaux »");
  });
  it("une annonce de garde garde ses mots : la règle ne vise que l'entraide", () => {
    const answer = "BROUILLON: Soins quotidiens pour mes chevaux | Nourrir chaque jour mes chevaux pendant mon absence.";
    const r = nextAction.applyDraftToAction(answer, { label: "Publier mon annonce de garde", path: "/sits/create", reason: "intention_garde" });
    expect(r.title).toBe("Soins quotidiens pour mes chevaux");
  });
});

describe("A5 · verrou de doctrine étendu", () => {
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  const FILES = [
    "supabase/functions/_shared/alma-site-knowledge.ts",
    "supabase/functions/draft-sit-from-prompt/index.ts",
    "src/lib/alma/whisper-triggers.ts",
  ];
  const MANDATORY = [
    /rencontre[^.\n]{0,80}(recommand|indispensable|obligatoire)/i,
    /(recommand|indispensable)[^.\n]{0,80}rencontr/i,
    /invitation à la rencontre/i,
    /fixer une rencontre/i,
    /Rencontrez les candidats/,
  ];
  for (const f of FILES) {
    it(`${f} : sans tiret long, sans voisin, sans comparaison, rencontre facultative`, () => {
      // La liste des mots proscrits de draft-sit-from-prompt (PROSCRIBED) est du code, pas un texte.
      const src = stripComments(read(f)).replace(/^.*PROSCRIBED = .*$/m, "");
      expect(src, f).not.toMatch(/[–—]/);
      expect(src, f).not.toMatch(/voisin/i);
      expect(src, f).not.toMatch(/\bpensions?\b|contrairement|pet-sitter/i);
      expect(src, f).not.toMatch(/gratuit pour vous|0\s*€ pour les propriétaires|sans engagement|Guardiens est offert/i);
      for (const re of MANDATORY) expect(src, `${f} ${re}`).not.toMatch(re);
    });
  }
  it("chuchotement de conversation : rencontre si vous le souhaitez tous les deux", () => {
    const w = buildConversationStagnantWhisper({ firstName: "Paul", onProposeMeeting: () => {} });
    expect(w.message).toContain("Si vous le souhaitez tous les deux, une rencontre avant la garde aide à faire connaissance.");
  });
  it("brouillon d'annonce : proposition d'échanger, rencontre si les deux le souhaitent", () => {
    expect(read("supabase/functions/draft-sit-from-prompt/index.ts")).toContain("proposition d'échanger, et de se rencontrer si les deux le souhaitent");
  });
  it("version d'Alma", () => {
    expect(almaVersion.ALMA_VERSION).toBe("2026-10-14.a5");
  });
});
