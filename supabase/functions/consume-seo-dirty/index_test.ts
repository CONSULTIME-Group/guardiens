import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

let handler: (req: Request) => Promise<Response>;
const serve = Deno.serve;
Object.defineProperty(Deno, "serve", { value: (h: typeof handler) => { handler = h; }, configurable: true });
try { await import("./index.ts"); } finally { Object.defineProperty(Deno, "serve", { value: serve, configurable: true }); }

type Profile = { id: string; role: string; bio: string; identity_verified: boolean; seo_dirty_at: string | null };
const dirty = "2026-10-03T10:00:00.000Z";
const profile = (id: string, extra: Partial<Profile> = {}): Profile => ({
  id, role: "sitter", bio: "Une présentation publique suffisamment longue pour être indexable. ".repeat(2),
  identity_verified: true, seo_dirty_at: dirty, ...extra,
});
function fixture(profiles: Profile[] = []) {
  return { profiles, recached: [] as string[], readError: false, clearError: false, recacheError: false, concurrent: false };
}

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
      assert(body.url.startsWith("https://guardiens.fr/gardiens/"));
      f.recached.push(body.url);
      if (f.concurrent) f.profiles.find((r) => body.url.endsWith(`/${r.id}`))!.seo_dirty_at = "2026-10-03T11:00:00.000Z";
      return new Response("test response", { status: f.recacheError ? 500 : 200 });
    }
    assertEquals(url.hostname, "test-project.supabase.co");
    const table = url.pathname.split("/").pop()!;
    if (table === "profiles" && req.method === "GET") {
      if (f.readError) return new Response(JSON.stringify({ message: "test read failed" }), { status: 500 });
      const roles = url.searchParams.get("role");
      result = f.profiles.filter((r) => r.seo_dirty_at && (!roles || ["sitter", "both"].includes(r.role))).slice(0, 300);
    } else if (table === "profiles" && req.method === "PATCH") {
      if (f.clearError) return new Response(JSON.stringify({ message: "test clear failed" }), { status: 500 });
      for (const r of f.profiles) {
        const id = url.searchParams.get("id");
        const version = url.searchParams.get("seo_dirty_at");
        if ((id === `eq.${r.id}` || id?.startsWith("in.(") && id.includes(r.id)) && (!version || version === `eq.${r.seo_dirty_at}`)) {
          r.seo_dirty_at = body.seo_dirty_at;
        }
      }
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
