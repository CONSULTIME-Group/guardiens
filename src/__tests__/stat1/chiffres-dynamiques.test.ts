import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { KNOWN_PLACEHOLDERS, interpolatePlaceholders, findUnknownPlaceholders } from "@/lib/contentPlaceholders";

const STAT1_KEYS = [
  ["avis_publies", "Avis publiés"],
  ["note_moyenne_avis", "Note moyenne des avis"],
  ["gardes_terminees", "Gardes terminées"],
  ["accords_acceptes", "Accords de garde acceptés"],
  ["gardes_avec_accord", "Gardes avec accord de garde"],
] as const;

describe("STAT1, chiffres dynamiques d'avis, de gardes et d'accords", () => {
  it("les cinq clés sont connues, globales et libellées en français", () => {
    for (const [key, label] of STAT1_KEYS) {
      const def = KNOWN_PLACEHOLDERS.find((p) => p.key === key);
      expect(def, key).toBeDefined();
      expect(def?.scope).toBe("global");
      expect(def?.label).toBe(label);
    }
    expect(findUnknownPlaceholders(STAT1_KEYS.map(([k]) => `{{${k}}} {{stats.${k}}}`).join(" "))).toEqual([]);
  });

  it("interpole les valeurs lues en production le 16/11/2026", () => {
    const out = interpolatePlaceholders(
      "{{avis_publies}} avis, note moyenne {{note_moyenne_avis}} sur 5, {{gardes_terminees}} gardes terminées, {{accords_acceptes}} accords sur {{stats.gardes_avec_accord}} gardes.",
      { avis_publies: 8, note_moyenne_avis: 5.0, gardes_terminees: 7, accords_acceptes: 13, gardes_avec_accord: 9 }
    );
    expect(out).toBe("8 avis, note moyenne 5 sur 5, 7 gardes terminées, 13 accords sur 9 gardes.");
  });

  it("rend la note moyenne au format français (numeric jsonb lu en nombre)", () => {
    // jsonb rend round(avg, 1) en 4.8 ou 5.0 : JSON.parse en fait un number.
    const fromJson = JSON.parse('{"a": 4.8, "b": 5.0}') as Record<string, number>;
    expect(interpolatePlaceholders("{{note_moyenne_avis}}", { note_moyenne_avis: fromJson.a })).toBe("4,8");
    expect(interpolatePlaceholders("{{note_moyenne_avis}}", { note_moyenne_avis: fromJson.b })).toBe("5");
  });

  it("une note absente (aucun avis) est retirée sans accolades", () => {
    expect(interpolatePlaceholders("Note : {{note_moyenne_avis}}.", { note_moyenne_avis: null })).toBe("Note : .");
  });

  it("la migration 0175 porte le repère, les cinq clés et ne touche pas aux droits", () => {
    const sql = readFileSync("drizzle/migrations/0175_stat1_chiffres_dynamiques.sql", "utf8");
    expect(sql).toContain("Repère : stat1_chiffres_dynamiques.");
    for (const [key] of STAT1_KEYS) expect(sql).toContain(`'${key}', (SELECT`);
    expect(sql).toContain("STABLE SECURITY DEFINER");
    expect(sql).toContain("SET search_path TO 'public'");
    expect(sql).toMatch(/review_type IS DISTINCT FROM 'cancellation'/);
    expect(sql).not.toMatch(/^\s*(GRANT|REVOKE)\b/im);
    // Les clés d'origine restent toutes en place.
    for (const key of ["total_inscrits", "villes_couvertes", "ville_gardiens_total", "departement_annonces_actives"]) {
      expect(sql).toContain(`'${key}'`);
    }
  });

  it("la migration a son contrat de production", () => {
    const manifest = JSON.parse(readFileSync("scripts/db/production-contracts.json", "utf8")) as {
      contracts: { migration: string; checks: { name: string; sql: string }[] }[];
    };
    const c = manifest.contracts.find((x) => x.migration === "0175_stat1_chiffres_dynamiques.sql");
    expect(c).toBeDefined();
    expect(c?.checks.map((k) => k.name)).toEqual(["repere", "cinq_cles", "droits_conserves"]);
  });
});
