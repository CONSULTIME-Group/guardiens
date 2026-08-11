import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Garde-fou : le builder Supabase est paresseux. Un `void supabase.xxx(...)`
 * sans `.then` ni `.catch` n'émet AUCUNE requête HTTP, l'écriture est perdue
 * silencieusement (cas vécu sur `mark_sit_applications_viewed`).
 *
 * La forme autorisée pour un appel « fire and forget » est :
 *   void (async () => { const { error } = await supabase...; })()
 */

const ROOTS = ["src", "supabase/functions"];

function collect(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

export function findUnconsumedVoidCalls(source: string): number[] {
  const lines = source.split("\n");
  const offenders: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    if (!/\bvoid\s+supabase\w*\s*\./.test(line)) continue;
    // `removeChannel` / `getChannels` ne sont pas des builders paresseux :
    // l'appel part immédiatement, la promesse ne sert qu'à attendre la fin.
    if (/\bvoid\s+supabase\w*\.(removeChannel|removeAllChannels|getChannels)\s*\(/.test(line)) continue;


    // Récupère l'instruction complète : jusqu'au `;` fermant.
    let stmt = line;
    let j = i;
    while (!/;\s*(\/\/.*)?$/.test(lines[j]) && j < lines.length - 1 && j - i < 40) {
      j++;
      stmt += "\n" + lines[j];
    }

    if (/\.then\s*\(|\.catch\s*\(/.test(stmt)) continue;
    offenders.push(i + 1);
  }

  return offenders;
}

describe("garde-fou : aucune promesse Supabase non consommée", () => {
  it("aucun `void supabase.` sans .then/.catch dans les sources", () => {
    const files = ROOTS.flatMap((r) => collect(r));
    const problems: string[] = [];

    for (const file of files) {
      if (file.endsWith("no-unconsumed-supabase-call.test.ts")) continue;
      const src = fs.readFileSync(file, "utf8");
      for (const lineNo of findUnconsumedVoidCalls(src)) {
        problems.push(`${file}:${lineNo}`);
      }
    }

    expect(problems, `Promesses Supabase jamais consommées :\n${problems.join("\n")}`).toEqual([]);
  });

  it("détecte la forme fautive et accepte les formes correctes", () => {
    expect(findUnconsumedVoidCalls(`void supabase.rpc("x", { a: 1 });`)).toEqual([1]);
    expect(findUnconsumedVoidCalls(`void supabase.from("t").update({ a: 1 }).eq("id", id);`)).toEqual([1]);
    expect(findUnconsumedVoidCalls(`void supabase.rpc("x").then(() => {});`)).toEqual([]);
    expect(findUnconsumedVoidCalls(`void supabase.rpc("x").catch(() => {});`)).toEqual([]);
    expect(
      findUnconsumedVoidCalls(`void (async () => { const { error } = await supabase.rpc("x"); })();`),
    ).toEqual([]);
  });
});
