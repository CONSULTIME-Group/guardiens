import { describe, it, expect } from "vitest";
import { computeAffinityResultFull, WORK_RANK } from "@/lib/affinityScore";
import { WORK_DURING_SIT_OPTIONS } from "@/lib/profileMatchingOptions";
import {
  PRESENCE_REMOTE_OK,
  PRESENCE_SHORT_ABSENCES,
  WORK_ON_SITE,
  WORK_OUT_DAYTIME,
  WORK_FULL_REMOTE,
} from "@/lib/affinityVocab";

/**
 * Verrou du classement de présence (défaut grave remonté par Jérémie le
 * 23/08/2026). Le piège : « on_site » se lit en anglais comme « travaille
 * sur site » (absent), alors que son libellé français est « Sur place,
 * congés ou retraite », le profil le PLUS disponible de la plateforme
 * (191 gardiens mesurés, 2e groupe le plus nombreux). L'inversion lui
 * donnait 0/2 sur un critère de poids 2, SOUS un gardien qui part
 * travailler la journée.
 *
 * Ce test parcourt TOUTES les valeurs de WORK_DURING_SIT_OPTIONS et vérifie
 * que leur rang dans WORK_RANK est cohérent avec la disponibilité décrite
 * par leur LIBELLÉ, jamais avec leur nom de variable.
 */
describe("WORK_RANK : cohérence rang ↔ libellé (piège de nommage on_site)", () => {
  // Disponibilité déduite du LIBELLÉ français affiché au gardien, pas du
  // nom de variable. Deux valeurs au même niveau sont des présences
  // équivalentes (ex : télétravail complet et retraite, présent toute la
  // journée dans les deux cas).
  const AVAILABILITY_FROM_LABEL: Record<string, number> = {
    out_daytime: 0, // « Absences en journée (travail extérieur) » : le moins disponible
    partial_remote: 1, // « Télétravail partiel, quelques sorties » : absent par moments
    flexible: 2, // « Variable selon la garde » : s'organise autour de la garde
    full_remote: 3, // « Télétravail 100 %, présent toute la journée »
    on_site: 3, // « Sur place, congés ou retraite » : présent toute la journée
  };

  it("chaque valeur du formulaire a un rang déclaré (exhaustivité)", () => {
    for (const opt of WORK_DURING_SIT_OPTIONS) {
      expect(
        WORK_RANK[opt.value],
        `"${opt.value}" (${opt.label}) absent de WORK_RANK`,
      ).toBeDefined();
      expect(
        AVAILABILITY_FROM_LABEL[opt.value],
        `"${opt.value}" (${opt.label}) absent de la table de référence du test`,
      ).toBeDefined();
    }
  });

  it("l'ordre des rangs suit la disponibilité décrite par les libellés", () => {
    const values = WORK_DURING_SIT_OPTIONS.map((o) => o.value);
    for (const a of values) {
      for (const b of values) {
        const labelDiff = AVAILABILITY_FROM_LABEL[a] - AVAILABILITY_FROM_LABEL[b];
        const rankDiff = WORK_RANK[a] - WORK_RANK[b];
        expect(
          Math.sign(rankDiff),
          `incohérence : "${a}" et "${b}" classés dans le mauvais ordre`,
        ).toBe(Math.sign(labelDiff));
      }
    }
  });

  it("on_site (« Sur place, congés ou retraite ») est au niveau de full_remote", () => {
    expect(WORK_RANK[WORK_ON_SITE]).toBe(WORK_RANK[WORK_FULL_REMOTE]);
    expect(WORK_RANK[WORK_ON_SITE]).toBeGreaterThan(WORK_RANK[WORK_OUT_DAYTIME]);
  });

  it("chaque valeur produit un critère évalué pour les deux exigences (aucun silence)", () => {
    for (const opt of WORK_DURING_SIT_OPTIONS) {
      for (const need of [PRESENCE_REMOTE_OK, PRESENCE_SHORT_ABSENCES]) {
        const r = computeAffinityResultFull(
          { presence_expected: need },
          { work_during_sit: opt.value },
        );
        expect(
          r.total,
          `"${opt.value}" (${opt.label}) non évalué pour "${need}"`,
        ).toBe(1);
      }
    }
  });

  it("on_site obtient 2/2 dans les deux branches, avec une phrase de présence", () => {
    for (const need of [PRESENCE_REMOTE_OK, PRESENCE_SHORT_ABSENCES]) {
      const r = computeAffinityResultFull(
        { presence_expected: need },
        { work_during_sit: "on_site" },
      );
      // Critère seul de poids 2 : 2/2 = 100.
      expect(r.score).toBe(100);
      expect(r.matched).toContain("Sur place toute la journée, en congés ou à la retraite");
      expect(r.matched.some((m) => /absent/i.test(m))).toBe(false);
      expect(r.explanation.some((e) => /absent/i.test(e))).toBe(false);
    }
  });

  it("régression : out_daytime reste le profil le moins disponible", () => {
    const remoteOk = computeAffinityResultFull(
      { presence_expected: PRESENCE_REMOTE_OK },
      { work_during_sit: "out_daytime" },
    );
    expect(remoteOk.score).toBe(50); // 1/2, frein honnête
    expect(remoteOk.explanation).toContain("Absent en journée, présent matin et soir");
    const courtes = computeAffinityResultFull(
      { presence_expected: PRESENCE_SHORT_ABSENCES },
      { work_during_sit: "out_daytime" },
    );
    expect(courtes.score).toBe(50); // 1/2
  });

  it("un gardien sur place toute la journée ne score JAMAIS sous un gardien absent", () => {
    for (const need of [PRESENCE_REMOTE_OK, PRESENCE_SHORT_ABSENCES]) {
      const onSite = computeAffinityResultFull(
        { presence_expected: need },
        { work_during_sit: "on_site" },
      );
      const absent = computeAffinityResultFull(
        { presence_expected: need },
        { work_during_sit: "out_daytime" },
      );
      expect(onSite.score).toBeGreaterThan(absent.score);
    }
  });
});
