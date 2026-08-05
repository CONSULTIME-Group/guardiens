import { describe, it, expect } from "vitest";
import { detectContactDetails } from "@/lib/contactDetails";

describe("detectContactDetails, formats courants", () => {
  it.each([
    "Appelez moi au 06 12 34 56 78",
    "06.12.34.56.78",
    "+33 6 12 34 56 78",
    "0612345678",
  ])("bloque le téléphone %s", (text) => {
    expect(detectContactDetails(text)).toContain("phone");
  });

  it.each([
    "recette@example.com",
    "recette (at) example.com",
    "recette [at] example.com",
    "recette arobase example.com",
  ])("bloque l'email %s", (text) => {
    expect(detectContactDetails(text)).toContain("email");
  });
});

describe("detectContactDetails, contournements en toutes lettres", () => {
  it("bloque point écrit en toutes lettres", () => {
    expect(detectContactDetails("recette point test arobase example point com")).toContain("email");
  });

  it("bloque dot écrit en toutes lettres", () => {
    expect(detectContactDetails("recette at example dot com")).toContain("email");
  });

  it("bloque les chiffres écrits en lettres", () => {
    expect(detectContactDetails("zero six douze")).toEqual(expect.any(Array));
    expect(detectContactDetails("zero six un deux trois quatre cinq six sept huit")).toContain("phone");
  });

  it("bloque un mélange chiffres et lettres", () => {
    expect(detectContactDetails("zero six 12 34 56 78")).toContain("phone");
  });
});

describe("detectContactDetails, textes légitimes", () => {
  it.each([
    "",
    "Arroser mon potager pendant quinze jours",
    "Deux chats et un chien, rue des Lilas",
    "Disponible à partir du 6 septembre",
  ])("laisse passer %s", (text) => {
    expect(detectContactDetails(text)).toEqual([]);
  });
});
