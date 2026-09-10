/**
 * Verrous de l'admin Alma :
 *   - le sélecteur de surfaces du diagnostic couvre tout ce que produit
 *     `surfaceFromPath`,
 *   - le filtre des faits culturels se construit sur les types réellement
 *     présents, avec leur compte,
 *   - un whisper demandé par la personne laisse bien `action_taken`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ALMA_SURFACES,
  ALMA_NAV_SURFACES,
  surfaceFromPath,
} from "@/lib/alma/surfaces";
import { buildFactTypeOptions } from "@/pages/admin/AdminAlma";
import { buildHistoryInsert, buildHistoryPatch } from "@/lib/alma/whisper-history";

const PATHS = [
  "/dashboard",
  "/dashboard/annonces",
  "/sits",
  "/sits/",
  "/sits/abc-123",
  "/favoris",
  "/recherche-gardiens",
  "/gardiens/marie-42",
  "/petites-missions",
  "/",
  "/guides/lyon",
];

describe("surfaces Alma", () => {
  it("toute surface produite par surfaceFromPath est simulable côté admin", () => {
    for (const p of PATHS) {
      for (const role of ["owner", "sitter"] as const) {
        const s = surfaceFromPath(p, role);
        expect(ALMA_SURFACES as readonly string[]).toContain(s);
      }
    }
  });

  it("les surfaces de navigation déclarées sont toutes atteignables", () => {
    const produced = new Set<string>();
    for (const p of PATHS) {
      produced.add(surfaceFromPath(p, "owner"));
      produced.add(surfaceFromPath(p, "sitter"));
    }
    for (const s of ALMA_NAV_SURFACES) {
      expect(produced.has(s)).toBe(true);
    }
  });

  it("le dock ne redéfinit pas sa propre résolution de surface", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/ai/alma/AlmaDock.tsx"),
      "utf8",
    );
    expect(src).toContain('from "@/lib/alma/surfaces"');
    expect(src).not.toMatch(/function surfaceFromPath\s*\(/);
  });

  it("le diagnostic admin dérive de la source partagée", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/pages/admin/AdminAlma.tsx"),
      "utf8",
    );
    expect(src).toContain("const DIAG_SURFACES = ALMA_SURFACES");
  });
});

describe("filtre des faits culturels", () => {
  const facts = [
    ...Array(3).fill({ fact_type: "home_care_tip" }),
    ...Array(2).fill({ fact_type: "animal_humor" }),
    { fact_type: "type_inconnu_seede" },
  ];

  it("liste les types présents avec leur compte, sans liste en dur", () => {
    const options = buildFactTypeOptions(facts);
    expect(options[0]).toEqual({ value: "all", label: "Tous", count: 6 });
    expect(options.slice(1).map((o) => o.value)).toEqual([
      "home_care_tip",
      "animal_humor",
      "type_inconnu_seede",
    ]);
    expect(options.find((o) => o.value === "home_care_tip")?.count).toBe(3);
  });

  it("n'invente aucun type absent du corpus", () => {
    const options = buildFactTypeOptions(facts).map((o) => o.value);
    expect(options).not.toContain("social_stat");
    expect(options).not.toContain("breed_did_you_know");
  });

  it("garde le type technique comme libellé quand il n'est pas traduit", () => {
    const options = buildFactTypeOptions([{ fact_type: "type_inconnu_seede" }]);
    expect(options[1].label).toBe("type_inconnu_seede");
  });
});

describe("tracking action_taken", () => {
  it("un whisper demandé par la personne produit une ligne, et le clic la renseigne", () => {
    // Whisper on demand : le contexte crée sa ligne à l'affichage
    // (recordEmission), exactement comme pour un whisper proactif.
    const row = buildHistoryInsert({
      userId: "user-1",
      whisper: { type: "cultural_fact", surface: "sitter_profile", metadata: { on_demand: true } },
      sessionId: "sess-1",
    });
    expect(row).toEqual({
      user_id: "user-1",
      whisper_type: "cultural_fact",
      surface: "sitter_profile",
      session_id: "sess-1",
      metadata: { on_demand: true },
    });

    const patch = buildHistoryPatch("action_clicked", "open_sitter_profile");
    expect(patch.action_taken).toBe("open_sitter_profile");
    expect(patch.dismissed_reason).toBe("action_clicked");
  });

  it("le contexte journalise chaque whisper affiché, y compris à la demande", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/contexts/AlmaContext.tsx"),
      "utf8",
    );
    // requestNextTip couvre nudge, fait culturel et repli : trois emissions.
    const emissions = src.match(/void recordEmission\(/g) ?? [];
    expect(emissions.length).toBeGreaterThanOrEqual(4);
    // La clôture vise la ligne par son identifiant, pas par le type seul.
    expect(src).toContain('query.eq("id", rowId)');
  });
});
