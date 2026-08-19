import { describe, it, expect } from "vitest";
import { buildUserMenuEntries, type UserMenuItem } from "../userMenuModel";

const base = {
  profileTo: "/profile",
  publicTo: "/gardiens/u1",
  isSitterView: false,
  isAdmin: false,
};

const itemsOf = (opts: typeof base) =>
  buildUserMenuEntries(opts).filter((e): e is UserMenuItem => e !== "separator");

describe("menu déroulant de l'avatar", () => {
  it("suit l'ordre décidé : identité, puis réglages, puis déconnexion", () => {
    const labels = itemsOf(base).map((e) => e.label);
    expect(labels).toEqual([
      "Mon profil",
      "Mon profil public",
      "Mes favoris",
      "Mes avis",
      "Je suis un professionnel",
      "Paramètres",
      "Aide & contact",
      "Déconnexion",
    ]);
  });

  it("n'affiche Mon abonnement que pour le rôle gardien, avant Paramètres", () => {
    const sitter = itemsOf({ ...base, isSitterView: true }).map((e) => e.label);
    expect(sitter).toContain("Mon abonnement");
    expect(sitter.indexOf("Mon abonnement")).toBeLessThan(sitter.indexOf("Paramètres"));
    expect(itemsOf(base).some((e) => e.label === "Mon abonnement")).toBe(false);
  });

  it("n'affiche Espace admin qu'aux administrateurs, après Aide & contact", () => {
    const admin = itemsOf({ ...base, isAdmin: true }).map((e) => e.label);
    expect(admin).toContain("Espace admin");
    expect(admin.indexOf("Espace admin")).toBeGreaterThan(admin.indexOf("Aide & contact"));
    expect(itemsOf(base).some((e) => e.label === "Espace admin")).toBe(false);
  });

  it("termine toujours par un séparateur puis Déconnexion en action destructive", () => {
    const entries = buildUserMenuEntries(base);
    expect(entries[entries.length - 2]).toBe("separator");
    const last = entries[entries.length - 1];
    expect(last).not.toBe("separator");
    expect((last as UserMenuItem).action).toBe("logout");
    expect((last as UserMenuItem).danger).toBe(true);
  });

  it("ne porte jamais de pastille de notification", () => {
    for (const opts of [
      base,
      { ...base, isSitterView: true, isAdmin: true },
    ]) {
      for (const item of itemsOf(opts)) {
        expect(item).not.toHaveProperty("badge");
      }
    }
  });

  it("n'emploie jamais deux fois la même icône dans la liste", () => {
    const icons = itemsOf({ ...base, isSitterView: true, isAdmin: true }).map((e) => e.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
