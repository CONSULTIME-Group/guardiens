import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Verrou ACC1 du 21/11/2026 : l'accord de garde se présente comme facultatif
// et gratuit, et ses montants se lisent comme des frais avancés remboursés
// sur facture (une propriétaire les avait lus comme un tarif).
const read = (p: string) => readFileSync(p, "utf8");
const accord = read("src/components/gardes/AccordDeGarde.tsx");
const banner = read("src/components/gardes/AccordOwnerStatusBanner.tsx");
const sitter = read("src/components/sits/views/SitterSitView.tsx");

describe("ACC1, accord facultatif et gratuit", () => {
  it("le bandeau propriétaire dit facultatif et gratuit, avec Lire l'accord et Plus tard", () => {
    expect(banner).toContain("Un accord de garde, si vous le souhaitez");
    expect(banner).toContain("Guardiens est gratuit, pour vous comme pour votre gardien.");
    expect(banner).toContain("Lire l'accord");
    expect(banner).toContain("Plus tard");
    expect(banner).not.toContain("Il vous reste à le signer");
  });

  it("l'accord s'ouvre sur la gratuité et présente les montants comme des frais avancés", () => {
    expect(accord).toContain("<strong>Guardiens est gratuit.</strong> Cet accord est facultatif");
    expect(accord).toContain("Frais avancés, remboursés sur facture");
    expect(accord).toContain("peut avancer jusqu'à {garde.montantVetMax} €");
    expect(accord).toContain("remboursés par {p} sur facture.");
    expect(accord).not.toContain("peut engager des soins jusqu'à");
    expect(accord.indexOf("accord-free-note")).toBeLessThan(accord.indexOf("accord-frais-avances"));
  });

  it("Plus tard referme sans refus, le refus tracé reste possible", () => {
    expect(accord).not.toContain("Passer cette étape");
    const later = accord.indexOf(">\n  Plus tard\n");
    expect(later).toBeGreaterThan(-1);
    expect(accord.slice(later - 200, later)).toContain("onClick={onClose}");
    expect(accord).toContain("Décliner l'accord");
    expect(accord).toContain("handleDecline");
    expect(accord).toContain('const buttonLabel = "Je signe cet accord";');
  });

  it("la vue gardien présente l'accord comme facultatif", () => {
    expect(sitter).toContain("Un accord de garde facultatif est disponible");
    expect(sitter).not.toContain("pour finaliser la garde");
  });

  it("aucun tiret long dans les textes touchés", () => {
    expect(`${accord}\n${banner}`).not.toMatch(/[–—]/);
  });
});
