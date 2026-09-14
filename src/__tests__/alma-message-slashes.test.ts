/**
 * Une barre oblique au milieu d'un mot reste du texte.
 *
 * « et/ou », « 24h/24 » et les dates étaient pris pour des adresses : les mots
 * disparaissaient de la phrase et une carte cliquable menant nulle part
 * apparaissait.
 */
import { describe, it, expect } from "vitest";
import { parseAlmaMessage } from "@/components/ai/alma/AlmaConversation";

describe("parseAlmaMessage, barres obliques dans le texte", () => {
  it.each([
    "Vous pouvez garder un chien et/ou un chat.",
    "Une présence 24h/24 rassure toujours.",
    "La garde commence le 13/09/2026.",
  ])("laisse la phrase intacte : %s", (message) => {
    const parsed = parseAlmaMessage(message);
    expect(parsed.links).toHaveLength(0);
    expect(parsed.text).toBe(message);
  });

  it("extrait toujours un vrai chemin", () => {
    const parsed = parseAlmaMessage("Vous trouverez les réponses ici : /faq.");
    expect(parsed.links).toHaveLength(1);
    expect(parsed.links[0].title).toBe("La FAQ");
  });
});
