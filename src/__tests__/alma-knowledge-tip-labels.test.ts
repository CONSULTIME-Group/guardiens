/**
 * Verrou N1 et N7 : les libellés français des conseils renvoyés par
 * `public.search_alma_knowledge` sont fixés dans la migration versionnée,
 * jamais la clé technique `fact_type`.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";

const latest = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .reverse()
  .map((f) => readFileSync(join(DIR, f), "utf8"))
  .find((sql) => sql.includes("FUNCTION public.search_alma_knowledge"));

describe("libellés des conseils dans la recherche d'Alma", () => {
  it("la migration la plus récente définit la fonction", () => {
    expect(latest).toBeTruthy();
  });

  it.each([
    ["home_care_tip", "Conseil maison"],
    ["pet_care_tip", "Conseil animal"],
    ["breed_did_you_know", "À savoir sur la race"],
    ["seasonal_advice", "Conseil de saison"],
    ["dog_behavior_tip", "Comportement du chien"],
    ["cat_behavior_tip", "Comportement du chat"],
    ["mutual_aid_tip", "Conseil entraide"],
  ])("%s donne %s", (key, label) => {
    expect(latest).toContain(`WHEN '${key}' THEN '${label}'`);
  });

  it("les anecdotes culturelles ne sont plus interrogées", () => {
    expect(latest).not.toContain("alma_cultural_facts");
  });
});
