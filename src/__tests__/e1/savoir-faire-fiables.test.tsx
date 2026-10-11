/**
 * Lot E1 (11/10/2026) : savoir-faire enregistrés sans erreur, visibilité
 * propriétaire réelle, adresse unique des savoir-faire.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) },
}));
vi.mock("@/components/profile/CompetenceAutocomplete", () => ({
  default: ({ onAdd }: { onAdd: (label: string) => void }) => (
    <button type="button" onClick={() => onAdd("Courses")}>ajouter</button>
  ),
}));

import OwnerStepSkills from "@/components/owner-profile/OwnerStepSkills";

describe("E1, propriétaire", () => {
  it("l'interrupteur commande la visibilité réelle dans l'entraide", () => {
    const onChange = vi.fn();
    render(<OwnerStepSkills competences={["Courses"]} competencesDisponible={false} skillCategories={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith({ owner_competences_disponible: true, available_for_help: true });
  });

  it("un premier savoir-faire rend disponible", () => {
    const onChange = vi.fn();
    render(<OwnerStepSkills competences={[]} competencesDisponible={false} skillCategories={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "ajouter" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ owner_competences: ["Courses"], available_for_help: true }));
  });
});

describe("E1, adresse unique des savoir-faire", () => {
  it("les deux pages de profil acceptent ?section=savoir-faire", () => {
    expect(readFileSync("src/pages/SitterProfile.tsx", "utf8")).toMatch(/"savoir-faire": "skills"/);
    expect(readFileSync("src/pages/OwnerProfile.tsx", "utf8")).toMatch(/"savoir-faire": "skills"/);
  });
  it("la page Entraide et la bannière y renvoient", () => {
    expect(readFileSync("src/pages/EntraideHub.tsx", "utf8")).toContain("/profile?section=savoir-faire");
    expect(readFileSync("src/components/profile/FillSavoirFaireBanner.tsx", "utf8")).toContain("/profile?section=savoir-faire");
  });
  it("la bannière lit les vrais savoir-faire", () => {
    const src = readFileSync("src/components/profile/FillSavoirFaireBanner.tsx", "utf8");
    expect(src).toContain("fetchMySitterProfile");
    expect(src).not.toContain("data.custom_skills");
  });
});
