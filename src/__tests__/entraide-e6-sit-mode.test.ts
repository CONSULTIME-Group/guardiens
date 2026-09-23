/**
 * Lot E6, partie 1 : question « Comment ça se passe ? ».
 * Le signal ouvre la question, la publication attend un choix, chaque choix
 * porte sa ligne d'affichage. Aucune négation, aucun tiret cadratin.
 */
import { describe, it, expect } from "vitest";
import {
  looksLikeMultiDaySit,
  SIT_REDIRECT_PRIMARY,
  SIT_REDIRECT_SECONDARY,
} from "@/lib/missionSitRedirect";
import {
  SIT_MODE_QUESTION_TITLE,
  SIT_MODE_OPTIONS,
  AT_HELPER_NOTE,
  SIT_MODE_PRIMARY,
  SIT_MODE_SECONDARY,
  sitModeLine,
  isMissionSitMode,
  type MissionSitMode,
} from "@/lib/missionSitMode";
import { sitModeEmailLine } from "../../supabase/functions/_shared/mission-wave.ts";

const ISO = (d: number) => new Date(Date.UTC(2026, 8, 20 + d, 10)).toISOString();

describe("E6 signal de garde de plusieurs jours", () => {
  it("détecte les cinq cas de garde de plusieurs jours", () => {
    const cases: Array<[string, string]> = [
      ["Garde de mon chien", "Il faut quelqu'un pour garder mon chien une semaine."],
      ["Passages pendant les vacances", "Venir nourrir et sortir le chien pendant les vacances d'été."],
      ["Garder le chat", "Garder le chat pendant mon absence de trois jours."],
      ["Vacances d'été", "Passer chaque jour pendant les vacances."],
      ["Gardiennage long", "Gardiennage de la maison et des animaux pendant 12 jours."],
    ];
    for (const [title, description] of cases) {
      expect(looksLikeMultiDaySit(title, description, null, null), title).toBe(true);
    }
  });

  it("laisse passer cinq besoins ponctuels", () => {
    const cases: Array<[string, string, string | null, string | null]> = [
      ["Nourrir les poules samedi", "Donner grain et eau aux poules samedi matin, autour de 9 h.", ISO(0), ISO(0)],
      ["Changer une ampoule", "Changer une ampoule trop haute dans l'entrée, quand vous passez.", null, null],
      ["Arroser un jardin", "Arroser le potager en mon absence, matin et soir.", ISO(0), ISO(1)],
      ["Courir avec le chien", "Emmener le chien courir samedi après-midi, une heure.", ISO(0), ISO(0)],
      ["Coup de main déménagement", "Porter des cartons samedi, deux heures à deux personnes.", ISO(0), ISO(0)],
    ];
    for (const [title, description, start, end] of cases) {
      expect(looksLikeMultiDaySit(title, description, start, end), title).toBe(false);
    }
  });

  it("seuil d'écart de dates strictement au-delà de deux jours", () => {
    expect(looksLikeMultiDaySit(null, null, ISO(0), ISO(2))).toBe(false);
    expect(looksLikeMultiDaySit(null, null, ISO(0), ISO(3))).toBe(true);
    expect(looksLikeMultiDaySit("Garde", "garder", ISO(0), ISO(3))).toBe(true);
  });

  it("affiche le bloc de garde avec les deux issues", () => {
    expect(SIT_REDIRECT_PRIMARY).toBe("Publier une annonce de garde");
    expect(SIT_REDIRECT_SECONDARY).toBe("Publier quand même un besoin");
    expect(SIT_REDIRECT_PRIMARY + SIT_REDIRECT_SECONDARY).not.toMatch(/[—–]/);
  });
});

describe("E6 question de déroulement", () => {
  it("propose exactement trois choix, sans construction négative", () => {
    expect(SIT_MODE_QUESTION_TITLE).toBe("Comment ça se passe ?");
    expect(SIT_MODE_OPTIONS.map((o) => o.value)).toEqual(["at_home", "visits", "at_helper"]);
    expect(SIT_MODE_OPTIONS.map((o) => o.label).join(" ")).not.toMatch(/\bne pas\b|\bne plus\b|jamais|aucun/);
    expect(SIT_MODE_OPTIONS.map((o) => o.label).join(" ")).not.toMatch(/[—–]/);
  });

  it("chaque choix mène au bon écran", () => {
    expect(SIT_MODE_PRIMARY).toBe("Publier une annonce de garde");
    expect(SIT_MODE_SECONDARY).toBe("Publier quand même un besoin");
    expect(AT_HELPER_NOTE).toBe(
      "Un coup de main entre gens du coin, en échange d'un service ou d'une attention.",
    );
i    expect(AT_HELPER_NOTE).not.toMatch(/voisin/i);
  });

  it("choix reconnu, valeurs hors enum rejetées", () => {
    for (const mode of ["at_home", "visits", "at_helper"] as MissionSitMode[]) {
      expect(isMissionSitMode(mode)).toBe(true);
    }
    expect(isMissionSitMode(null)).toBe(false);
    expect(isMissionSitMode("other")).toBe(false);
  });
});

describe("E6 ligne d'affichage du déroulement", () => {
  it("fiche et email portent les mêmes libellés", () => {
    expect(sitModeLine("at_home", "Claire")).toBe("Présence chez Claire pendant son absence");
    expect(sitModeLine("visits", "Claire")).toBe("Passages chez Claire");
    expect(sitModeLine("at_helper", "Claire")).toBe("L'animal vient chez vous");
    expect(sitModeEmailLine("at_home", "Claire")).toBe(sitModeLine("at_home", "Claire"));
    expect(sitModeEmailLine("visits", "Claire")).toBe(sitModeLine("visits", "Claire"));
    expect(sitModeEmailLine("at_helper", "Claire")).toBe(sitModeLine("at_helper", "Claire"));
  });

  it("reste lisible sans prénom", () => {
    expect(sitModeLine("at_home", null)).toBe("Présence chez vous pendant votre absence");
    expect(sitModeEmailLine("visits", undefined)).toBe("Passages chez vous");
  });

  it("aucun tiret cadratin ni demi-cadratin dans les libellés", () => {
    const all = [
      sitModeLine("at_home", "Claire"),
      sitModeLine("visits", "Claire"),
      sitModeLine("at_helper", "Claire"),
      SIT_MODE_QUESTION_TITLE,
      SIT_MODE_OPTIONS.map((o) => o.label).join(" "),
    ].join(" ");
    expect(all).not.toMatch(/[—–]/);
  });
});
