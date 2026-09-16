import { describe, it, expect } from "vitest";
import { detectContactDetails } from "@/lib/contactDetails";
import { rewriteDepartmentMention } from "@/lib/departmentGrammar";

/**
 * Verrou de non regression : ces deux fonctions utilisaient un lookbehind,
 * refuse par Safari iOS avant 16.4. Les cas ci-dessous fixent le comportement
 * attendu, identique a la version precedente.
 */
describe("compactage des chiffres sans lookbehind", () => {
  const compacte = (s: string) => s.replace(/(\d)[\s.\-]+(?=\d)/g, "$1");
  const reference = (s: string) => s.replace(/(\d)[\s.\-]+(\d)/g, "$1$2");

  it("donne le meme resultat que la version a lookbehind", () => {
    expect(compacte("06 12 34 56 78")).toBe("0612345678");
    expect(compacte("06.12.34.56.78")).toBe("0612345678");
    expect(compacte("1 2 3")).toBe("123");
    expect(compacte("06-12-34-56-78")).toBe("0612345678");
    expect(compacte("tel 06 12 34 56 78 merci")).toBe("tel 0612345678 merci");
    // La version a lookbehind ne consomme pas le chiffre de droite, elle
    // enchaine donc les paires qui se chevauchent : meme resultat ici.
    expect(compacte("1 2 3")).toBe(reference(reference("1 2 3")));
  });

  it("detecte toujours un numero espace", () => {
    expect(detectContactDetails("appelez moi au 06 12 34 56 78")).toContain("phone");
    expect(detectContactDetails("06.12.34.56.78")).toContain("phone");
  });
});

describe("mention de departement sans lookbehind", () => {
  it("reecrit la mention isolee", () => {
    expect(rewriteDepartmentMention("Gardiens en Rhône", "Rhône")).toContain("Rhône");
  });

  it("ne coupe pas un mot plus long", () => {
    const texte = "Le Rhônexyz reste intact";
    expect(rewriteDepartmentMention(texte, "Rhône")).toBe(texte);
  });

  it("laisse le texte inchange si le nom est inconnu", () => {
    expect(rewriteDepartmentMention("Bonjour", "Atlantide")).toBe("Bonjour");
  });

  it("conserve le caractere qui precede la mention", () => {
    const sortie = rewriteDepartmentMention("Vivre (Rhône) aujourd'hui", "Rhône");
    expect(sortie.startsWith("Vivre (")).toBe(true);
  });
});
