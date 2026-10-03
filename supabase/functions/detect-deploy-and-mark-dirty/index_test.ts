import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Exercer le vrai handler, sans serveur, secret, base ou appel Prerender réel.
let handler: (req: Request) => Promise<Response>;
const serve = Deno.serve;
Object.defineProperty(Deno, "serve", { value: (h: typeof handler) => { handler = h; }, configurable: true });
try { await import("./index.ts"); } finally { Object.defineProperty(Deno, "serve", { value: serve, configurable: true }); }

const families = ["cities", "departments", "guides", "articles"];
type Row = Record<string, any>;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
function fixture() {
  const previous = hoursAgo(2);
  return {
    fingerprints: [
      { id: "old", fingerprint: "index-old.js", seen_count: 1, marked_at: previous },
      { id: "new", fingerprint: "index-new.js", seen_count: 1, marked_at: null },
    ] as Row[],
    state: new Map<string, Row>([
      ...families.map((family) => [family, { family, last_hash: "old", last_global_hash: "global", last_marked_at: previous }] as [string, Row]),
      ["static", { family: "static", last_hash: "index-new.js", last_marked_at: previous }],
    ]),
    used: 100,
    marked: [] as string[],
    decisions: [] as Row[],
    failMark: false,
    empty: false,
  };
}
type Fixture = ReturnType<typeof fixture>;

async function run(f: Fixture, options: Row = {}) {
  const fetchBefore = globalThis.fetch;
  const getBefore = Deno.env.get;
  const intervalBefore = globalThis.setInterval;
  const intervals = new Set<ReturnType<typeof setInterval>>();
  // Le SDK 2.49.1 démarre des horloges d'auth même avec une clé de service.
  // Fermer celles créées par ce test, tout en gardant le contrôle des fuites.
  globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
    const id = intervalBefore(...args);
    intervals.add(id);
    return id;
  }) as typeof setInterval;
  Object.defineProperty(Deno.env, "get", { value: (key: string) => ({
    SUPABASE_URL: "https://test-project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "fake-test-service-role",
  } as Record<string, string>)[key], configurable: true });
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    if (url.hostname === "guardiens.fr") return new Response("unavailable", { status: 503 });
    assertEquals(url.hostname, "test-project.supabase.co");
    const table = url.pathname.split("/").pop()!;
    const body = req.method === "HEAD" || req.method === "GET" ? null : await req.json();
    let result: unknown = [];
    if (req.method === "HEAD") {
      const count = table === "prerender_recache_log" ? f.used : f.empty ? 0 : 1;
      return new Response(null, { headers: { "Content-Range": `0-0/${count}` } });
    }
    if (table === "deploy_fingerprints") {
      if (req.method === "GET") result = f.fingerprints;
      else if (req.method === "PATCH") Object.assign(f.fingerprints.find((r) => `eq.${r.id}` === url.searchParams.get("id"))!, body);
      else f.fingerprints.push({ id: "inserted", seen_count: 1, ...body });
    } else if (table === "prerender_family_state") {
      if (req.method === "GET") result = [...f.state.values()];
      else for (const row of Array.isArray(body) ? body : [body]) f.state.set(row.family, row);
    } else if (["seo_city_pages", "seo_department_pages", "city_guides", "articles"].includes(table)) {
      if (f.failMark) return new Response(JSON.stringify({ message: "test mark failed" }), { status: 500 });
      f.marked.push(table);
      result = f.empty ? [] : [{ id: `${table}-id` }];
    } else if (table === "cron_run_log" && req.method === "POST") {
      result = { id: "test-run" };
    } else if (table === "prerender_mark_decisions") {
      f.decisions.push(...body);
    } else if (table === "admin_signals" && req.method === "GET") result = [];
    else assert(["prerender_recache_log", "cron_run_log", "admin_signals"].includes(table), `table inattendue ${table}`);
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await handler(new Request("https://edge.test/", {
      method: "POST", headers: { Authorization: "Bearer fake-test-service-role", "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint: "index-new.js", route_hashes: {
        global: "global", families: Object.fromEntries(families.map((family) => [family, "new"])),
      }, ...options }),
    }));
    return { status: response.status, payload: await response.json() };
  } finally {
    for (const id of intervals) clearInterval(id);
    globalThis.setInterval = intervalBefore;
    globalThis.fetch = fetchBefore;
    Object.defineProperty(Deno.env, "get", { value: getBefore, configurable: true });
  }
}

Deno.test("déploiement différé : le même bundle est repris après 24 h, puis reste dédupliqué", async () => {
  const f = fixture();
  assertEquals((await run(f)).payload.reason, "debounced");
  assertEquals(f.marked, []);
  assertEquals(f.state.get("cities")!.last_hash, "old");
  for (const st of f.state.values()) st.last_marked_at = hoursAgo(25);
  f.fingerprints[0].marked_at = hoursAgo(25);
  const resumed = await run(f);
  assertEquals(resumed.status, 200);
  assertEquals(resumed.payload.changed, false);
  assertEquals(resumed.payload.marked, 4);
  assertEquals(f.state.get("cities")!.last_hash, "new");
  assert(f.fingerprints[1].marked_at);
  assertEquals((await run(f)).payload.marked, 0);
  assertEquals(f.marked.length, 4);
});

Deno.test("refus de budget : les empreintes restent en attente et sont reprises sans nouveau bundle", async () => {
  const f = fixture();
  for (const st of f.state.values()) st.last_marked_at = hoursAgo(25);
  f.fingerprints[0].marked_at = hoursAgo(25);
  f.used = 17_999;
  assertEquals((await run(f)).payload.reason, "monthly_budget_exceeded");
  assertEquals(f.state.get("cities")!.last_hash, "old");
  assertEquals(f.marked, []);
  f.used = 100;
  assertEquals((await run(f)).payload.marked, 4);
});

Deno.test("pages statiques refusées : le repère est repris même quand le bundle est déjà connu", async () => {
  const f = fixture();
  for (const family of families) f.state.get(family)!.last_hash = "new";
  f.state.get("static")!.last_hash = "index-old.js";
  f.used = 17_991;
  await run(f);
  assertEquals(f.state.get("static")!.last_hash, "index-old.js");
  f.used = 17_990;
  await run(f);
  assertEquals(f.state.get("static")!.last_hash, "index-new.js");
  assertEquals(f.marked, []);
});

Deno.test("bootstrap : enregistrer les références sans mettre une seule page en file", async () => {
  const f = fixture(); f.fingerprints = []; f.state.clear();
  assertEquals((await run(f)).payload.reason, "bootstrap");
  assertEquals(f.marked, []);
  assertEquals(f.state.get("cities")!.last_hash, "new");
  assertEquals((await run(f)).payload.marked, 0);
});

Deno.test("hash global différé : le changement reste visible au prochain passage", async () => {
  const f = fixture();
  await run(f, { route_hashes: { global: "global-new", families: Object.fromEntries(families.map((family) => [family, "old"])) } });
  assertEquals(f.state.get("cities")!.last_global_hash, "global");
  assertEquals(f.marked, []);
});

Deno.test("fichier hashes indisponible : reprendre le bundle différé et mettre à jour sa date", async () => {
  const f = fixture();
  assertEquals((await run(f, { route_hashes: null })).payload.reason, "debounced");
  for (const st of f.state.values()) st.last_marked_at = hoursAgo(25);
  f.fingerprints[0].marked_at = hoursAgo(25);
  assertEquals((await run(f, { route_hashes: null })).payload.marked, 4);
  assert(f.fingerprints[1].marked_at);
  assertEquals((await run(f, { route_hashes: null })).payload.marked, 0);
});

Deno.test("familles vides : une vague acceptée fait avancer le repère, sans boucle", async () => {
  const f = fixture(); f.empty = true;
  for (const st of f.state.values()) st.last_marked_at = hoursAgo(25);
  f.fingerprints[0].marked_at = hoursAgo(25);
  await run(f);
  assertEquals(f.state.get("cities")!.last_hash, "new");
  assert(f.fingerprints[1].marked_at);
  assertEquals((await run(f)).payload.marked, 0);
  assertEquals(f.marked.length, 4);
});

Deno.test("échec du marquage : conserver les références de la vague précédente", async () => {
  const f = fixture(); f.failMark = true;
  for (const st of f.state.values()) st.last_marked_at = hoursAgo(25);
  f.fingerprints[0].marked_at = hoursAgo(25);
  assertEquals((await run(f)).status, 500);
  assertEquals(f.state.get("cities")!.last_hash, "old");
  assertEquals(f.fingerprints[1].marked_at, null);
});

Deno.test("la dernière vague par famille protège aussi un bundle déjà marqué", async () => {
  const f = fixture(); f.fingerprints[0].marked_at = hoursAgo(25);
  assertEquals((await run(f)).payload.reason, "debounced");
  assertEquals(f.marked, []);
});
