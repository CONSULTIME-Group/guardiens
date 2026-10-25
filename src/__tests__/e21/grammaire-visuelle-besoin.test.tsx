/**
 * Verrou du lot E21 « Grammaire visuelle du besoin » (25/10/2026, maquette
 * Claude Design validée par Jérémie).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NeedPaperPanel from "@/components/entraide/NeedPaperPanel";
import RelatedMissionCard from "@/components/missions/RelatedMissionCard";
import { needTitleSizeClass, needWhenLabel } from "@/lib/needVisual";
import { notifiedLine, responsesLine } from "@/lib/missionNotifiedCount";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/** Contraste WCAG entre deux couleurs HSL « h s% l% ». */
function contrast(a: string, b: string): number {
  const lum = (hsl: string) => {
    const [h, s, l] = hsl.replace(/%/g, "").split(/\s+/).map(Number);
    const sat = s / 100, li = l / 100;
    const k = (n: number) => (n + h / 30) % 12;
    const f = (n: number) => li - sat * Math.min(li, 1 - li) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe("fiche sans photo : panneau gouache", () => {
  it("papier de la charte, gouache de la catégorie, ville en pastille", () => {
    render(<NeedPaperPanel category="garden" title="Tailler une haie" city="Écully" />);
    const panel = screen.getByTestId("need-paper-panel");
    expect(panel.className).toContain("bg-hero-paper");
    expect(panel.getAttribute("data-spot")).toBe("jardin");
    expect(panel.querySelector("img")?.getAttribute("src")).toMatch(/spot-jardin-480/);
    expect(screen.getByText("Écully")).toBeInTheDocument();
  });

  it("les deux vues de la fiche montrent le panneau quand la photo manque", () => {
    for (const f of ["src/pages/SmallMissionDetail.tsx", "src/components/missions/PublicMissionView.tsx"]) {
      const src = read(f);
      expect(src, f).toContain("{!heroImage && (\n");
      expect(src, f).toContain("<NeedPaperPanel");
    }
    expect(read("src/components/missions/PublicMissionView.tsx")).not.toContain("une annonce sans photo ne doit PAS");
  });

  it("titre dimensionné sur le titre, jamais sur la description (avis 17)", () => {
    expect(needTitleSizeClass("Tailler une haie")).toBe("text-[2rem] md:text-[2.75rem]");
    expect(needTitleSizeClass("x".repeat(80))).toBe("text-[1.75rem] md:text-4xl");
    expect(needTitleSizeClass("x".repeat(120))).toBe("text-[1.5rem] md:text-3xl");
    const pub = read("src/components/missions/PublicMissionView.tsx");
    expect(pub).not.toContain("descLen");
    expect(pub).toContain("needTitleSizeClass(displayTitle)");
  });

  it("blocs « Quand » et « Durée »", () => {
    expect(needWhenLabel(null, null)).toBe("À convenir ensemble");
    expect(needWhenLabel("2026-11-07", null)).toBe("Samedi 7 nov.");
    expect(needWhenLabel("2026-11-08", "2026-11-10")).toBe("Du 8 nov. au 10 nov.");
    for (const f of ["src/pages/SmallMissionDetail.tsx", "src/components/missions/PublicMissionView.tsx"]) {
      expect(read(f), f).toContain('data-testid="need-facts"');
    }
  });

  it("encart « En retour, {Prénom} propose » et une seule barre basse « {N} personnes prévenues »", () => {
    expect(notifiedLine(9)).toBe("9 personnes prévenues");
    expect(notifiedLine(1)).toBe("1 personne prévenue");
    expect(notifiedLine(0)).toBeNull();
    expect(notifiedLine(null)).toBeNull();
    expect(responsesLine(0)).toBe("Vous seriez la première réponse");
    for (const f of ["src/pages/SmallMissionDetail.tsx", "src/components/missions/PublicMissionView.tsx"]) {
      const src = read(f);
      expect(src, f).toContain('className="rounded-card bg-terra-soft px-4 py-3.5 space-y-1" data-testid="mission-exchange-line"');
      expect(src.match(/data-testid="mission-notified-line"/g)?.length, f).toBe(1);
    }
    const sql = read("drizzle/migrations/0103_e21_personnes_prevenues.sql");
    expect(sql).toContain("count(DISTINCT q.helper_id)");
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.mission_notified_count(uuid) FROM PUBLIC, anon, authenticated;");
  });

  it("un seul bouton plein sur téléphone : l'encart latéral passe à l'ordinateur", () => {
    expect(read("src/pages/SmallMissionDetail.tsx")).toContain('className="hidden lg:inline-flex w-full rounded-full font-bold text-base"');
    const pub = read("src/components/missions/PublicMissionView.tsx");
    expect(pub).toContain('<Link to={canHelpHref} className="hidden lg:block">');
    const besoin = pub.slice(pub.lastIndexOf("  return (\n    <>"));
    expect(besoin).not.toContain('variant="secondary"');
    expect(besoin).not.toContain("bg-primary text-primary-foreground rounded");
  });
});

describe("cartes liées", () => {
  it("cœur retiré, phrase d'échange retirée, gouache en vignette (n° 35, 36)", () => {
    const { container } = render(
      <MemoryRouter>
        <RelatedMissionCard to="/petites-missions/poules" title="Nourrir les poules deux matins" city="Écully" timeAgo="il y a 2 j" category="animals" />
      </MemoryRouter>,
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByTestId("need-paper-thumb").getAttribute("data-spot")).toBe("poules");
    expect(container.textContent).not.toMatch(/En retour|un merci, un café|Animaux/);
    expect(read("src/components/missions/RelatedMissionCard.tsx")).not.toContain("CategoryGlyph");
  });
});

describe("trois rayons, 14 px, contraste des champs", () => {
  const files = [
    "src/pages/SmallMissionDetail.tsx",
    "src/components/missions/RelatedMissionCard.tsx",
    "src/components/entraide/NeedPaperPanel.tsx",
    "src/components/entraide/CanHelpDialog.tsx",
  ];

  it("rounded-field, rounded-card et rounded-full seulement", () => {
    for (const f of files) {
      const radii = new Set(read(f).match(/rounded-[a-z0-9[\].-]+/g) ?? []);
      for (const r of radii) expect(["rounded-field", "rounded-card", "rounded-full", "rounded-r-card"], `${f} ${r}`).toContain(r.replace(/^(sm:|md:)/, ""));
    }
    const pub = read("src/components/missions/PublicMissionView.tsx");
    const besoin = pub.slice(pub.lastIndexOf("  return (\n    <>"));
    for (const r of new Set(besoin.match(/rounded-[a-z0-9[\].-]+/g) ?? [])) {
      expect(["rounded-field", "rounded-card", "rounded-full"], r).toContain(r);
    }
    const tw = read("tailwind.config.ts");
    expect(tw).toContain('field: "8px"');
    expect(tw).toContain('card: "14px"');
  });

  it("aucune information décisive sous 14 px sur la fiche", () => {
    const smd = read("src/pages/SmallMissionDetail.tsx");
    expect(smd).not.toContain("text-[10px] font-bold uppercase tracking-widest");
    expect(smd).toContain('<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">');
  });

  it("bordure de champ au contraste 3:1 au moins, dans la charte", () => {
    const css = read("src/index.css");
    const light = css.match(/--field-border: ([\d.]+ [\d.]+% [\d.]+%);/g) ?? [];
    expect(light).toHaveLength(2);
    const [lightValue, darkValue] = light.map((l) => l.replace(/--field-border: |;/g, ""));
    expect(contrast(lightValue, "40 33% 97%")).toBeGreaterThanOrEqual(3);
    expect(contrast(lightValue, "0 0% 100%")).toBeGreaterThanOrEqual(3);
    expect(contrast(lightValue, "38 58% 93%")).toBeGreaterThanOrEqual(3);
    expect(contrast(darkValue, "160 10% 8%")).toBeGreaterThanOrEqual(3);
    expect(contrast(darkValue, "160 8% 12%")).toBeGreaterThanOrEqual(3);
    expect(contrast("37 22% 89%", "40 33% 97%")).toBeLessThan(1.3);
    expect(read("tailwind.config.ts")).toContain('field: "hsl(var(--field-border))"');
    expect(read("src/components/entraide/CanHelpDialog.tsx")).toContain("border-field");
    expect(read("src/pages/CreateSmallMission.tsx")).toContain("border-field bg-card");
  });

  it("aucune couleur codée en dur ni tiret dans les fichiers du lot", () => {
    for (const f of [...files, "src/components/missions/PublicMissionView.tsx", "src/lib/needVisual.ts", "src/lib/missionNotifiedCount.ts"]) {
      const src = read(f);
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{6}\b|rgb\(/);
      expect(src, f).not.toMatch(/[–—]/);
    }
  });

  it("AGENTS.md : entrées E18, E21 et règle P3 mise à jour", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("(lot E21, 25/10/2026");
    expect(agents).toContain("(lot E18, 25/10/2026");
    expect(agents).not.toContain("la fiche détaillée d'un besoin garde sa règle (aucune image sans photo réelle)");
  });
});
