import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * Verrou : aucune fonction serveur n'appelle un modèle d'IA retiré de la
 * passerelle Lovable. Catalogue lu le 14/10/2026 (GET /v1/models) :
 * la famille Gemini 2.5 est retirée le 20/10/2026, gpt-4o-mini-transcribe
 * le 26/02/2027. Remplaçants : gemini-3.8-flash, gemini-3.1-pro-preview,
 * gemini-3.1-flash-lite, gpt-transcribe. Le repli openai/gpt-4o-transcribe
 * d'alma-transcribe reste autorisé jusqu'au 26/02/2027 (décision de Jérémie
 * du 14/10/2026) et doit être remplacé avant.
 */
const RETIRED_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.0-flash",
  "google/gemini-1.5-flash",
  "google/gemini-1.5-pro",
  "openai/gpt-4o-mini-transcribe",
];

const ROOT = resolve(process.cwd(), "supabase/functions");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx|js|mjs)$/.test(name) ? [path] : [];
  });
}

describe("modèles d'IA retirés", () => {
  it("aucune fonction serveur ne cite un modèle retiré", () => {
    const hits: string[] = [];
    for (const file of walk(ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const model of RETIRED_MODELS) {
        const re = new RegExp(`["'\`]${model.replace(/[.]/g, "\\.")}["'\`]`);
        if (re.test(text)) hits.push(`${relative(process.cwd(), file)} : ${model}`);
      }
    }
    expect(hits).toEqual([]);
  });

  // Les modèles Gemini 3 réfléchissent avant de répondre et cette réflexion
  // compte dans max_tokens : essai de la passerelle du 14/10/2026, 284 jetons
  // de réflexion sur 300 et 476 sur 500, texte coupé (finish_reason length).
  it("aucun plafond max_tokens sous 1 500", () => {
    const low: string[] = [];
    for (const file of walk(ROOT)) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/max_tokens:\s*([^,\n}]+)/g)) {
        for (const n of m[1].match(/\d+/g) ?? []) {
          if (Number(n) < 1500) low.push(`${relative(process.cwd(), file)} : ${m[0].trim()}`);
        }
      }
    }
    expect(low).toEqual([]);
  });

  it("gpt-4o-transcribe ne sert que de repli à alma-transcribe", () => {
    const users = walk(ROOT).filter((file) =>
      readFileSync(file, "utf8").includes('"openai/gpt-4o-transcribe"'),
    );
    expect(users.map((f) => relative(ROOT, f))).toEqual(["alma-transcribe/index.ts"]);
  });
});
