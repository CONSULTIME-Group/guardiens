import { describe, it, expect } from "vitest";
import { cutLongText, meetingPreferenceLabel, homeFactLabel, assetsLabel, reviewDateLabel } from "@/lib/sitterProfileFacts";

describe("cutLongText", () => {
  it("laisse un texte court intact", () => {
    expect(cutLongText("Bonjour.")).toEqual({ text: "Bonjour.", truncated: false });
  });
  it("coupe au-delà de 360 caractères, sur un espace, avec points de suspension", () => {
    const t = "mot ".repeat(120);
    const r = cutLongText(t);
    expect(r.truncated).toBe(true);
    expect(r.text.endsWith("mot…")).toBe(true);
    expect(r.text.length).toBeLessThanOrEqual(321);
  });
});

describe("Avant la garde", () => {
  it("Krystina", () => {
    expect(meetingPreferenceLabel(["Visio avant", "S'adapte au propriétaire"])).toBe("En visio, ou à votre convenance");
  });
  it("trois valeurs et une inconnue", () => {
    expect(meetingPreferenceLabel(["Visite la veille", "Dîner/apéro avant", "Échange messagerie suffit", "Autre"]))
      .toBe("Une visite la veille, un dîner ou un apéro, ou par messages");
    expect(meetingPreferenceLabel([])).toBe("");
  });
});

describe("À la maison et Atouts", () => {
  it("animaux puis rythme", () => {
    expect(homeFactLabel(["Oui, chat"], "calme")).toBe("Un chat, un rythme calme");
    expect(homeFactLabel(["Oui \u2014 chien"], null)).toBe("Un chien");
    expect(homeFactLabel(["Oui, lapin"], "")).toBe("D'autres animaux");
    expect(homeFactLabel(["Non"], null)).toBe("");
  });
  it("atouts", () => {
    expect(assetsLabel([], true, true)).toBe("Permis et véhicule");
    expect(assetsLabel(["PSC1"], false, true)).toBe("PSC1, véhicule");
    expect(assetsLabel([], true, false)).toBe("");
  });
});

describe("date d'avis et bandeau entraide", () => {
  it("garde connue", () => {
    expect(reviewDateLabel("2026-08-20", "2026-08-31", "2026-09-01T10:00:00Z")).toBe("Garde du 20 au 31 août 2026");
    expect(reviewDateLabel(null, null, "2026-09-01T10:00:00Z")).toBe("septembre 2026");
  });
  it("courses et trajet en voiture", () => {
    expect(entraideBandText({ firstName: "Krystina", city: "Pont de Cheruy", helpsWith: null, competences: ["Courses pour personne âgée", "Transport"] }))
      .toEqual({ kind: "skills", text: "Krystina peut aussi donner un coup de main autour de Pont de Cheruy : des courses pour une personne âgée ou un trajet en voiture." });
    expect(entraideBandText({ firstName: "A", city: null, helpsWith: null, competences: [] })).toBeNull();
  });
});
