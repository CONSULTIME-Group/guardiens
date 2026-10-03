import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeQueuedRecacheUrl } from "./queue-prerender-refresh.ts";

const handlers: Array<{ name: string; handler: (req: Request) => Promise<Response> }> = [];
const originalServe = Deno.serve;
for (const name of ["prerender-recache", "prerender-recache-pending", "flush-prerender-cache"]) {
  Object.defineProperty(Deno, "serve", { configurable: true, value: (handler: (req: Request) => Promise<Response>) => handlers.push({ name, handler }) });
  try { await import(`../${name}/index.ts`); }
  finally { Object.defineProperty(Deno, "serve", { configurable: true, value: originalServe }); }
}

async function run(handler: (req: Request) => Promise<Response>, body: unknown, authorized = true, error = false) {
  const getBefore = Deno.env.get;
  const fetchBefore = globalThis.fetch;
  const intervalBefore = globalThis.setInterval;
  const intervals = new Set<ReturnType<typeof setInterval>>();
  globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
    const id = intervalBefore(...args); intervals.add(id); return id;
  }) as typeof setInterval;
  Object.defineProperty(Deno.env, "get", { configurable: true, value: (key: string) => ({
    SUPABASE_URL: "https://test-project.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "fake-test-service-role",
  } as Record<string, string>)[key] });
  const queued: string[] = [];
  let forwarded = 0;
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init); const url = new URL(req.url);
    assertEquals(url.hostname, "test-project.supabase.co");
    if (url.pathname.endsWith("seo_enqueue_urls")) {
      if (error) return new Response(JSON.stringify({ message: "write failed" }), { status: 500 });
      queued.push(...(await req.json()).p_paths);
      return new Response(JSON.stringify(queued.length), { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname.endsWith("consume-seo-dirty")) {
      forwarded++; assertEquals(req.headers.get("Authorization"), "Bearer fake-test-service-role");
      return new Response(JSON.stringify({ ok: true, requests_attempted: 0 }), { headers: { "Content-Type": "application/json" } });
    }
    assert(url.pathname.includes("cron_run_log"));
    return new Response(JSON.stringify({ id: "test-run" }), { headers: { "Content-Type": "application/json" } });
  };
  try {
    const response = await handler(new Request("https://edge.test/", {
      method: "POST", headers: { "Content-Type": "application/json", ...(authorized ? { Authorization: "Bearer fake-test-service-role" } : {}) },
      body: JSON.stringify(body),
    }));
    return { status: response.status, payload: await response.json(), queued, forwarded };
  } finally {
    intervals.forEach(clearInterval); globalThis.setInterval = intervalBefore;
    globalThis.fetch = fetchBefore; Object.defineProperty(Deno.env, "get", { configurable: true, value: getBefore });
  }
}

for (const { name, handler } of handlers) {
  Deno.test(`${name} : demande authentifiee persistante, sans appel Prerender`, async () => {
    const r = await run(handler, { urls: ["/projets/old", "https://www.guardiens.fr/projets/old?source=test"] });
    assertEquals(r.status, 202); assertEquals(r.queued, ["/projets/old"]);
    assertEquals(r.payload.results[0].queued, true); assertEquals(r.forwarded, 0);
  });
  Deno.test(`${name} : origine externe refusee sans mutation`, async () => {
    const r = await run(handler, { urls: ["https://external.test/"] });
    assertEquals(r.status, 400); assertEquals(r.queued, []); assertEquals(r.forwarded, 0);
  });
  Deno.test(`${name} : appel historique sans URL delegue au consommateur unique`, async () => {
    const r = await run(handler, {}); assertEquals(r.status, 200); assertEquals(r.forwarded, 1);
  });
  Deno.test(`${name} : absence d'authentification refusee`, async () => {
    const r = await run(handler, { urls: ["/projets/old"] }, false);
    assertEquals(r.status, 401); assertEquals(r.queued, []); assertEquals(r.forwarded, 0);
  });
  Deno.test(`${name} : echec de sauvegarde ne declare pas de demande acceptee`, async () => {
    const r = await run(handler, { urls: ["/projets/old"] }, true, true);
    assertEquals(r.status, 500); assertEquals(r.queued, []);
  });
}
Deno.test("normalisation : HTTPS canonique, aucun port, credential ni chemin hors site", () => {
  assertEquals(normalizeQueuedRecacheUrl("projets/old/"), "https://guardiens.fr/projets/old");
  for (const input of ["http://guardiens.fr/", "https://user:pass@guardiens.fr/", "https://guardiens.fr:444/", "//outside.test/", null, ""]) {
    assertEquals(normalizeQueuedRecacheUrl(input), null);
  }
});
