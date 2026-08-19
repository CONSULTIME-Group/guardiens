import { describe, it, expect } from "vitest";
import {
  buildNavGroups,
  flattenNavGroups,
  entryBadge,
  sheetBadge,
  messagesUnreadExclusive,
} from "../navModel";

describe("modèle de navigation de l'espace connecté", () => {
  it("porte exactement 3 groupes dans l'ordre Mon espace, Trouver, Apprendre", () => {
    const groups = buildNavGroups("sitter", false);
    expect(groups.map((g) => g.label)).toEqual(["Mon espace", "Trouver", "Apprendre"]);
  });

  it("porte exactement 10 entrées au total", () => {
    expect(flattenNavGroups(buildNavGroups("owner", false))).toHaveLength(10);
    expect(flattenNavGroups(buildNavGroups("sitter", false))).toHaveLength(10);
  });

  it("Mon espace : Accueil, annonces ou candidatures, Messages, Entraide", () => {
    const [espace] = buildNavGroups("owner", false);
    expect(espace.entries.map((e) => e.label)).toEqual([
      "Accueil",
      "Mes annonces",
      "Messages",
      "Entraide",
    ]);
    expect(espace.entries.map((e) => e.badgeKey)).toEqual([
      undefined,
      "sits",
      "messages",
      "entraide",
    ]);
  });

  it("la route /dashboard s'appelle Accueil, plus nulle part Dashboard", () => {
    for (const role of ["owner", "sitter"] as const) {
      const entries = flattenNavGroups(buildNavGroups(role, false));
      const home = entries.find((e) => e.to === "/dashboard");
      expect(home?.label).toBe("Accueil");
      expect(entries.some((e) => e.label === "Dashboard")).toBe(false);
    }
  });

  it("adapte annonces/candidatures et recherche au rôle actif", () => {
    const owner = flattenNavGroups(buildNavGroups("owner", false));
    const sitter = flattenNavGroups(buildNavGroups("sitter", false));
    expect(owner.find((e) => e.badgeKey === "sits")?.to).toBe("/sits");
    expect(sitter.find((e) => e.badgeKey === "sits")?.to).toBe("/mes-candidatures");
    expect(owner.find((e) => e.to === "/search")?.label).toBe("Recherche gardiens");
    expect(sitter.find((e) => e.to === "/search")?.label).toBe("Recherche");
  });

  it("place Guides locaux immédiatement après Fiches races", () => {
    const apprendre = buildNavGroups("sitter", false).find((g) => g.id === "apprendre");
    const labels = apprendre?.entries.map((e) => e.label) ?? [];
    expect(labels).toEqual(["Fiches races", "Guides locaux", "Conseils d'Alma", "Le journal"]);
  });

  it("conserve le tag Bêta sur Pros animaliers", () => {
    const trouver = buildNavGroups("owner", false).find((g) => g.id === "trouver");
    const pros = trouver?.entries.find((e) => e.to === "/pros");
    expect(pros?.beta).toBe(true);
  });

  it("verrouille la recherche pour un gardien sans accès premium", () => {
    const locked = flattenNavGroups(buildNavGroups("sitter", true));
    expect(locked.find((e) => e.to === "/search")?.premiumLock).toBe("la recherche d'annonces");
  });

  it("ne verrouille jamais la recherche pour un propriétaire ni pour un gardien avec accès", () => {
    const owner = flattenNavGroups(buildNavGroups("owner", true));
    const sitterOk = flattenNavGroups(buildNavGroups("sitter", false));
    expect(owner.every((e) => !e.premiumLock)).toBe(true);
    expect(sitterOk.every((e) => !e.premiumLock)).toBe(true);
  });

  it("n'emploie jamais deux fois la même icône dans la liste", () => {
    for (const role of ["owner", "sitter"] as const) {
      const icons = flattenNavGroups(buildNavGroups(role, false)).map((e) => e.icon);
      expect(new Set(icons).size).toBe(icons.length);
    }
  });
});

describe("pastilles de navigation", () => {
  it("entryBadge résout la pastille par clé, 0 sinon", () => {
    const badges = { sits: 4, messages: 2, entraide: 1 };
    const entries = flattenNavGroups(buildNavGroups("owner", false));
    expect(entryBadge(entries.find((e) => e.to === "/sits")!, badges)).toBe(4);
    expect(entryBadge(entries.find((e) => e.to === "/messages")!, badges)).toBe(2);
    expect(entryBadge(entries.find((e) => e.to === "/petites-missions")!, badges)).toBe(1);
    expect(entryBadge(entries.find((e) => e.to === "/races")!, badges)).toBe(0);
  });

  it("la pastille Plus vaut la somme exacte du contenu de la feuille, sans doublon", () => {
    // Régression : pour un gardien, la pastille additionnait sitterActionCount
    // et sitsBadge, deux noms pour la même valeur, et affichait le double.
    expect(sheetBadge({ sits: 3, messages: 2, entraide: 1 })).toBe(6);
    expect(sheetBadge({ sits: 3, messages: 0, entraide: 0 })).toBe(3);
    expect(sheetBadge({ sits: 0, messages: 0, entraide: 0 })).toBe(0);
  });

  it("Messages ne compte jamais ce que la pastille Entraide compte déjà", () => {
    // Régression : un non lu de petite mission incrémentait Messages ET
    // Entraide. Le même événement était compté deux fois à l'écran.
    expect(messagesUnreadExclusive(5, 2)).toBe(3);
    expect(messagesUnreadExclusive(2, 2)).toBe(0);
    expect(messagesUnreadExclusive(2, 5)).toBe(0);
    expect(messagesUnreadExclusive(0, 0)).toBe(0);
  });
});
