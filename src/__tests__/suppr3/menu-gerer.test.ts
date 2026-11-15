/**
 * Lot SUPPR3 (15/11/2026) : Modifier, Dépublier et Supprimer se rangent dans
 * le menu de la carte de « Mes annonces », qui porte le mot « Gérer » et une
 * cible de 44 px (choix de Jérémie du 15/11 ; un menu d'icône seule n'avait pas
 * été trouvé, message de contact du 14/11).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ALMA_SITE_KNOWLEDGE } from "../../../supabase/functions/_shared/alma-site-knowledge";

const sits = readFileSync("src/pages/Sits.tsx", "utf8");
const menu = sits.slice(sits.indexOf("const ActionsMenu"), sits.indexOf("/* ── Guide section"));
const quick = sits.slice(sits.indexOf("const QuickActions"), sits.indexOf("const ActionsMenu"));

describe("SUPPR3 · menu Gérer de la carte", () => {
  it("le menu porte un mot et une cible de 44 px", () => {
    expect(menu).toContain('data-testid="sit-card-manage"');
    expect(menu).toMatch(/min-h-11[^"]*"[\s\S]{0,200}Gérer/);
  });

  it("Modifier, Dépublier et Supprimer sont dans le menu", () => {
    expect(menu).toContain("<Pencil className=\"h-4 w-4\" /> Modifier");
    expect(menu).toContain("to={`/sits/${sit.id}#depublier`}");
    expect(menu).toContain("<Trash2 className=\"h-4 w-4\" /> Supprimer");
  });

  it("la carte d'une annonce en ligne ne répète pas Modifier", () => {
    const published = quick.slice(quick.indexOf('effectiveStatus === "published" && isOwner'), quick.indexOf('effectiveStatus === "expired"'));
    expect(published).not.toContain("Modifier");
  });

  it("Alma nomme le bouton Gérer", () => {
    const e = ALMA_SITE_KNOWLEDGE.find((k) => k.key === "mes_annonces")!;
    expect(e.purpose).toContain("bouton « Gérer » (trois points)");
    expect(e.purpose).toContain("bloc « Gérer cette garde » en bas de la fiche");
  });
});

describe("SUPPR3 · place du menu", () => {
  it("le menu suit les actions de la carte, hors de la ligne du titre", () => {
    const card = sits.slice(sits.indexOf("const SitCard"), sits.indexOf("const QuickActions"));
    const quickAt = card.indexOf("<QuickActions");
    const menuAt = card.indexOf("<ActionsMenu");
    expect(menuAt).toBeGreaterThan(quickAt);
    expect(card.match(/<ActionsMenu/g)?.length).toBe(1);
  });
});
