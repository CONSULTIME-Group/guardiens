import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Lot E10 : aucune liste passée dans un .in() ne dépasse 150 éléments
// (URL PostgREST, échec « error sending request » vers 390 UUID le 28/09).
const SRC = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
const IN_CHUNK = Number(SRC.match(/export const IN_CHUNK = (\d+);/)?.[1]);

Deno.test("IN_CHUNK vaut au plus 150", () => {
  assert(IN_CHUNK > 0 && IN_CHUNK <= 150);
});

Deno.test("chaque .in() sur une liste dynamique passe par un paquet IN_CHUNK", () => {
  const calls = [...SRC.matchAll(/\.in\("(\w+)",\s*([^)]+\)?)\)/g)];
  for (const [, col, arg] of calls) {
    if (arg.trim().startsWith("[")) continue; // liste littérale (rôles, statuts)
    const ok = /slice\(i, i \+ IN_CHUNK\)/.test(arg) || arg.trim() === "chunk";
    assert(ok, `.in("${col}", ${arg}) sans paquet borné`);
  }
  for (const m of SRC.matchAll(/const (\w*CHUNK) = ([^;]+);/g)) {
    if (m[1] === "INS_CHUNK") continue; // insertion en corps POST
    assert(m[2] === "IN_CHUNK" || Number(m[2]) <= 150, `${m[1]} = ${m[2]}`);
  }
  assert(!/profileIds\.slice\(i, i \+ 500\)/.test(SRC));
});

Deno.test("628 destinataires : aucune requête au-delà de 150", () => {
  const ids = Array.from({ length: 628 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
  const sizes: number[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) sizes.push(ids.slice(i, i + IN_CHUNK).length);
  assertEquals(sizes, [150, 150, 150, 150, 28]);
  const longest = Math.max(...sizes.map((n) => ids.slice(0, n).join(",").length));
  assert(longest < 6000);
});
