/**
 * Lot E13 (24/10/2026, retour de Jérémie sur téléphone) : un besoin se lit
 * avant de répondre « Je peux ». Titre en police de lecture sur toute la
 * largeur, extrait de la description, fenêtre qui redit le besoin.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { needExcerpt } from "@/lib/needExcerpt";
import { NeedRow, needMetaLine, type EntraideNeed } from "@/components/entraide/EntraideCards";
import CanHelpDialog from "@/components/entraide/CanHelpDialog";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const need: EntraideNeed = {
  id: "n1",
  slug: "rempoter-monsteras",
  title: "Cherche un coup de main pour rempoter deux monsteras avec les conseils pour qu'elles ne meurent pas",
  description: "Bonjour à toutes et à tous,\n\nJe recherche une personne qui aime les plantes d'intérieur.",
  city: "annecy",
  date_needed: null,
  end_date: null,
  latitude: null,
  longitude: null,
  response_count: 2,
  photos: null,
  category: "jardinage",
  user_id: "u1",
};

describe("Extrait de la description", () => {
  it("regroupe les espaces et retire le titre répété en tête", () => {
    expect(needExcerpt("  Garder   mon chat\n\npendant mes vacances. Du 21/12 au 29/12 ", "Garder mon chat")).toBe("pendant mes vacances. Du 21/12 au 29/12");
    expect(needExcerpt("", "x")).toBeNull();
    expect(needExcerpt(null, "x")).toBeNull();
  });

  it("coupe à un mot entier et marque la coupe", () => {
    const long = "mot ".repeat(200);
    const out = needExcerpt(long, null, 50)!;
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/mo…$/);
  });
});

describe("Ligne de besoin", () => {
  it("montre le titre en entier, l'extrait et un seul bouton « Je peux »", () => {
    render(<MemoryRouter><ul><NeedRow need={need} distance={3.2} state="default" onCanHelp={() => undefined} /></ul></MemoryRouter>);
    expect(screen.getByRole("link", { name: need.title })).toBeInTheDocument();
    expect(screen.getByTestId("need-row-excerpt").textContent).toContain("plantes d'intérieur");
    expect(screen.getAllByRole("button", { name: "Je peux" })).toHaveLength(1);
  });

  it("titre en police de lecture, trois lignes sur téléphone, bouton de 44 px", () => {
    const src = read("src/components/entraide/EntraideCards.tsx");
    const row = src.slice(src.indexOf("export const NeedRow"), src.indexOf("export async function openHelperConversation"));
    expect(row).toContain("font-body line-clamp-3 text-[15px] font-semibold");
    expect(row).not.toMatch(/<h3 className="[^"]*font-heading/);
    expect(row).toContain("min-h-11");
  });

  it("lieu, date et « Je peux » sur une ligne partagée", () => {
    expect(needMetaLine(need, 3.2)).toBe("à 3 km, Annecy · À convenir ensemble · 2 « Je peux »");
  });
});

describe("Fenêtre « Je peux »", () => {
  it("redit le besoin avant le message", () => {
    render(
      <MemoryRouter>
        <CanHelpDialog
          open
          firstName="Claire"
          needTitle={need.title}
          needMeta="à 3 km, Annecy · À convenir ensemble"
          needDescription={needExcerpt(need.description, need.title)}
          detailPath="/petites-missions/rempoter-monsteras"
          sending={false}
          onCancel={() => undefined}
          onSend={() => undefined}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("can-help-description").textContent).toContain("plantes d'intérieur");
    expect(screen.getByRole("link", { name: "Lire le besoin en entier" })).toHaveAttribute("href", "/petites-missions/rempoter-monsteras");
    expect(screen.getByText("à 3 km, Annecy · À convenir ensemble")).toBeInTheDocument();
  });

  it("la liste lit la description, la page la transmet à la fenêtre", () => {
    const hub = read("src/pages/EntraideHub.tsx");
    expect(hub).toMatch(/select\("id, user_id, slug, title, description, city/);
    expect(hub).toContain("needDescription={confirmNeed ? needExcerpt(confirmNeed.description, confirmNeed.title) : null}");
  });

  it("aucun tiret cadratin ni demi-cadratin dans les textes du lot", () => {
    for (const f of ["src/lib/needExcerpt.ts", "src/components/entraide/CanHelpDialog.tsx"]) {
      expect(read(f)).not.toMatch(/[–—]/);
    }
  });
});
