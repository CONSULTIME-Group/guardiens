/**
 * Verrou d'invariant : le bloc « Bénévolat en association animalière » reste
 * hors du barème de complétion du profil.
 *
 * Le barème a déjà connu un incident de barèmes divergents. Ajouter ces champs
 * au score ferait chuter les profils existants du jour au lendemain : la
 * déclaration de bénévolat est une déclaration d'intérêt, elle se range à part.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  computeOwnerCompletion,
  computeSitterCompletion,
} from "@/lib/profileCompletion";
import {
  VOLUNTEER_CHECKBOX_LABEL,
  VOLUNTEER_WAITING_SENTENCE,
  VOLUNTEER_STRUCTURE_TYPES,
  VOLUNTEER_SKILLS,
  VOLUNTEER_FREQUENCIES,
} from "@/lib/volunteerAvailability";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf-8");

const baseSitter = { role: "sitter" as const, first_name: "Alma", postal_code: "75001" };
const baseOwner = { role: "owner" as const, first_name: "Alma", postal_code: "75001" };

const volunteerNoise = {
  available: true,
  structure_types: ["Refuge et fourrière"],
  skills: ["Transporter un animal"],
  departments: ["75"],
  frequency: "mensuel",
  current_association: "Une association",
};

describe("bénévolat en association, hors du barème de complétion", () => {
  it("les champs de bénévolat ne changent pas le score gardien", () => {
    const before = computeSitterCompletion(baseSitter).score;
    const after = computeSitterCompletion({ ...baseSitter, ...volunteerNoise } as any).score;
    expect(after).toBe(before);
  });

  it("les champs de bénévolat ne changent pas le score propriétaire", () => {
    const before = computeOwnerCompletion(baseOwner).score;
    const after = computeOwnerCompletion({ ...baseOwner, ...volunteerNoise } as any).score;
    expect(after).toBe(before);
  });

  it("le module de complétion ignore la table de bénévolat", () => {
    for (const f of [
      "src/lib/profileCompletion.ts",
      "src/hooks/useProfileCompletionMissing.ts",
      "supabase/functions/_shared/completion-steps/index.ts",
    ]) {
      const src = read(f);
      expect(src).not.toContain("volunteer_availability");
      expect(src).not.toContain("structure_types");
    }
  });

  it("le bloc est monté sur les deux profils", () => {
    for (const f of ["src/pages/SitterProfile.tsx", "src/pages/OwnerProfile.tsx"]) {
      expect(read(f)).toContain("<VolunteerAvailabilityBlock");
    }
  });

  it("la mesure est émise avec le rôle actif et les deux compteurs", () => {
    const src = read("src/components/profile/VolunteerAvailabilityBlock.tsx");
    expect(src).toContain("volunteer_availability_saved");
    expect(src).toContain("active_role");
    expect(src).toContain("structure_types_count");
    expect(src).toContain("skills_count");
  });
});

describe("bénévolat en association, libellés au mot près", () => {
  it("la case à cocher et la phrase d'attente sont exactes", () => {
    expect(VOLUNTEER_CHECKBOX_LABEL).toBe(
      "J'aimerais donner un coup de main à une association animalière près de chez moi",
    );
    expect(VOLUNTEER_WAITING_SENTENCE).toBe(
      "Nous vous préviendrons dès qu'une association de votre secteur cherche un coup de main.",
    );
  });

  it("les listes portent les options attendues", () => {
    expect(VOLUNTEER_STRUCTURE_TYPES).toHaveLength(5);
    expect(VOLUNTEER_STRUCTURE_TYPES[0]).toBe("Centre de soins et faune sauvage");
    expect(VOLUNTEER_SKILLS).toHaveLength(10);
    expect(VOLUNTEER_SKILLS[2]).toBe(
      "Donner un coup de main sur place, nourrissage et nettoyage",
    );
    expect(VOLUNTEER_FREQUENCIES.map((f) => f.label)).toEqual([
      "Ponctuellement",
      "Une fois par mois",
      "Une fois par semaine",
    ]);
  });

  it("aucun tiret cadratin ni demi-cadratin dans les libellés", () => {
    const all = [
      VOLUNTEER_CHECKBOX_LABEL,
      VOLUNTEER_WAITING_SENTENCE,
      ...VOLUNTEER_STRUCTURE_TYPES,
      ...VOLUNTEER_SKILLS,
      ...VOLUNTEER_FREQUENCIES.map((f) => f.label),
    ].join(" ");
    expect(/[\u2013\u2014]/.test(all)).toBe(false);
  });
});
