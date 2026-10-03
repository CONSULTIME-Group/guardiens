import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

let handler: (req: Request) => Promise<Response>;
const serve = Deno.serve;
Object.defineProperty(Deno, "serve", { value: (h: typeof handler) => { handler = h; }, configurable: true });
try { await import("./index.ts"); } finally { Object.defineProperty(Deno, "serve", { value: serve, configurable: true }); }

type Profile = { id: string; role: string; bio: string; identity_verified: boolean; seo_dirty_at: string | null };
type ContentRow = { id: string; slug: string | null; published: boolean; noindex: boolean; canonical_url?: string | null; seo_dirty_at: string | null };
const contentTables = ["articles", "seo_city_pages", "city_guides", "seo_department_pages"] as const;
const dirty = "2026-10-03T10:00:00.000Z";
const profile = (id: string, extra: Partial<Profile> = {}): Profile => ({
  id, role: "sitter", bio: "Une présentation publique suffisamment longue pour être indexable. ".repeat(2),
  identity_verified: true, seo_dirty_at: dirty, ...extra,
});
function fixture(profiles: Profile[] = []) {
  return {
    profiles, content: Object.fromEntries(contentTables.map((t) => [t, []])) as Record<string, ContentRow[]>,
    recached: [] as string[], recorded: [] as Array<{ url: string }>, events: [] as string[],
    readError: false, clearError: false, recacheError: false, concurrent: false,
    logError: false, contentReadError: "",
    ackInFlight: 0, ackMaxInFlight: 0,
  };
}
const content = (id: string, extra: Partial<ContentRow> = {}): ContentRow => ({ id, slug: id, published: true, noindex: false, seo_dirty_at: dirty, ...extra });

async function run(f: ReturnType<typeof fixture>) {
  const fetchBefore = globalThis.fetch;
  const getBefore = Deno.env.get;
  const intervalBefore = globalThis.setInterval;
  const intervals = new Set<ReturnType<typeof setInterval>>();
  globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
    const id = intervalBefore(...args); intervals.add(id); return id;
  }) as typeof setInterval;
  Object.defineProperty(Deno.env, "get", { value: (key: string) => ({
    SUPABASE_URL: "https://test-project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "fake-test-service-role",
    PRERENDER_TOKEN: "fake-prerender-token",
  } as Record<string, string>)[key], configurable: true });
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const body = req.method === "GET" ? null : await req.json();
    let result: unknown = [];
    if (url.hostname === "api.prerender.io") {
      assertEquals(url.pathname, "/recache");
      assertEquals(body.prerenderToken, "fake-prerender-token");
      assert(body.url.startsWith("https://guardiens.fr/"));
      f.recached.push(body.url);
      if (f.concurrent) {
        const row = [...f.profiles, ...Object.values(f.content).flat()].find((r) => body.url.endsWith(`/${"slug" in r ? r.slug : r.id}`));
        if (row) row.seo_dirty_at = "2026-10-03T11:00:00.000Z";
      }
      return new Response("test response", { status: f.recacheError ? 500 : 200 });
    }
    assertEquals(url.hostname, "test-project.supabase.co");
    const table = url.pathname.split("/").pop()!;
    const markedTable = table === "profiles" || contentTables.includes(table as typeof contentTables[number]);
    if (markedTable && req.method === "GET") {
      if (table === "profiles" && f.readError || table === f.contentReadError) return new Response(JSON.stringify({ message: "test read failed" }), { status: 500 });
      const roles = url.searchParams.get("role");
      const rows = table === "profiles" ? f.profiles : f.content[table];
      result = rows.filter((r) => r.seo_dirty_at
        && (!roles || "role" in r && ["sitter", "both"].includes(r.role))
        && (url.searchParams.get("published") !== "eq.true" || "published" in r && r.published))
        .slice(0, Number(url.searchParams.get("limit") || 300));
    } else if (markedTable && req.method === "PATCH") {
      f.events.push("clear");
      f.ackInFlight++; f.ackMaxInFlight = Math.max(f.ackMaxInFlight, f.ackInFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      f.ackInFlight--;
      if (f.clearError) return new Response(JSON.stringify({ message: "test clear failed" }), { status: 500 });
      for (const r of table === "profiles" ? f.profiles : f.content[table]) {
        const id = url.searchParams.get("id");
        const version = url.searchParams.get("seo_dirty_at");
        if ((id === `eq.${r.id}` || id?.startsWith("in.(") && id.includes(r.id)) && (!version || version === `eq.${r.seo_dirty_at}`)) {
          r.seo_dirty_at = body.seo_dirty_at;
        }
      }
    } else if (table === "prerender_recache_log" && req.method === "POST") {
      f.events.push("log");
      if (f.logError) return new Response(JSON.stringify({ message: "test log failed" }), { status: 500 });
      f.recorded.push(...body);
    } else if (table === "cron_run_log" && req.method === "POST") result = { id: "test-run" };
    else if (table === "prerender_family_state") result = null;
    else assert(["articles", "seo_city_pages", "city_guides", "seo_department_pages", "sitter_profiles", "sitter_gallery", "cron_run_log", "prerender_recache_log"].includes(table), `table inattendue ${table}`);
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await handler(new Request("https://edge.test/", { headers: { Authorization: "Bearer fake-test-service-role" } }));
    return { status: response.status, payload: await response.json() };
  } finally {
    for (const id of intervals) clearInterval(id);
    globalThis.setInterval = intervalBefore;
    globalThis.fetch = fetchBefore;
    Object.defineProperty(Deno.env, "get", { value: getBefore, configurable: true });
  }
}

Deno.test("fiche devenue non indexable : remplacer la copie, puis effacer la demande", async () => {
  const f = fixture([profile("ineligible", { bio: "", identity_verified: false })]);
  const result = await run(f);
  assertEquals(result.status, 200);
  assertEquals(f.recached, ["https://guardiens.fr/gardiens/ineligible"]);
  assertEquals(f.profiles[0].seo_dirty_at, null);
  assertEquals(result.payload.sitters_skipped_noindex, 0);
});

Deno.test("changement de rôle déjà marqué : traiter aussi la fiche devenue propriétaire", async () => {
  const f = fixture([profile("former-sitter", { role: "owner" })]);
  await run(f);
  assertEquals(f.recached, ["https://guardiens.fr/gardiens/former-sitter"]);
  assertEquals(f.profiles[0].seo_dirty_at, null);
});

Deno.test("échec Prerender : conserver la demande pour le prochain passage", async () => {
  const f = fixture([profile("retry", { bio: "" })]); f.recacheError = true;
  const result = await run(f);
  assertEquals(result.status, 500);
  assertEquals(result.payload.sitters_failed, 1);
  assertEquals(f.profiles[0].seo_dirty_at, dirty);
});

Deno.test("budget inchangé : au plus 25 demandes, les suivantes restent en file", async () => {
  const f = fixture(Array.from({ length: 28 }, (_, i) => profile(`sitter-${i}`)));
  const result = await run(f);
  assertEquals(result.status, 200);
  assertEquals(f.recached.length, 25);
  assertEquals(result.payload.sitters_deferred, 3);
  assertEquals(f.profiles.filter((r) => r.seo_dirty_at).length, 3);
});

Deno.test("nouvelle version pendant le recache : ne pas effacer la nouvelle demande", async () => {
  const f = fixture([profile("updated")]); f.concurrent = true;
  await run(f);
  assertEquals(f.profiles[0].seo_dirty_at, "2026-10-03T11:00:00.000Z");
});

Deno.test("erreur de lecture : aucune demande de recache ni acquittement", async () => {
  const f = fixture([profile("read-failure")]); f.readError = true;
  assertEquals((await run(f)).status, 500);
  assertEquals(f.recached, []);
  assertEquals(f.profiles[0].seo_dirty_at, dirty);
});

Deno.test("erreur d'acquittement : signaler l'échec et conserver la demande", async () => {
  const f = fixture([profile("clear-failure")]); f.clearError = true;
  assertEquals((await run(f)).status, 500);
  assertEquals(f.profiles[0].seo_dirty_at, dirty);
});

Deno.test("file vide : aucun appel Prerender", async () => {
  const f = fixture(); assertEquals((await run(f)).status, 200); assertEquals(f.recached, []);
});

for (const [table, path] of [["seo_city_pages", "/house-sitting/"], ["city_guides", "/guides/"], ["seo_department_pages", "/departement/"]]) {
  Deno.test(`${table} devenue non indexable : recacher avant acquittement`, async () => {
    const f = fixture(); f.content[table] = [content("withdrawn", { published: table !== "city_guides", noindex: table !== "city_guides" })];
    const result = await run(f);
    assertEquals(result.status, 200);
    assertEquals(f.recached, [`https://guardiens.fr${path}withdrawn`]);
    assertEquals(f.content[table][0].seo_dirty_at, null);
    assertEquals(f.events, ["log", "clear"]);
  });
  Deno.test(`${table} nouvelle date pendant recache : conserver la demande`, async () => {
    const f = fixture(); f.content[table] = [content("concurrent")]; f.concurrent = true;
    assertEquals((await run(f)).status, 200);
    assertEquals(f.content[table][0].seo_dirty_at, "2026-10-03T11:00:00.000Z");
  });
}

Deno.test("article depublie : remplacer l ancienne copie", async () => {
  const f = fixture(); f.content.articles = [content("unpublished", { published: false })];
  assertEquals((await run(f)).status, 200);
  assertEquals(f.recached, ["https://guardiens.fr/actualites/unpublished"]);
  assertEquals(f.content.articles[0].seo_dirty_at, null);
});
Deno.test("article modifie pendant recache : conserver sa nouvelle date", async () => {
  const f = fixture(); f.content.articles = [content("concurrent")]; f.concurrent = true;
  assertEquals((await run(f)).status, 200);
  assertEquals(f.content.articles[0].seo_dirty_at, "2026-10-03T11:00:00.000Z");
});
Deno.test("plafonds conjoints inchanges : 20 villes, 12 guides, 10 departements, 8 articles, 25 profils", async () => {
  const f = fixture(Array.from({ length: 28 }, (_, i) => profile(`profile-${i}`)));
  for (const [table, n] of [["seo_city_pages", 21], ["city_guides", 13], ["seo_department_pages", 11], ["articles", 9]] as const) {
    f.content[table] = Array.from({ length: n }, (_, i) => content(`${table}-${i}`));
  }
  const result = await run(f);
  assertEquals(result.status, 200); assertEquals(f.recached.length, 75);
  assertEquals([result.payload.city_recached, result.payload.guide_recached, result.payload.department_recached, result.payload.cleared, result.payload.sitters_recached], [20, 12, 10, 8, 25]);
  assertEquals([result.payload.city_deferred, result.payload.guide_deferred, result.payload.department_deferred, result.payload.articles_deferred, result.payload.sitters_deferred], [1, 1, 1, 1, 3]);
  assertEquals(f.recorded.map((r) => r.url), f.recached);
  assertEquals(f.events[0], "log");
  assert(f.ackMaxInFlight > 1 && f.ackMaxInFlight <= 6);
});
Deno.test("echec du journal : toutes les familles gardent leurs demandes", async () => {
  const f = fixture([profile("profile")]); f.logError = true;
  for (const table of contentTables) f.content[table] = [content(`${table}-page`)];
  assertEquals((await run(f)).status, 500);
  assertEquals(f.recached.length, 5); assertEquals(f.events, ["log"]);
  assertEquals(f.profiles[0].seo_dirty_at, dirty);
  for (const table of contentTables) assertEquals(f.content[table][0].seo_dirty_at, dirty);
});
Deno.test("erreur d acquittement programmatique : conserver la demande et sa trace", async () => {
  const f = fixture(); f.content.seo_city_pages = [content("clear-failure")]; f.clearError = true;
  assertEquals((await run(f)).status, 500); assertEquals(f.content.seo_city_pages[0].seo_dirty_at, dirty);
  assertEquals(f.recorded.length, 1);
});
Deno.test("erreur d acquittement article : conserver la demande et sa trace", async () => {
  const f = fixture(); f.content.articles = [content("clear-failure")]; f.clearError = true;
  assertEquals((await run(f)).status, 500); assertEquals(f.content.articles[0].seo_dirty_at, dirty);
  assertEquals(f.recorded.length, 1);
});
Deno.test("adresse programmatique absente : aucun render ni effacement silencieux", async () => {
  const f = fixture(); f.content.seo_city_pages = [content("invalid", { slug: null })];
  assertEquals((await run(f)).status, 500); assertEquals(f.recached, []);
  assertEquals(f.content.seo_city_pages[0].seo_dirty_at, dirty);
});
Deno.test("adresse article absente : aucun render ni effacement silencieux", async () => {
  const f = fixture(); f.content.articles = [content("invalid", { slug: null })];
  assertEquals((await run(f)).status, 500); assertEquals(f.recached, []);
  assertEquals(f.content.articles[0].seo_dirty_at, dirty);
});
Deno.test("lecture programmatique en erreur : aucun render ni effacement", async () => {
  const f = fixture(); f.content.seo_city_pages = [content("read-failure")]; f.contentReadError = "seo_city_pages";
  assertEquals((await run(f)).status, 500); assertEquals(f.recached, []);
  assertEquals(f.content.seo_city_pages[0].seo_dirty_at, dirty);
});
