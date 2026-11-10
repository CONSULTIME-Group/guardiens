import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import TripsQuestion from "@/components/profile/TripsQuestion";
import FieldRole, { FIELD_ROLE_TEXT } from "@/components/profile/FieldRole";
import ScoreBreakdown from "@/components/profile/ScoreBreakdown";

/**
 * Design pastel des lots SC1 à SC4 (10/11/2026, canevas Claude Design
 * « Score de complétion · écrans des lots SC1 à SC4 », validé par Jérémie).
 */

const hsl = (h: number, s: number, l: number) => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
};
const lum = ([r, g, b]: number[]) => {
  const c = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

describe("design pastel : couleurs", () => {
  const css = readFileSync("src/index.css", "utf8");
  const read = (block: string, name: string) => {
    const m = block.match(new RegExp(`--${name}: (\\d+) (\\d+)% (\\d+)%;`));
    if (!m) throw new Error(name);
    return hsl(+m[1], +m[2], +m[3]);
  };
  const light = css.slice(0, css.indexOf(".dark {"));
  const dark = css.slice(css.indexOf(".dark {"));

  it.each(["sage", "peach", "honey", "sky"])("encre %s lisible sur son fond, clair et sombre (4,5:1 au moins)", (t) => {
    expect(ratio(read(light, `pastel-${t}-ink`), read(light, `pastel-${t}`))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(read(dark, `pastel-${t}-ink`), read(dark, `pastel-${t}`))).toBeGreaterThanOrEqual(4.5);
  });

  it("les quatre familles sont déclarées dans Tailwind", () => {
    const tw = readFileSync("tailwind.config.ts", "utf8");
    for (const t of ["sage", "peach", "honey", "sky"]) expect(tw).toContain(`--pastel-${t}-ink`);
  });
});

describe("design pastel : trajets en cartes", () => {
  it("trois cartes radio, nom accessible = libellé, précision en description", () => {
    const onChange = vi.fn();
    render(<TripsQuestion value={{ has_license: null, has_vehicle: null }} onChange={onChange} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Je me déplace autrement" })).toHaveAccessibleDescription("À pied, à vélo, en transports");
    fireEvent.click(screen.getByRole("radio", { name: "J'ai mon véhicule" }));
    expect(onChange).toHaveBeenCalledWith({ has_license: true, has_vehicle: true });
  });

  it("la carte choisie est cochée", () => {
    render(<TripsQuestion value={{ has_license: true, has_vehicle: false }} onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "J'ai le permis, sans véhicule" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("design pastel : étiquettes et score", () => {
  it("chaque étiquette garde sa phrase complète pour les lecteurs d'écran", () => {
    render(<FieldRole roles={["match_double", "public"]} />);
    expect(screen.getByText(FIELD_ROLE_TEXT.match_double)).toBeInTheDocument();
    expect(screen.getByText("Compte double")).toBeInTheDocument();
    expect(screen.getByText("Sur votre fiche")).toBeInTheDocument();
  });

  it("le panneau ouvert montre la barre en trois parts", () => {
    render(
      <ScoreBreakdown
        role="sitter"
        total={66}
        defaultOpen
        footnote="Note."
        groups={[
          { id: "trust", title: "Ce qui rassure sur votre fiche", criteria: [{ label: "Photo", points: 20, ok: true }, { label: "Présentation", points: 45, ok: false }] },
          { id: "match", title: "Ce qui affine vos matchs", criteria: [{ label: "Habitudes", points: 20, ok: true }] },
          { id: "help", title: "Ce qui sert l'entraide", criteria: [{ label: "Savoir-faire", points: 15, ok: true }] },
        ]}
      />
    );
    expect(screen.getByTestId("score-bar")).toHaveAttribute(
      "aria-label",
      "Ce qui rassure sur votre fiche 20 sur 65, Ce qui affine vos matchs 20 sur 20, Ce qui sert l'entraide 15 sur 15"
    );
  });
});
