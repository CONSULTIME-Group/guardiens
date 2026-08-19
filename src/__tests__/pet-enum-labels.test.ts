import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  PET_ACTIVITY_LABELS,
  PET_WALK_LABELS,
  PET_ALONE_LABELS,
  PET_SPECIES_LABELS,
  PET_SPECIES_LABELS_LOWER,
  petActivityLabel,
  petWalkLabel,
  petAloneLabel,
  petSpeciesLabel,
  petSpeciesLabelLower,
} from "@/lib/petLabels";

/**
 * Garde-fou : aucune valeur brute d'enum animal (activity_level, walk_duration,
 * alone_duration, pet_species) ne doit être rendue à l'écran sans passer par
 * le module unique src/lib/petLabels.ts.
 *
 * Les listes ci-dessous reflètent les enums Postgres réels :
 *   activity_level : calm, moderate, sportive
 *   walk_duration  : none, 30min, 1h, 2h_plus
 *   alone_duration : never, 2h, 6h, all_day
 *   pet_species    : dog, cat, horse, bird, rodent, fish, reptile, farm_animal, nac
 * Si une valeur est ajoutée en base, elle doit être ajoutée à petLabels.ts :
 * sinon elle est masquée (repli null), jamais affichée en anglais.
 */

// Valeurs brutes qui ne doivent jamais apparaître telles quelles dans du JSX.
const RAW_ENUM_VALUES = [
  "calm", "moderate", "sportive",
  "none", "30min", "1h", "2h_plus",
  "never", "2h", "6h", "all_day",
  "dog", "cat", "horse", "bird", "rodent", "fish", "reptile", "farm_animal", "nac",
];

const SRC_ROOT = resolve(process.cwd(), "src");

const collectTsx = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      out.push(...collectTsx(full));
    } else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
};

const TSX_FILES = collectTsx(SRC_ROOT);

describe("petLabels — exhaustivité des mappings (enums Postgres)", () => {
  it("couvre toutes les valeurs de activity_level", () => {
    expect(Object.keys(PET_ACTIVITY_LABELS).sort()).toEqual(["calm", "moderate", "sportive"]);
  });

  it("couvre toutes les valeurs de walk_duration", () => {
    expect(Object.keys(PET_WALK_LABELS).sort()).toEqual(["1h", "2h_plus", "30min", "none"]);
  });

  it("couvre toutes les valeurs de alone_duration", () => {
    expect(Object.keys(PET_ALONE_LABELS).sort()).toEqual(["2h", "6h", "all_day", "never"]);
  });

  it("couvre toutes les valeurs de pet_species", () => {
    const expected = ["bird", "cat", "dog", "farm_animal", "fish", "horse", "nac", "reptile", "rodent"];
    expect(Object.keys(PET_SPECIES_LABELS).sort()).toEqual(expected);
    expect(Object.keys(PET_SPECIES_LABELS_LOWER).sort()).toEqual(expected);
  });

  it("tous les libellés sont en français lisible (aucune valeur brute recopiée)", () => {
    const all = [
      ...Object.entries(PET_ACTIVITY_LABELS),
      ...Object.entries(PET_WALK_LABELS),
      ...Object.entries(PET_ALONE_LABELS),
      ...Object.entries(PET_SPECIES_LABELS),
      ...Object.entries(PET_SPECIES_LABELS_LOWER),
    ];
    for (const [key, label] of all) {
      expect(label, `le libellé de « ${key} » recopie la valeur brute`).not.toBe(key);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe("petLabels — repli explicite sur valeur inconnue", () => {
  it("renvoie null plutôt que la valeur brute", () => {
    expect(petActivityLabel("very_active")).toBeNull();
    expect(petWalkLabel("sometimes")).toBeNull();
    expect(petAloneLabel("a_lot")).toBeNull();
    expect(petSpeciesLabel("dragon")).toBeNull();
    expect(petSpeciesLabelLower("dragon")).toBeNull();
  });

  it("renvoie null sur null/undefined/vide", () => {
    expect(petActivityLabel(null)).toBeNull();
    expect(petWalkLabel(undefined)).toBeNull();
    expect(petAloneLabel("")).toBeNull();
  });

  it("traduit les valeurs connues", () => {
    expect(petActivityLabel("moderate")).toBe("Modéré");
    expect(petWalkLabel("none")).toBe("Aucune balade");
    expect(petAloneLabel("never")).toBe("Jamais seul");
    expect(petSpeciesLabel("dog")).toBe("Chien");
    expect(petSpeciesLabelLower("farm_animal")).toBe("animal de ferme");
  });
});

describe("garde statique — aucun rendu direct d'enum animal dans le JSX", () => {
  it("aucun composant n'interpole une valeur d'enum animal brute dans du JSX", () => {
    const offenders: string[] = [];
    // Interpolation directe du champ dans du JSX : {pet.activity_level} etc.
    const directRender = /\{[^{}]*\b(?:pet|p|openPet|animal)\.(?:activity_level|walk_duration|alone_duration|species)\b[^{}]*\}/;
    for (const file of TSX_FILES) {
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");
      // StepExperience stocke des libellés français choisis dans une liste
      // (SPECIES_OPTIONS : « Chien », « Chat »...), pas des clés d'enum.
      if (file.endsWith("components/profile/StepExperience.tsx")) return;
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (!directRender.test(line)) return;
        // Autorisé : passage par un accesseur petLabels.
        if (/pet(?:Activity|Walk|Alone|Species)Label/.test(line)) return;
        // Autorisé : accès indexé à un mapping (couvert par le test d'exhaustivité)
        // ou à une map emoji (repli emoji, jamais la valeur brute).
        if (/\b[A-Za-z_]*(?:LABELS|LABEL|EMOJI|Emoji)\[[^\]]+\]/.test(line)) return;
        // Autorisé : construction d'objet de données (species: p.species), pas un rendu.
        if (/\bspecies:\s*(?:pet|p|openPet|animal)\.species\b/.test(line)) return;
        // Autorisé : comparaison technique (p.species === "dog").
        if (/\.species\s*={2,3}/.test(line)) return;
        // Autorisé : props techniques (species={pet.species}).
        if (/(?:^|\s)(?:species|value|key)=\{(?:pet|p|openPet|animal)\.species\}/.test(line)) return;
        // Autorisé : comptage indexé (speciesCount[p.species] = ...).
        if (/\[[^\]]*\.species\]\s*=[^=]/.test(line)) return;
        // Autorisé : clé technique de template (`${pet.species}-fallback`).
        if (/\$\{[^}]*\.species\}-[a-z]/.test(line)) return;
        offenders.push(`${file.replace(`${SRC_ROOT}/`, "")}:${i + 1} ${line.trim()}`);
      });
    }
    expect(offenders, "rendus bruts d'enums animaux détectés").toEqual([]);
  });

  it("aucun fallback « || pet.xxx » / « ?? pet.xxx » ne réaffiche la valeur brute", () => {
    const offenders: string[] = [];
    const rawFallback = /\|\|\s*(?:pet|p|openPet|animal)\.(?:activity_level|walk_duration|alone_duration|species)\b|\?\?\s*(?:pet|p|openPet|animal)\.(?:activity_level|walk_duration|alone_duration|species)\b/;
    for (const file of TSX_FILES) {
      const content = readFileSync(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (rawFallback.test(line)) {
          offenders.push(`${file.replace(`${SRC_ROOT}/`, "")}:${i + 1} ${line.trim()}`);
        }
      });
    }
    expect(offenders, "fallbacks vers la valeur brute détectés").toEqual([]);
  });

  it("les valeurs d'enum ne sont pas codées en dur comme libellé visible", () => {
    // Ex : <span>moderate</span> ou >never< dans du JSX.
    const offenders: string[] = [];
    const hardcoded = new RegExp(`>(?:${RAW_ENUM_VALUES.join("|")})<`);
    for (const file of TSX_FILES) {
      const content = readFileSync(file, "utf8");
      if (hardcoded.test(content)) {
        offenders.push(file.replace(`${SRC_ROOT}/`, ""));
      }
    }
    expect(offenders, "valeurs d'enum codées en dur dans le JSX").toEqual([]);
  });
});
