/**
 * Garde-fou tri-état des dix questions oui/non de la fiche gardien.
 *
 * Doctrine : null = jamais répondu. Un false ne peut exister que si la
 * personne a explicitement choisi « Non ». Un Switch présélectionné écrit un
 * « non » implicite dès la première sauvegarde : interdit pour ces champs.
 * Ce test échoue si une coercion `|| false`, un défaut `false` ou un Switch
 * réapparaît sur l'un des dix champs.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const HOOK = readFileSync("src/hooks/useSitterProfile.ts", "utf8");

const TRISTATE_FIELDS = [
  "has_vehicle",
  "has_license",
  "smoker",
  "farm_animals_ok",
  "demanding_breeds_ok",
  "strict_rules_ok",
  "indoor_cats_only",
  "prefer_visitors",
  "travels_with_children",
  "travels_with_own_animals",
] as const;

describe("booléens gardien tri-état", () => {
  it("aucune coercion `|| false` au chargement du profil", () => {
    for (const f of TRISTATE_FIELDS) {
      const coercion = new RegExp(`${f}[^\\n]*\\|\\|\\s*false`);
      expect(coercion.test(HOOK), `${f} est encore coercé en false au chargement`).toBe(false);
    }
  });

  it("aucun défaut `: false` dans defaultData", () => {
    for (const f of TRISTATE_FIELDS) {
      expect(HOOK.includes(`${f}: false`), `${f} a encore un défaut false`).toBe(false);
    }
  });

  it("le typage du hook accepte null pour chaque champ", () => {
    for (const f of TRISTATE_FIELDS) {
      expect(HOOK, `${f} doit être typé boolean | null`).toContain(`${f}: boolean | null`);
    }
  });

  it("chaque formulaire pose la question via YesNoChips, jamais via un Switch", () => {
    const steps: Record<string, readonly string[]> = {
      "src/components/profile/StepMobility.tsx": ["has_license", "has_vehicle"],
      "src/components/profile/StepPreferences.tsx": ["strict_rules_ok", "prefer_visitors", "farm_animals_ok"],
      "src/components/profile/StepSitterProfile.tsx": ["smoker"],
      "src/components/profile/StepExperience.tsx": [
        "demanding_breeds_ok",
        "indoor_cats_only",
        "travels_with_own_animals",
        "travels_with_children",
      ],
    };
    for (const [file, fields] of Object.entries(steps)) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} doit utiliser YesNoChips`).toContain("YesNoChips");
      for (const f of fields) {
        const bound = new RegExp(`(checked|onCheckedChange)=[^\\n]*${f}`);
        const usesSwitchForField =
          bound.test(src) && new RegExp(`Switch[\\s\\S]{0,300}${f}|${f}[\\s\\S]{0,300}/>`).test(src);
        expect(
          usesSwitchForField && src.includes(`Switch`),
          `${file} utilise encore un Switch pour ${f}`,
        ).toBe(false);
      }
    }
  });
});
