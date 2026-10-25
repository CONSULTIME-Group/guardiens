/**
 * Lot E19 : détection d'une adresse postale (numéro et type de voie), source
 * unique dans supabase/functions/_shared/contact-details.ts, ré-exportée par
 * src/lib/contactDetails.ts.
 */
import { describe, expect, it } from "vitest";
import {
  contactDetailsMessage,
  detectContactDetails,
  detectPostalAddress,
  meetupWordContactMessage,
} from "@/lib/contactDetails";

describe("adresse postale détectée", () => {
  it.each([
    "Je suis au 12 rue des Lilas",
    "Rendez-vous 3 bis, avenue Foch",
    "chez moi, 45 boulevard de la Croix-Rousse",
    "7 chemin du Moulin, sonnez fort",
    "2 impasse des Acacias",
    "14 allée du Parc",
    "1 place Bellecour",
    "120 route de Lyon",
    "n°8 rue Victor Hugo",
    "12 RUE DES LILAS",
    "5 Allée des Érables",
  ])("« %s »", (text) => {
    expect(detectPostalAddress(text)).toBe(true);
    expect(detectContactDetails(text)).toContain("address");
  });
});

describe("textes ordinaires", () => {
  it.each([
    "Merci Hugo, un vrai plaisir, à bientôt !",
    "1 place de parking disponible devant la maison",
    "Il reste 2 places libres pour la soirée jeux",
    "à 5 minutes de la place du marché",
    "Rendez-vous à 10h place Bellecour",
    "Je garde 2 chats, quartier calme près de la rue principale",
    "Le potager fait 30 m2, au bout du chemin",
    "Nous avons fait 3 parties de belote",
    "Les 2 rues sont calmes",
  ])("« %s »", (text) => {
    expect(detectPostalAddress(text)).toBe(false);
    expect(detectContactDetails(text)).not.toContain("address");
  });

  it("ignore un texte vide", () => {
    expect(detectPostalAddress("")).toBe(false);
    expect(detectPostalAddress(null)).toBe(false);
  });
});

describe("téléphone et email, inchangés", () => {
  it("détecte toujours numéro et email", () => {
    expect(detectContactDetails("Appelez le 06 12 34 56 78")).toEqual(["phone"]);
    expect(detectContactDetails("odile arobase exemple point fr")).toEqual(["email"]);
  });
});

describe("messages", () => {
  it("nomme l'adresse postale", () => {
    expect(contactDetailsMessage(["address"])).toContain("une adresse postale");
    expect(meetupWordContactMessage(["phone", "address"]))
      .toBe("Votre mot contient un numéro de téléphone et une adresse postale. Retirez ces coordonnées : elles s'échangent dans la conversation.");
  });

  it("reste sans tiret long", () => {
    expect(meetupWordContactMessage(["email"])).not.toMatch(/[\u2013\u2014]/);
  });
});
