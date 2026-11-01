import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { expressedIntent } from "../../../supabase/functions/_shared/alma-truth";
import { ALMA_SITE_KNOWLEDGE } from "../../../supabase/functions/_shared/alma-site-knowledge";
import { HOVER_REVEAL } from "@/lib/hoverReveal";

const src = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf8");

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(), storage: { from: vi.fn() } } }));
vi.mock("@/components/pets/PetsEditor", () => ({ default: () => null }));
vi.mock("@/components/sits/create/InlineHousingBlock", () => ({ default: () => null }));
vi.mock("@/components/sits/create/InlineIdentityBlock", () => ({ default: () => null }));
vi.mock("@/components/sits/create/InlinePhotoUpload", () => ({ default: () => null }));

describe("MOB1 · actions des photos visibles au toucher", () => {
  it("révélées au survol seulement sur un écran à souris", () => {
    expect(HOVER_REVEAL).toMatch(/\[@media\(hover:hover\)\]:opacity-0/);
    expect(HOVER_REVEAL).toMatch(/\[@media\(hover:hover\)\]:group-hover:opacity-100/);
    expect(HOVER_REVEAL).toMatch(/group-focus-within:opacity-100/);
  });

  it.each([
    "src/components/owner-profile/OwnerGallery.tsx",
    "src/components/profile/SitterGallery.tsx",
    "src/components/missions/MissionPhotoUpload.tsx",
  ])("%s : plus aucune action cachée derrière le seul survol", (file) => {
    const code = src(file);
    expect(code).toMatch(/HOVER_REVEAL/);
    // Les actions (boutons) ne portent plus « opacity-0 group-hover:opacity-100 ».
    expect(code).not.toMatch(/flex gap-1 opacity-0 group-hover:opacity-100/);
    expect(code).not.toMatch(/justify-center opacity-0 group-hover:opacity-100/);
  });

  it("le bouton de retrait d'une photo d'entraide a un nom accessible", () => {
    expect(src("src/components/missions/MissionPhotoUpload.tsx")).toMatch(/aria-label="Retirer la photo"/);
  });
});

describe("NAV-V1 · Alma lit l'intention exprimée", () => {
  it.each([
    "Comment trouver un gardiennage comme j'en ai jamais fait",
    "Je souhaite garder des logements, pas le mien",
    "Je souhaite garder des logements et animaux",
    "Je veux faire du gardiennage",
    "je voudrais garder chez les autres",
  ])("intention gardien : « %s »", (q) => expect(expressedIntent(q)).toBe("sitter"));

  it.each([
    "je cherche un gardien pour mon chat",
    "Je cherche quelqu'un pour garder ma maison",
    "garder mes chats",
    "garde de mon chien en mon absence",
    "je cherche un gardiennage pour mon chien",
  ])("intention propriétaire : « %s »", (q) => expect(expressedIntent(q)).toBe("owner"));

  it("Alma sait où changer d'espace actif, sur téléphone et sur ordinateur", () => {
    const e = ALMA_SITE_KNOWLEDGE.find((x) => x.key === "mes_espaces")!;
    expect(e.purpose).toMatch(/menu Plus/);
    expect(e.purpose).toMatch(/menu de gauche/);
    expect(e.triggers).toContain("changer d'espace");
    expect(e.purpose).not.toMatch(/[—–]/);
  });

  it("une réponse de repli journalise son bouton et ses suggestions", () => {
    const code = src("supabase/functions/alma-chat/index.ts");
    expect(code).toMatch(/proposed_action: fallback && locked\?\.action \? locked\.action : null/);
  });
});

describe("NAV-V1 · mesure des changements d'espace", () => {
  it("chaque changement porte sa source", () => {
    expect(src("src/components/layout/Navigation.tsx")).toMatch(/"menu_plus"/);
    expect(src("src/components/layout/Navigation.tsx")).toMatch(/"menu_lateral"/);
    expect(src("src/components/settings/ActiveRolesSection.tsx")).toMatch(/"reglages"/);
    expect(src("src/components/routing/EspaceParamSwitch.tsx")).toMatch(/"lien"/);
  });

  it("l'événement part seulement quand l'espace change vraiment, par un import différé", () => {
    const code = src("src/contexts/AuthContext.tsx");
    expect(code).toMatch(/if \(from !== role\)/);
    expect(code).toMatch(/import\("@\/lib\/analytics"\)/);
    expect(code).toMatch(/"active_role_switched"/);
  });

  it("le texte de Mes espaces décrit le téléphone", () => {
    const code = src("src/components/settings/ActiveRolesSection.tsx");
    expect(code).toMatch(/menu Plus sur téléphone/);
    expect(code).not.toMatch(/barre latérale/);
  });
});

describe("PREF1 · mesure du formulaire d'annonce", () => {
  const code = src("src/pages/CreateSit.tsx");
  it("« étape terminée » seulement en avançant", () => {
    expect(code).toMatch(/if \(currentStepRef\.current <= step\) return;/);
  });
  it("choix du lieu et « Suivant » refusé sont mesurés", () => {
    expect(code).toMatch(/"sits_create_location_chosen"/);
    expect(code).toMatch(/"sits_create_next_blocked"/);
  });
});

describe("NAV-V1 · écran préalable, sortie vers les annonces de garde", () => {
  const base = {
    userId: "u", firstName: "Ana", postalCode: "69005", country: "FR", propertyId: null, petCount: 0,
    photos: [], photoDone: false, missingLabels: ["Votre logement"],
    onIdentitySaved: () => {}, onPropertySaved: () => {}, onPetsChanged: () => {}, onPhotoUploaded: () => {},
    onContinue: () => {}, onQuit: () => {}, onSitterExit: () => {},
  };

  it("compte gardien : la ligne s'affiche en haut", async () => {
    const { default: Step } = await import("@/components/sits/create/CreateSitSetupStep");
    render(<Step {...base} memberRole="sitter" />);
    expect(screen.getByTestId("setup-sitter-exit").textContent).toMatch(/Vous souhaitez garder chez les autres/);
    expect(screen.queryByTestId("setup-sitter-exit-link")).toBeNull();
  });

  it("compte double rôle : un lien discret sous les boutons", async () => {
    const { default: Step } = await import("@/components/sits/create/CreateSitSetupStep");
    render(<Step {...base} memberRole="both" />);
    expect(screen.getByTestId("setup-sitter-exit-link").textContent).toMatch(/Voir les annonces de garde/);
    expect(screen.queryByTestId("setup-sitter-exit")).toBeNull();
  });

  it("compte propriétaire : aucune sortie, le parcours reste centré sur l'annonce", async () => {
    const { default: Step } = await import("@/components/sits/create/CreateSitSetupStep");
    render(<Step {...base} memberRole="owner" />);
    expect(screen.queryByTestId("setup-sitter-exit")).toBeNull();
    expect(screen.queryByTestId("setup-sitter-exit-link")).toBeNull();
  });
});
