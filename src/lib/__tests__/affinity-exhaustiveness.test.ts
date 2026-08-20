import { describe, it, expect } from "vitest";
import {
  IDEAL_SITTER_PROFILE_OPTIONS,
  IDEAL_SITTER_SCORED_OPTIONS,
  IDEAL_SITTER_DESCRIPTIVE_OPTIONS,
  SITTER_TYPE_OPTIONS,
  HOME_AMBIANCE_OPTIONS,
  HOME_AMBIANCE_SCORED_OPTIONS,
  HOME_AMBIANCE_ENVIRONMENT_OPTIONS,
} from "@/lib/profileMatchingOptions";
import {
  HOME_AMBIANCE_SCORED_TAGS,
  HOME_AMBIANCE_DISPLAY_ONLY,
  HOME_AMBIANCE_ALIASES,
  PREF_SITTER_DESCRIPTIVE,
  PREF_SITTER_NO_PREFERENCE,
  PREF_SITTER_EXP_EXPERIENCED,
  PREF_SITTER_EXP_BEGINNER,
  PREF_SITTER_WORK_REMOTE,
  normalizeFreeText,
  canonicalAmbianceTag,
} from "@/lib/affinityVocab";

/**
 * Test d'exhaustivité, RÈGLE DES DEUX CÔTÉS (décision du 20/08/2026).
 *
 * Dans les deux sens : il échoue si une valeur présente en base dans
 * `preferred_sitter_types` ou `home_ambiance` n'est NI scorable par un
 * chemin identifié du moteur, NI déclarée explicitement descriptive.
 * Aucune valeur ne doit pouvoir tomber en silence. C'est ce test qui
 * aurait attrapé les défauts « Sans préférence », alias d'ambiance et
 * préférences sans chemin (« Gardien·ne expérimenté·e »…).
 *
 * Les listes DB_* ci-dessous sont les valeurs effectivement persistées,
 * mesurées en production le 20/08/2026. Toute nouvelle valeur insérée en
 * base doit être ajoutée ici ET classifiée.
 */

// Valeurs observées en base le 20/08/2026 (audit production).
const DB_PREFERRED_SITTER_TYPES = [
  "Sans préférence",
  "no_preference",
  "Retraité·e",
  "Retraité",
  "Couple",
  "Famille",
  "Actif·ve solo",
  "Actif solo",
  "Gardien·ne expérimenté·e",
  "Télétravailleur·euse",
  "Débutant·e motivé·e",
  "Étudiant·e",
  "Indépendant·e",
];

const DB_HOME_AMBIANCE = [
  "Calme et posé",
  "Campagne",
  "Cocon casanier",
  "Urbain",
  "Sportif outdoor",
  "Montagne",
  "Bord de mer",
  "Maison de vacances",
  "Famille animée",
  "Invités fréquents",
  "Cosy",
  "Calme",
  "Familial",
];

const WIRED_PATHS = [
  PREF_SITTER_EXP_EXPERIENCED,
  PREF_SITTER_EXP_BEGINNER,
  PREF_SITTER_WORK_REMOTE,
].map((v) => normalizeFreeText(v));

type PrefClass = "no_preference" | "descriptive" | "wired" | "sitter_type";

/**
 * Classification d'une préférence propriétaire, miroir des chemins
 * d'evalIdealProfile : sortie explicite, descriptif déclaré, chemin câblé
 * (expérience / télétravail), ou correspondance souple avec sitter_type.
 */
function classifyPreference(value: string): PrefClass | null {
  const n = normalizeFreeText(value);
  if (PREF_SITTER_NO_PREFERENCE.has(n)) return "no_preference";
  if (PREF_SITTER_DESCRIPTIVE.some((d) => normalizeFreeText(d) === n)) return "descriptive";
  if (WIRED_PATHS.includes(n)) return "wired";
  const soft = SITTER_TYPE_OPTIONS.some((t) => {
    const nt = normalizeFreeText(t);
    return nt === n || nt.includes(n) || n.includes(nt);
  });
  return soft ? "sitter_type" : null;
}

type AmbianceClass = "scored" | "display_only";

/** Classification d'un tag d'ambiance, alias résolus comme dans le moteur. */
function classifyAmbiance(value: string): AmbianceClass | null {
  const canon = canonicalAmbianceTag(value);
  if ((HOME_AMBIANCE_SCORED_TAGS as readonly string[]).includes(canon)) return "scored";
  if ((HOME_AMBIANCE_DISPLAY_ONLY as readonly string[]).includes(canon)) return "display_only";
  return null;
}

describe("exhaustivité preferred_sitter_types (règle des deux côtés)", () => {
  it("chaque option du formulaire est scorable ou déclarée descriptive", () => {
    for (const opt of IDEAL_SITTER_PROFILE_OPTIONS) {
      expect(
        classifyPreference(opt),
        `"${opt}" n'est ni scorable par un chemin identifié, ni déclarée descriptive`,
      ).not.toBeNull();
    }
  });

  it("chaque valeur présente en base est scorable ou déclarée descriptive", () => {
    for (const value of DB_PREFERRED_SITTER_TYPES) {
      expect(
        classifyPreference(value),
        `valeur en base "${value}" tombée en silence : ni scorable, ni descriptive`,
      ).not.toBeNull();
    }
  });

  it("les options descriptives du formulaire correspondent exactement au registre du moteur", () => {
    expect([...IDEAL_SITTER_DESCRIPTIVE_OPTIONS].sort()).toEqual(
      [...PREF_SITTER_DESCRIPTIVE].sort(),
    );
  });

  it("« Sans préférence » et « no_preference » sont reconnus comme sortie du critère", () => {
    expect(classifyPreference("Sans préférence")).toBe("no_preference");
    expect(classifyPreference("no_preference")).toBe("no_preference");
  });

  it("les trois chemins câblés sont classifiés « wired »", () => {
    expect(classifyPreference("Gardien·ne expérimenté·e")).toBe("wired");
    expect(classifyPreference("Télétravailleur·euse")).toBe("wired");
    expect(classifyPreference("Débutant·e motivé·e")).toBe("wired");
  });

  it("« Étudiant·e » et « Indépendant·e » sont descriptives, jamais scorées", () => {
    expect(classifyPreference("Étudiant·e")).toBe("descriptive");
    expect(classifyPreference("Indépendant·e")).toBe("descriptive");
  });

  it("les options scorables du formulaire ne sont pas descriptives", () => {
    for (const opt of IDEAL_SITTER_SCORED_OPTIONS) {
      expect(classifyPreference(opt), `"${opt}" ne doit pas être descriptive`).not.toBe("descriptive");
    }
  });
});

describe("exhaustivité home_ambiance (règle des deux côtés)", () => {
  it("chaque option du formulaire est scorée ou déclarée descriptive", () => {
    for (const opt of HOME_AMBIANCE_OPTIONS) {
      expect(
        classifyAmbiance(opt),
        `"${opt}" n'est ni scorée, ni déclarée descriptive`,
      ).not.toBeNull();
    }
  });

  it("chaque valeur présente en base est scorée ou déclarée descriptive", () => {
    for (const value of DB_HOME_AMBIANCE) {
      expect(
        classifyAmbiance(value),
        `valeur en base "${value}" tombée en silence : ni scorée, ni descriptive`,
      ).not.toBeNull();
    }
  });

  it("le groupe scoré du formulaire correspond exactement au registre du moteur", () => {
    expect([...HOME_AMBIANCE_SCORED_OPTIONS].sort()).toEqual(
      [...HOME_AMBIANCE_SCORED_TAGS].sort(),
    );
  });

  it("le groupe environnement du formulaire correspond exactement au registre descriptif", () => {
    expect([...HOME_AMBIANCE_ENVIRONMENT_OPTIONS].sort()).toEqual(
      [...HOME_AMBIANCE_DISPLAY_ONLY].sort(),
    );
  });

  it("les deux groupes sont disjoints et leur union couvre toutes les options", () => {
    const scored = new Set(HOME_AMBIANCE_SCORED_OPTIONS);
    for (const env of HOME_AMBIANCE_ENVIRONMENT_OPTIONS) {
      expect(scored.has(env), `"${env}" ne peut pas être à la fois scoré et descriptif`).toBe(false);
    }
    expect(HOME_AMBIANCE_OPTIONS.length).toBe(
      HOME_AMBIANCE_SCORED_OPTIONS.length + HOME_AMBIANCE_ENVIRONMENT_OPTIONS.length,
    );
  });

  it("chaque alias orthographique retombe sur un tag scoré", () => {
    for (const [alias, canon] of Object.entries(HOME_AMBIANCE_ALIASES)) {
      expect(
        (HOME_AMBIANCE_SCORED_TAGS as readonly string[]).includes(canon),
        `alias "${alias}" → "${canon}" qui n'est pas un tag scoré`,
      ).toBe(true);
    }
    expect(canonicalAmbianceTag("Familial")).toBe("Famille animée");
    expect(canonicalAmbianceTag("Calme")).toBe("Calme et posé");
    expect(canonicalAmbianceTag("Cosy")).toBe("Cocon casanier");
  });
});
