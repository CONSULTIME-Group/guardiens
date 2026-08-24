import { describe, it, expect, vi, afterEach } from "vitest";
import {
  interpolatePlaceholders,
  findUnknownPlaceholders,
  KNOWN_PLACEHOLDERS,
} from "@/lib/contentPlaceholders";

const fr = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

describe("interpolatePlaceholders", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("substitue une clé simple", () => {
    expect(
      interpolatePlaceholders("Déjà {{total_inscrits}} inscrits.", { total_inscrits: 1240 })
    ).toBe(`Déjà ${fr(1240)} inscrits.`);
  });

  it("accepte les formes préfixée stats. et non préfixée pour la même valeur", () => {
    const prefixed = interpolatePlaceholders("{{stats.profils_gardien}} gardiens", {
      profils_gardien: 812,
    });
    const bare = interpolatePlaceholders("{{profils_gardien}} gardiens", { profils_gardien: 812 });
    expect(prefixed).toBe(bare);
    expect(prefixed).toBe(`${fr(812)} gardiens`);
  });

  it("accepte les espaces dans les accolades", () => {
    expect(
      interpolatePlaceholders("{{ stats.profils_gardien }} gardiens", { profils_gardien: 812 })
    ).toBe(`${fr(812)} gardiens`);
  });

  it("résout le préfixe ville. vers la clé canonique ville_*", () => {
    expect(
      interpolatePlaceholders("{{ville.gardiens}} gardiens à {{ville.nom}}", {
        ville_gardiens: 14,
        ville_nom: "Toulouse",
      })
    ).toBe(`${fr(14)} gardiens à Toulouse`);
  });

  it("résout le préfixe departement. vers la clé canonique departement_*", () => {
    expect(
      interpolatePlaceholders("{{departement.gardiens}} gardiens en {{departement.nom}}", {
        departement_gardiens: 96,
        departement_nom: "Gironde",
      })
    ).toBe(`${fr(96)} gardiens en Gironde`);
  });

  it("formate un grand nombre en français avec séparateur de milliers", () => {
    expect(interpolatePlaceholders("{{total_inscrits}}", { total_inscrits: 1234567 })).toBe(
      fr(1234567)
    );
  });

  it("retire une clé inconnue et émet un avertissement", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(interpolatePlaceholders("A {{bidule_truc}} B", {})).toBe("A  B");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("bidule_truc");
  });

  it("retire un placeholder dont la valeur est nulle ou pas encore chargée", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      interpolatePlaceholders("X {{ville_gardiens}} Y {{profils_gardien}} Z", {
        ville_gardiens: null,
      })
    ).toBe("X  Y  Z");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("ne rend jamais NaN", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(interpolatePlaceholders("{{total_inscrits}}", { total_inscrits: NaN })).toBe("");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("laisse un contenu sans placeholder strictement inchangé", () => {
    const content = "Texte {avec} une accolade simple et un { autre } cas.";
    expect(interpolatePlaceholders(content, {})).toBe(content);
  });

  it("ne laisse aucune accolade de placeholder résiduelle dans la sortie", () => {
    const out = interpolatePlaceholders(
      "{{ville.gardiens}} gardiens, {{cle_inconnue}} erreur, {{ stats.profils_gardien }} profils, {{departement_annonces_actives}} annonces",
      { ville_gardiens: 5, profils_gardien: 10 }
    );
    expect(out).not.toContain("{{");
    expect(out).not.toContain("}}");
    expect(out).not.toContain("undefined");
    expect(out).not.toContain("NaN");
  });
});

describe("interpolatePlaceholders, filet de sécurité sur les formes malformées", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const malformedCases = [
    "{{Profils_Gardien}}",
    "{{STATS.PROFILS_GARDIEN}}",
    "{{stats.profils-gardien}}",
    "{{villes couvertes}}",
    "{{ville.gardiens.total}}",
    "{{}}",
  ];

  it.each(malformedCases)("retire et signale la forme malformée %s", (bad) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = interpolatePlaceholders(`Avant ${bad} après.`, {
      profils_gardien: 812,
      villes_couvertes: 50,
    });
    expect(out).toBe("Avant  après.");
    expect(out).not.toContain("{{");
    expect(out).not.toContain("}}");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("malformé");
    expect(warn.mock.calls[0][0]).toContain(bad);
  });

  it("ne résout jamais une faute de casse vers la clé canonique", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = interpolatePlaceholders("{{Profils_Gardien}} gardiens inscrits", {
      profils_gardien: 812,
    });
    expect(out).toBe(" gardiens inscrits");
    expect(out).not.toContain(fr(812));
  });

  it("rattrape les formes imbriquées en plusieurs passes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = interpolatePlaceholders("X {{ a {{ b }} c }} Y", {});
    expect(out).not.toContain("{{");
    expect(out).not.toContain("}}");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("ne laisse aucune accolade visible avec toutes les formes malformées combinées", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = interpolatePlaceholders(malformedCases.join(" puis "), {});
    expect(out).not.toContain("{{");
    expect(out).not.toContain("}}");
    expect(out).not.toContain("undefined");
    expect(out).not.toContain("NaN");
  });

  it("préserve un bloc de code fenced contenant des doubles accolades (JSX)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const content = 'Texte.\n\n```jsx\n<div style={{ color: "red" }} />\n```\n\nFin.';
    expect(interpolatePlaceholders(content, {})).toBe(content);
    expect(warn).not.toHaveBeenCalled();
  });

  it("préserve un template avec séparateur point dans un bloc fenced", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const content = "Syntaxe :\n\n```\n{{ user.name }}\n```";
    expect(interpolatePlaceholders(content, {})).toBe(content);
    expect(warn).not.toHaveBeenCalled();
  });

  it("préserve un bloc de code JSON contenant des accolades", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const content = 'Exemple :\n\n```json\n{"filtre": {"ville": "Lyon", "tags": {}}}\n```\n\nFin.';
    expect(interpolatePlaceholders(content, {})).toBe(content);
    expect(warn).not.toHaveBeenCalled();
  });

  it("préserve le code inline contenant des accolades malformées", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const content = "Utilisez `style={{ color: 'red' }}` dans le composant.";
    expect(interpolatePlaceholders(content, {})).toBe(content);
    expect(warn).not.toHaveBeenCalled();
  });

  it("retire le malformé hors code tout en préservant le bloc de code du même contenu", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const content = '{{Profils_Gardien}}\n\n```jsx\n<div style={{ color: "red" }} />\n```';
    const out = interpolatePlaceholders(content, { profils_gardien: 812 });
    expect(out).toBe('\n\n```jsx\n<div style={{ color: "red" }} />\n```');
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("Profils_Gardien");
  });
});

describe("findUnknownPlaceholders", () => {
  it("liste les clés inconnues, dédupliquées", () => {
    expect(
      findUnknownPlaceholders("{{ville_gardiens}} ok, {{faux_compte}} et {{faux_compte}} encore")
    ).toEqual(["faux_compte"]);
  });

  it("ne signale pas les clés connues, préfixées ou non", () => {
    expect(
      findUnknownPlaceholders("{{profils_gardien}} {{stats.profils_gardien}} {{ville.gardiens}}")
    ).toEqual([]);
  });

  it("renvoie une liste vide sans placeholder", () => {
    expect(findUnknownPlaceholders("Texte sans variable.")).toEqual([]);
  });

  it("signale les formes malformées (casse, tiret, espace interne)", () => {
    expect(
      findUnknownPlaceholders("{{Profils_Gardien}} et {{stats.profils-gardien}} et {{villes couvertes}}")
    ).toEqual(["Profils_Gardien", "stats.profils-gardien", "villes couvertes"]);
  });

  it("signale la double préfixation", () => {
    expect(findUnknownPlaceholders("{{ville.gardiens.total}}")).toEqual(["ville.gardiens.total"]);
  });

  it("signale un placeholder vide", () => {
    expect(findUnknownPlaceholders("Texte {{}} vide")).toEqual(["(vide)"]);
  });

  it("ne signale rien dans un bloc de code fenced", () => {
    expect(
      findUnknownPlaceholders("```jsx\n<div style={{ color: 'red' }} />\n```")
    ).toEqual([]);
  });

  it("signale hors code mais pas dans le code, dans le même contenu", () => {
    expect(
      findUnknownPlaceholders("{{Profils_Gardien}} puis `style={{ color: 'red' }}`")
    ).toEqual(["Profils_Gardien"]);
  });
});

describe("KNOWN_PLACEHOLDERS", () => {
  it("couvre les trois portées documentées", () => {
    const scopes = new Set(KNOWN_PLACEHOLDERS.map((p) => p.scope));
    expect(scopes).toEqual(new Set(["global", "ville", "departement"]));
  });

  it("ne contient que des clés au format canonique", () => {
    for (const p of KNOWN_PLACEHOLDERS) {
      expect(p.key).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});
