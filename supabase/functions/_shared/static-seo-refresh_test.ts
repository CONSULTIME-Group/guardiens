import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  pickStaticToRecache,
  shouldMarkStatic,
  STATIC_RENDER_BUDGET,
  STATIC_SEO_URLS,
} from "./static-seo-refresh.ts";

const base = { isFirstEverRun: false, monthlyUsed: 100, monthlyBudget: 18_000 };

Deno.test("empreinte changee : les 6 URL statiques sont mises en file", () => {
  assert(shouldMarkStatic({ ...base, bundleChanged: true }));
  const { toRecache } = pickStaticToRecache("2026-09-28T18:00:00Z", new Map());
  assertEquals(toRecache, [...STATIC_SEO_URLS]);
  assertEquals(toRecache.length, 6);
});

Deno.test("empreinte inchangee : aucun marquage", () => {
  assertEquals(shouldMarkStatic({ ...base, bundleChanged: false }), false);
});

Deno.test("premier passage a table vide : aucun marquage", () => {
  assertEquals(shouldMarkStatic({ ...base, bundleChanged: true, isFirstEverRun: true }), false);
});

Deno.test("plafond mensuel : aucun marquage s'il serait franchi", () => {
  assertEquals(shouldMarkStatic({ ...base, bundleChanged: true, monthlyUsed: 17_995 }), false);
});

Deno.test("deja recachees apres le repere : rien a faire", () => {
  const last = new Map(STATIC_SEO_URLS.map((u) => [u, "2026-09-28T19:00:00Z"]));
  assertEquals(pickStaticToRecache("2026-09-28T18:00:00Z", last).toRecache, []);
  assertEquals(pickStaticToRecache(null, new Map()).toRecache, []);
});

Deno.test("budget de consume-seo-dirty respecte", () => {
  assertEquals(STATIC_RENDER_BUDGET, 6);
  const r = pickStaticToRecache("2026-09-28T18:00:00Z", new Map(), 4);
  assertEquals(r.toRecache.length, 4);
  assertEquals(r.deferred, 2);
});

Deno.test("les deux fonctions de la chaine lisent la liste partagee", async () => {
  const detect = await Deno.readTextFile(new URL("../detect-deploy-and-mark-dirty/index.ts", import.meta.url));
  const consume = await Deno.readTextFile(new URL("../consume-seo-dirty/index.ts", import.meta.url));
  assert(detect.includes('from "../_shared/static-seo-refresh.ts"'));
  assert(detect.includes("shouldMarkStatic("));
  assert(consume.includes('from "../_shared/static-seo-refresh.ts"'));
  assert(consume.includes("pickStaticToRecache("));
});

Deno.test("vite.config.ts n'appelle plus prerender-recache-pending", async () => {
  const vite = await Deno.readTextFile(new URL("../../../vite.config.ts", import.meta.url));
  assertEquals(vite.includes("prerender-recache-pending"), false);
  assertEquals(vite.includes("functions/v1"), false);
});
