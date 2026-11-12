/**
 * Lot ENT1 (12/11/2026) : le formulaire « Publier une annonce » s'ouvre
 * toujours. Logement, commune et prénom se demandent dans l'étape 0, le
 * prénom est contrôlé au clic sur « Suivant », jamais pour enregistrer le
 * brouillon.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  entryMissing,
  step0EntryErrors,
  buildInlineHousingInsert,
  firstNameFromAccount,
  HOUSING_TYPE_CHOICES,
  HOUSING_NOTICE_TEXT,
  HOUSING_HELP_TEXT,
} from "@/lib/sitCreateEntry";
import { placeToWrite } from "@/components/sits/create/InlineProfilePlaceBlock";

const insertSpy = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: (row: unknown) => {
        insertSpy(row);
        return {
          select: () => ({
            single: () => new Promise((r) => setTimeout(() => r({
              data: { id: "p1", ...(row as object) }, error: null,
            }), 20)),
          }),
        };
      },
    }),
  },
}));

import InlineHousingTypeChoice from "@/components/sits/create/InlineHousingTypeChoice";

const read = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
const createSit = read("src/pages/CreateSit.tsx");

describe("entrée : plus aucun contrôle bloquant", () => {
  it("ni redirection vers l'arrivée, ni ouverture automatique de la mise en route", () => {
    expect(createSit).not.toContain("/arrivee/vous");
    expect(createSit).not.toContain("arrivalShouldResumeP1");
    expect(createSit).not.toContain("preflightBlocked");
  });
  it("les deux événements témoins ne sont plus émis", () => {
    expect(createSit).not.toContain('trackEvent("sits_create_preflight_blocked"');
    expect(createSit).not.toContain('trackEvent("arrival_p1_resumed_from_create"');
  });
  it("la mise en route ne s'ouvre que par un geste (entrée volontaire)", () => {
    const opens = createSit.match(/setSetupEntered\(true\)/g) ?? [];
    const voluntary = createSit.match(/setSetupVoluntary\(true\); setSetupEntered\(true\)/g) ?? [];
    expect(opens.length).toBe(voluntary.length);
    expect(opens.length).toBeGreaterThan(0);
  });
  it("l'état d'entrée est mesuré une fois par visite", () => {
    expect((createSit.match(/trackEvent\("sits_create_entry_state"/g) ?? []).length).toBe(1);
    expect(createSit).toContain("entryStateTrackedRef.current = true");
  });
});

describe("ce qui manque au profil", () => {
  it("compte sans logement, commune ni prénom : les trois manques, dans l'ordre", () => {
    expect(entryMissing({ hasProperty: false, ownerCity: "", firstName: " " })).toEqual(["property", "city", "first_name"]);
  });
  it("compte complet : rien", () => {
    expect(entryMissing({ hasProperty: true, ownerCity: "Lyon", firstName: "Anne" })).toEqual([]);
  });
  it("un prénom d'un seul caractère manque", () => {
    expect(entryMissing({ hasProperty: true, ownerCity: "Lyon", firstName: "A" })).toEqual(["first_name"]);
  });
});

describe("contrôle au clic sur « Suivant »", () => {
  const base = { hasProperty: true, ownerCity: "Lyon", sitCity: "", firstName: "Anne", firstNameAsked: false, firstNameValue: "" };
  it("compte complet : aucune erreur", () => {
    expect(step0EntryErrors(base)).toEqual([]);
  });
  it("logement, commune et prénom sont contrôlés, avec leur ancre", () => {
    const errors = step0EntryErrors({ hasProperty: false, ownerCity: "", sitCity: "", firstName: "", firstNameAsked: true, firstNameValue: " " });
    expect(errors).toEqual([
      { field: "property", anchor: "sit-housing-field" },
      { field: "city", anchor: "sit-city-field" },
      { field: "first_name", anchor: "sit-first-name-field" },
    ]);
  });
  it("le prénom saisi dans le champ suffit, avant même son écriture", () => {
    expect(step0EntryErrors({ ...base, firstName: "", firstNameAsked: true, firstNameValue: "Anne" })).toEqual([]);
  });
  it("une commune propre à l'annonce suffit", () => {
    expect(step0EntryErrors({ ...base, ownerCity: "", sitCity: "Bruxelles" })).toEqual([]);
  });
  it("le formulaire appelle ce contrôle à l'étape 0", () => {
    expect(createSit).toContain("const entryErrors = step0EntryErrors({");
  });
});

describe("le prénom ne conditionne jamais l'enregistrement du brouillon", () => {
  const saveDraft = createSit.slice(createSit.indexOf("const saveDraft = async"), createSit.indexOf("const hasPhoto ="));
  it("saveDraft ne lit ni le prénom ni la commune du profil pour décider", () => {
    expect(saveDraft.length).toBeGreaterThan(500);
    expect(saveDraft).not.toContain("profileFirstName");
    expect(saveDraft).not.toContain("inlineFirstName");
    expect(saveDraft).not.toContain("isFirstNameUsable");
    expect(saveDraft).not.toContain("step0EntryErrors");
  });
  it("les boutons « Enregistrer » restent actifs sans logement", () => {
    expect(createSit).not.toContain("disabled={savingDraft || !property}");
    expect((createSit.match(/onClick=\{handleSaveAndExit\}\s+disabled=\{savingDraft\}/g) ?? []).length).toBe(2);
  });
  it("sans logement, « Enregistrer » mène au bloc logement avec le message prévu", () => {
    const handler = createSit.slice(createSit.indexOf("const handleSaveAndExit = async"), createSit.indexOf("const saveDraft = async"));
    expect(handler).toContain('trackEvent("sits_create_save_needs_housing"');
    expect(handler).toContain('askHousing("save")');
    expect(HOUSING_NOTICE_TEXT.save).toBe("Indiquez votre type de logement pour enregistrer votre brouillon");
  });
  it("publier sans logement fait le même défilement, sans ouvrir la mise en route", () => {
    const publish = createSit.slice(createSit.indexOf("const handlePublish = async"), createSit.indexOf("const blocking = getBlockingBlockers"));
    expect(publish).toContain('askHousing("publish")');
    expect(publish).not.toContain("setSetupEntered");
  });
});

describe("logement créé avec le type seul", () => {
  beforeEach(() => insertSpy.mockClear());

  it("cinq choix, dans l'ordre de la spécification", () => {
    expect(HOUSING_TYPE_CHOICES.map((c) => c.label)).toEqual(["Maison", "Appartement", "Ferme", "Chalet", "Autre"]);
    expect(HOUSING_HELP_TEXT).toBe("Un seul choix suffit, vous complétez la description plus tard depuis votre profil.");
  });
  it("la ligne insérée porte le type, le reste à null", () => {
    expect(buildInlineHousingInsert("u1", "house")).toEqual({
      user_id: "u1", type: "house", environment: null, rooms_count: null, bedrooms_count: null,
    });
  });
  it("un double clic rapide crée une seule ligne", async () => {
    const onSaved = vi.fn();
    render(<InlineHousingTypeChoice userId="u1" onSaved={onSaved} />);
    const maison = screen.getByRole("button", { name: "Maison" });
    fireEvent.click(maison);
    fireEvent.click(maison);
    fireEvent.click(screen.getByRole("button", { name: "Chalet" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0][0]).toMatchObject({ type: "house", environment: null });
    expect(onSaved.mock.calls[0][0]).toMatchObject({ id: "p1", type: "house" });
  });
  it("le message s'affiche en alerte quand un clic renvoie au bloc", () => {
    render(<InlineHousingTypeChoice userId="u1" notice={HOUSING_NOTICE_TEXT.save} onSaved={() => {}} />);
    expect(screen.getByRole("alert").textContent).toBe("Indiquez votre type de logement pour enregistrer votre brouillon");
  });
  it("le formulaire enregistre le brouillon dès que le logement existe", () => {
    expect(createSit).toContain("saveAfterHousingRef.current = true");
    expect(createSit).toContain('trackEvent("sits_create_inline_housing_saved"');
  });
});

describe("commune écrite sur le profil", () => {
  it("France : commune, code postal, pays et département", () => {
    expect(placeToWrite({ city: "Lozanne", postalCode: "69380", country: "FR" })).toEqual({
      city: "Lozanne", postal_code: "69380", country: "FR", departement_code: "69",
    });
  });
  it("France sans code postal complet : rien n'est écrit", () => {
    expect(placeToWrite({ city: "Lozanne", postalCode: "6938", country: "FR" })).toBeNull();
  });
  it("étranger : commune et pays, le code postal du profil reste en place", () => {
    expect(placeToWrite({ city: "Bruxelles", postalCode: "", country: "BE" })).toEqual({ city: "Bruxelles", country: "BE" });
    expect(placeToWrite({ city: "Bruxelles", postalCode: "", country: null })).toBeNull();
  });
  it("le formulaire passe par le composant de l'écran P1", () => {
    expect(read("src/components/sits/create/InlineProfilePlaceBlock.tsx")).toContain('from "@/components/profile/PostalCodeCityFields"');
    expect(createSit).toContain("<InlineProfilePlaceBlock");
  });
});

describe("prénom proposé depuis le compte", () => {
  it("prénom Google, sinon premier mot du nom complet", () => {
    expect(firstNameFromAccount({ given_name: "Anne" })).toBe("Anne");
    expect(firstNameFromAccount({ full_name: "Anne Martin" })).toBe("Anne");
    expect(firstNameFromAccount(null)).toBe("");
  });
});

describe("compte complet : formulaire identique", () => {
  it("les trois champs sont conditionnés à un manque du profil", () => {
    expect(createSit).toContain("{!property && user && (\n            <InlineHousingTypeChoice");
    expect(createSit).toContain("{cityAsked && user && (");
    expect(createSit).toContain("{firstNameAsked && (");
  });
});

describe("périmètre : ce que le lot laisse intact", () => {
  it("la règle de publication partagée ne parle toujours pas du prénom", () => {
    expect(read("supabase/functions/_shared/sit-publish-rules.ts")).not.toContain("first_name");
  });
});
