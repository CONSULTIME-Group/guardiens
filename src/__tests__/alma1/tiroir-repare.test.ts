import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  FACT_SURFACES,
  FACT_SURFACE_ALIASES,
  HUMOR_FACT_SURFACES,
  humorShownThisVisit,
  markHumorShown,
} from "@/lib/alma/factSurfaces";
import { factSeenPayload, firstDisplayOf, isHumorFact } from "@/lib/alma/factDisplay";

/**
 * Lot ALMA1 (arène « Alma vivante » du 10/11/2026, lot L1) : tiroir à faits
 * réparé, comptage à l'affichage réel, aperçu rendu sur /search et /annonces.
 */

const SQL = readFileSync("drizzle/migrations/0130_alma1_tiroir_repare.sql", "utf8");
const HOOK = readFileSync("src/hooks/useAlmaCulturalFact.ts", "utf8");
const DOCK = readFileSync("src/components/ai/alma/AlmaDock.tsx", "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "__tests__") continue;
      walk(path, out);
    } else if (/\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

describe("contrat des surfaces (site et fonction SQL)", () => {
  it("toute surface passée à useAlmaCulturalFact est déclarée", () => {
    const used = new Set<string>();
    for (const file of walk("src")) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/useAlmaCulturalFact\(\{\s*surface:\s*"([^"]+)"/g)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThanOrEqual(7);
    for (const s of used) expect(FACT_SURFACES as readonly string[]).toContain(s);
  });

  it("la fonction lit chaque surface avec son autre nom", () => {
    for (const [site, sql] of Object.entries(FACT_SURFACE_ALIASES)) {
      expect(SQL).toContain(`WHEN '${site}' THEN ARRAY['${site}', '${sql}']`);
      expect(SQL).toContain(`WHEN '${sql}' THEN ARRAY['${sql}', '${site}']`);
    }
  });

  it("l'humour vient sur les écrans de découverte, jamais sur la fiche d'une garde", () => {
    const humorBlock = SQL.slice(SQL.indexOf("v_humor_ok := "), SQL.indexOf("AND coalesce(p_context->>'humor_seen_this_visit'"));
    for (const s of HUMOR_FACT_SURFACES) expect(humorBlock).toContain(`'${s}'`);
    expect(humorBlock).not.toContain("'sit_detail'");
    expect(HUMOR_FACT_SURFACES).not.toContain("sit_detail");
    expect(SQL).toMatch(/WHEN 'animal_humor' THEN\s+v_humor_ok/);
  });

  it("rotation, relance une fois sur trois et repère de contrat", () => {
    expect(SQL).toContain("-- alma1_tiroir_repare");
    expect(SQL).toContain("FROM public.alma_whisper_history h");
    expect(SQL).toContain("interval '30 days'");
    expect(SQL).toContain("LIMIT 2");
    expect(SQL).toMatch(/\(v_nudge_recent AND f\.fact_type = 'usage_nudge'\) ASC,\s+\(f\.fact_type IS NOT DISTINCT FROM v_last_type\) ASC,\s+min\(f\.priority\) ASC/);
    const contracts = readFileSync("scripts/db/production-contracts.json", "utf8");
    expect(contracts).toContain("0130_alma1_tiroir_repare.sql");
    expect(contracts).toContain("alma1_tiroir_repare");
  });
});

describe("comptage à l'affichage réel", () => {
  it("le hook ne compte plus un fait à sa mise en file et transmet la blague de la visite", () => {
    expect(HOOK).not.toContain('trackEvent("alma_cultural_fact_seen"');
    expect(HOOK).toContain("humor_seen_this_visit: humorShownThisVisit()");
  });

  it("le dock compte l'aperçu et le fait quand ils sont rendus", () => {
    expect(DOCK).toContain('trackEvent("alma_cultural_fact_seen"');
    const arrival = DOCK.slice(DOCK.indexOf('} else if (arrival === "peek") {'), DOCK.indexOf('} else if (arrival === "peek") {') + 300);
    expect(arrival).not.toContain("trackEvent(\"alma_whisper_peek_shown\"");
    expect(DOCK).toContain("{peekVisible && whisper && (");
    expect(DOCK).not.toContain("!hideCollapsedPill && !compactDock && peekId && whisper");
  });

  it("factSeenPayload : fait, relance, autres murmures", () => {
    expect(
      factSeenPayload(
        { type: "cultural_fact", surface: "search", metadata: { fact_id: "f1", fact_type: "animal_humor" } },
        "peek",
      ),
    ).toEqual({ fact_id: "f1", fact_type: "animal_humor", surface: "search", display: "peek" });
    expect(
      factSeenPayload({ type: "usage_nudge", surface: "sit_detail", metadata: { fact_id: "n1" } }, "panel"),
    ).toEqual({ fact_id: "n1", fact_type: "usage_nudge", surface: "sit_detail", display: "panel" });
    expect(factSeenPayload({ type: "cultural_fact", surface: "search", metadata: {} }, "peek")).toBeNull();
    expect(factSeenPayload({ type: "sitter_popular_sit_context", surface: "x", metadata: { fact_id: "z" } } as unknown as Parameters<typeof factSeenPayload>[0], "peek")).toBeNull();
    expect(factSeenPayload(null, "peek")).toBeNull();
  });

  it("un murmure compte une fois", () => {
    const seen = new Set<string>();
    expect(firstDisplayOf(seen, "w1")).toBe(true);
    expect(firstDisplayOf(seen, "w1")).toBe(false);
    expect(firstDisplayOf(seen, "w2")).toBe(true);
    expect(firstDisplayOf(seen, null)).toBe(false);
  });
});

describe("une blague par visite", () => {
  beforeEach(() => sessionStorage.clear());

  it("la blague montrée ferme l'humour de la visite", () => {
    const payload = factSeenPayload(
      { type: "cultural_fact", surface: "sits_list", metadata: { fact_id: "f", fact_type: "animal_humor" } },
      "peek",
    );
    expect(isHumorFact(payload)).toBe(true);
    expect(humorShownThisVisit()).toBe(false);
    markHumorShown();
    expect(humorShownThisVisit()).toBe(true);
  });
});
