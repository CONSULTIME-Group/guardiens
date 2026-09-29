import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import CreateSitExpress, { type CreateSitExpressProps } from "@/components/sits/create/CreateSitExpress";
import {
  readExpressParams, isExpressActive, joinPetNames, proposeExpressTexts, mergeExpressTexts,
  NOEL_DATE_PRESETS, alreadyFilledPhrase,
} from "@/lib/sitExpress";
import { finishUrl } from "@/lib/ownerDeparture";
import { MIN_SUB_DESCRIPTION, MAX_TITLE_LENGTH } from "@/lib/sitPublishRules";

const DASH = /[\u2013\u2014]/;
const GENDER = /(chienne|chatte|votre chien|votre chat|\bil\b|\belle\b)/i;
const mila = { name: "Mila", species: "dog" };
const rex = { name: "Rex", species: "cat" };
const nala = { name: "Nala", species: "horse" };

describe("entrée express", () => {
  it("lit express et la période, repli plus_tard", () => {
    expect(readExpressParams(new URLSearchParams("express=1&periode=noel"))).toEqual({ express: true, period: "noel" });
    expect(readExpressParams(new URLSearchParams("express=1&periode=xx")).period).toBe("plus_tard");
    expect(readExpressParams(new URLSearchParams("")).express).toBe(false);
  });
  it("actif avec logement, inactif sans logement (écran de prérequis d'abord)", () => {
    expect(isExpressActive({ requested: true, hasProperty: true, showSetup: false, loading: false })).toBe(true);
    expect(isExpressActive({ requested: true, hasProperty: false, showSetup: false, loading: false })).toBe(false);
    expect(isExpressActive({ requested: true, hasProperty: true, showSetup: true, loading: false })).toBe(false);
  });
  it("parcours normal inchangé sans express", () => {
    expect(isExpressActive({ requested: false, hasProperty: true, showSetup: false, loading: false })).toBe(false);
  });
  it("liens Alma et C'est noté vers express, dates pour Noël", () => {
    expect(finishUrl("noel")).toBe("/sits/create?express=1&periode=noel&debut=2026-12-19&fin=2027-01-03");
    expect(finishUrl("hiver")).toBe("/sits/create?express=1&periode=hiver");
  });
});

describe("textes proposés", () => {
  const cases = [
    { pets: [mila], exp: "Mila reste à la maison avec ses habitudes. Nous cherchons une personne attentive, à l'aise avec les chiens." },
    { pets: [mila, rex], exp: "Mila et Rex restent à la maison avec leurs habitudes. Nous cherchons une personne attentive, à l'aise avec les chiens et les chats." },
    { pets: [mila, rex, nala], exp: "Mila, Rex et Nala restent à la maison avec leurs habitudes. Nous cherchons une personne attentive, à l'aise avec les animaux." },
    { pets: [], exp: "Nous cherchons une personne attentive pour prendre soin de la maison pendant notre absence." },
  ];
  for (const c of cases) {
    it(`${c.pets.length} animal(aux)`, () => {
      const t = proposeExpressTexts({ period: "noel", pets: c.pets, city: "Lyon" });
      expect(t.sitterExpectations).toBe(c.exp);
      expect(t.absenceReason).toBe("Nous partons pour les fêtes de fin d'année.");
      for (const v of Object.values(t)) {
        expect(v.length).toBeGreaterThanOrEqual(MIN_SUB_DESCRIPTION);
        expect(v).not.toMatch(DASH);
        expect(v).not.toMatch(GENDER);
      }
      expect(t.title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    });
  }
  it("titres et raisons par période", () => {
    expect(proposeExpressTexts({ period: "noel", pets: [mila, rex], city: "Lyon" }).title).toBe("Garde de Mila et Rex pendant les fêtes, à Lyon");
    expect(proposeExpressTexts({ period: "ete", pets: [], city: "" }).title).toBe("Garde de la maison cet été");
    expect(proposeExpressTexts({ period: "hiver", pets: [], city: null }).absenceReason).toBe("Nous partons cet hiver.");
    expect(proposeExpressTexts({ period: "printemps", pets: [], city: null }).absenceReason).toBe("Nous partons au printemps.");
    expect(proposeExpressTexts({ period: "plus_tard", pets: [], city: null }).absenceReason).toBe("Nous partons quelques jours.");
  });
  it("noms seuls, jamais de genre", () => {
    expect(joinPetNames([mila])).toBe("Mila");
    expect(joinPetNames([mila, rex])).toBe("Mila et Rex");
    expect(alreadyFilledPhrase({ propertyType: "house", pets: [mila], city: "Lyon" }))
      .toBe("On a repris votre maison, Mila et votre commune. Ajoutez une photo, choisissez vos dates, relisez le texte.");
  });
  it("reprise d'un brouillon : ce qui est écrit reste", () => {
    const proposed = proposeExpressTexts({ period: "noel", pets: [mila], city: "Lyon" });
    const m = mergeExpressTexts({ title: "Mon titre", absenceReason: "Nous rendons visite à la famille.", sitterExpectations: "" }, proposed, MIN_SUB_DESCRIPTION);
    expect(m.title).toBe("Mon titre");
    expect(m.absenceReason).toBe("Nous rendons visite à la famille.");
    expect(m.sitterExpectations).toBe(proposed.sitterExpectations);
  });
});

const props = (o: Partial<CreateSitExpressProps> = {}): CreateSitExpressProps => ({
  period: "noel", readinessPercent: 60, propertyType: "house", city: "Lyon", postalCode: "69001",
  pets: [mila], photoUrl: null, uploading: false, onPhotoFile: vi.fn(),
  startDate: NOEL_DATE_PRESETS[0].start, endDate: NOEL_DATE_PRESETS[0].end, onDates: vi.fn(), dateError: null,
  flexibleDates: false, onFlexibleDates: vi.fn(), title: "t", onTitle: vi.fn(), absenceReason: "a", onAbsenceReason: vi.fn(),
  sitterExpectations: "s", onSitterExpectations: vi.fn(), blocking: [], publishing: false, onPublish: vi.fn(), onBack: vi.fn(), ...o,
});

describe("écran express", () => {
  it("photo absente puis ajoutée", () => {
    const onPhotoFile = vi.fn();
    const { rerender } = render(<CreateSitExpress {...props({ onPhotoFile })} />);
    expect(screen.getByTestId("express-photo-empty")).toBeTruthy();
    const input = screen.getByLabelText("Prendre une photo") as HTMLInputElement;
    expect(input.getAttribute("capture")).toBe("environment");
    fireEvent.change(input, { target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] } });
    expect(onPhotoFile).toHaveBeenCalled();
    rerender(<CreateSitExpress {...props({ photoUrl: "https://x/p.jpg" })} />);
    expect(screen.getByTestId("express-photo-done")).toBeTruthy();
  });
  it("raccourcis Noël : premier présélectionné, choix d'un autre, Autres dates", () => {
    const onDates = vi.fn();
    render(<CreateSitExpress {...props({ onDates })} />);
    expect(screen.getByText("19 déc. au 3 janv.").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByText("20 au 27 déc."));
    expect(onDates).toHaveBeenCalledWith("2026-12-20", "2026-12-27", "preset");
    fireEvent.click(screen.getByText("Autres dates"));
    expect(screen.getByTestId("express-date-inputs")).toBeTruthy();
  });
  it("autres périodes : sélecteurs directement", () => {
    render(<CreateSitExpress {...props({ period: "ete", startDate: "", endDate: "" })} />);
    expect(screen.queryByTestId("express-date-presets")).toBeNull();
    expect(screen.getByTestId("express-date-inputs")).toBeTruthy();
  });
  it("bouton désactivé tant qu'un bloquant reste, liste affichée", () => {
    const { rerender } = render(<CreateSitExpress {...props({ blocking: [{ id: "photo", label: "Au moins une photo" } as any] })} />);
    const btn = screen.getByText("Publier mon annonce").closest("button")!;
    expect(btn.disabled).toBe(true);
    expect(screen.getByTestId("express-blockers").textContent).toContain("Une photo de chez vous");
    rerender(<CreateSitExpress {...props()} />);
    expect(screen.getByText("Publier mon annonce").closest("button")!.disabled).toBe(false);
  });
  it("textes fixes, aucun tiret long", () => {
    render(<CreateSitExpress {...props()} />);
    for (const t of ["Votre annonce de Noël", "Prête à 60 %", "Deux gestes, et elle est en ligne.", "Écrit à partir de votre profil. Modifiez-le librement.", "Publier est gratuit. Les gardiens vous écrivent, et c'est vous qui choisissez."]) {
      expect(document.body.textContent).toContain(t);
    }
    expect(document.body.textContent).not.toMatch(DASH);
  });
});

import { validPresets, firstValidPreset, nextDay, joinFr } from "@/lib/sitExpress";
describe("Lot N7, parcours express", () => {
  it("raccourcis passés masqués, premier valable présélectionné", () => {
    expect(validPresets("2026-12-21").map((p) => p.key)).toEqual(["noel_second"]);
    expect(firstValidPreset("2026-10-01")?.key).toBe("noel_full");
    expect(validPresets("2027-01-01")).toEqual([]);
  });
  it("fin min = lendemain", () => { expect(nextDay("2026-12-31")).toBe("2027-01-01"); });
  it("énumération française", () => { expect(joinFr(["a", "b", "c"])).toBe("a, b et c"); });
  it("pluriel sur les animaux nommés", () => {
    const t = proposeExpressTexts({ period: "noel", pets: [{ name: "Mila", species: "cat" }, { name: "", species: "dog" }], city: null });
    expect(t.sitterExpectations.startsWith("Mila reste")).toBe(true);
  });
});
