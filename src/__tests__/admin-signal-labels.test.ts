import { describe, expect, it } from "vitest";
import {
  SIGNAL_TYPE_LABELS,
  signalTypeLabel,
} from "@/components/admin/signals/signalGrouping";

describe("libellés des signaux admin", () => {
  it("connaît le type sit_published_zero_reach", () => {
    expect(SIGNAL_TYPE_LABELS.sit_published_zero_reach).toBe(
      "Annonce publiée sans aucun gardien touché",
    );
    expect(signalTypeLabel("sit_published_zero_reach")).toBe(
      "Annonce publiée sans aucun gardien touché",
    );
  });

  it("annonce explicitement un type inconnu, sans repli sur un autre libellé", () => {
    const label = signalTypeLabel("type_totalement_inconnu");
    expect(label).toBe("Signal inconnu : type_totalement_inconnu");
    expect(Object.values(SIGNAL_TYPE_LABELS)).not.toContain(label);
  });

  it("ne renvoie jamais une chaîne vide", () => {
    for (const type of [...Object.keys(SIGNAL_TYPE_LABELS), "autre_chose", ""]) {
      expect(signalTypeLabel(type).length).toBeGreaterThan(0);
    }
  });
});
