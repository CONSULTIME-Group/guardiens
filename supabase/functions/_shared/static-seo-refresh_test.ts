import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  pickStaticToRecache,
  shouldMarkStatic,
  STATIC_RENDER_BUDGET,
  STATIC_SEO_URLS,
} from "./static-seo-refresh.ts";

const base = { isFirstEverRun: false, monthlyUsed: 100, monthlyBudget: 18_000 };

Deno.test("empreinte changee : 10 URL en file, 6 au premier passage, 4 au suivant", () => {
  assert(shouldMarkStatic({ ...base, bundleChanged: true }));
  assertEquals(STATIC_SEO_URLS.length, 10);
  const mark = "2026-09-28T18:00:00Z";
  const first = pickStaticToRecache(mark, new Map());
  assertEquals(first.toRecache, STATIC_SEO_URLS.slice(0, 6));
  assertEquals(first.deferred, 4);
  assert(first.toRecache.includes("https://guardiens.fr/annonces"));
  assert(first.toRecache.includes("https://guardiens.fr/guides"));
  // Passage suivant : les 6 premieres ont un succes journalise apres le repere.
  const last = new Map(first.toRecache.map((u) => [u, "2026-09-28T18:05:00Z"]));
  const second = pickStaticToRecache(mark, last);
  assertEquals(second.toRecache, [
    "https://guardiens.fr/a-propos",
    "https://guardiens.fr/contact",
    "https://guardiens.fr/projets",
    "https://guardiens.fr/petites-missions",
  ]);
  assertEquals(second.deferred, 0);
  // Troisieme passage : file vide.
  for (const u of second.toRecache) last.set(u, "2026-09-28T18:20:00Z");
  assertEquals(pickStaticToRecache(mark, last).toRecache, []);
});

Deno.test("un echec reste en file au passage suivant", () => {
  const mark = "2026-09-28T18:00:00Z";
  const last = new Map(STATIC_SEO_URLS.slice(0, 9).map((u) => [u, "2026-09-28T18:05:00Z"]));
  assertEquals(pickStaticToRecache(mark, last).toRecache, ["https://guardiens.fr/petites-missions"]);
});

Deno.test("les nouveaux hubs rejoignent une vague existante sans repayer les autres pages", () => {
  const mark = "2026-09-28T18:00:00Z";
  const added = ["https://guardiens.fr/annonces", "https://guardiens.fr/guides"];
  const last = new Map(STATIC_SEO_URLS.filter((u) => !added.includes(u)).map((u) => [u, "2026-09-28T18:05:00Z"]));
  assertEquals(pickStaticToRecache(mark, last), { toRecache: added, deferred: 0 });
  last.set(added[1], "2026-09-28T18:20:00Z");
  assertEquals(pickStaticToRecache(mark, last), { toRecache: [added[0]], deferred: 0 });
});

Deno.test("hubs annonces, guides, projets et entraide presents, toujours en https://guardiens.fr", () => {
  assert(STATIC_SEO_URLS.includes("https://guardiens.fr/annonces"));
  assert(STATIC_SEO_URLS.includes("https://guardiens.fr/guides"));
  assert(STATIC_SEO_URLS.includes("https://guardiens.fr/projets"));
  assert(STATIC_SEO_URLS.includes("https://guardiens.fr/petites-missions"));
  assertEquals(new Set(STATIC_SEO_URLS).size, STATIC_SEO_URLS.length);
  for (const u of STATIC_SEO_URLS) assert(u.startsWith("https://guardiens.fr/"));
});

Deno.test("empreinte inchangee : aucun marquage", () => {
  assertEquals(shouldMarkStatic({ ...base, bundleChanged: false }), false);
});

Deno.test("premier passage a table vide : aucun marquage", () => {
  assertEquals(shouldMarkStatic({ ...base, bundleChanged: true, isFirstEverRun: true }), false);
});

Deno.test("plafond mensuel : aucun marquage s'il serait franchi", () => {
  assertEquals(shouldMarkStatic({ ...base, bundleChanged: true, monthlyUsed: 17_991 }), false);
  assert(shouldMarkStatic({ ...base, bundleChanged: true, monthlyUsed: 17_990 }));
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
  assertEquals(r.deferred, STATIC_SEO_URLS.length - 4);
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
