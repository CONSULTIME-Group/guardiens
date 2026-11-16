import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CITY_PILOT_V2,
  CITY_V2_TEMOINS,
  isCityV2Active,
  pilotFaq,
  pilotIntro,
  resolveCityV2,
  trimCityEditorial,
} from "@/data/cityPilotV2";
import { CITIES } from "@/data/cities";

const at = (iso: string) => new Date(iso);

describe("VIL2, gabarit v2 par défaut", () => {
  it("vaut pour toute ville, statique, en base ou à venir", () => {
    for (const slug of ["lyon", "annecy", "paris", "evreux", "une-ville-creee-demain"]) {
      expect(isCityV2Active(slug, at("2026-11-16T15:00:00Z"))).toBe(true);
    }
    for (const c of CITIES) expect(isCityV2Active(c.slug, at("2026-11-16T15:00:00Z"))).toBe(true);
  });
  it("garde les témoins sur l'ancien gabarit jusqu'au 14/12/2026, heure de Paris", () => {
    for (const t of CITY_V2_TEMOINS) {
      expect(isCityV2Active(t, at("2026-12-13T22:59:00Z"))).toBe(false);
      expect(isCityV2Active(t, at("2026-12-13T23:00:00Z"))).toBe(true);
    }
  });
});

describe("VIL2, contenu par défaut", () => {
  it("ancre l'intro sur la première phrase en base et garde la suite", () => {
    const r = resolveCityV2("evreux", "Évreux", "Évreux, ville d'art et d'histoire traversée par l'Iton, offre un cadre de vie apprécié. Ses parcs invitent à la sérénité. C'est un lieu idéal.");
    expect(r.cityLine).toBe("Évreux, ville d'art et d'histoire traversée par l'Iton, offre un cadre de vie apprécié.");
    expect(r.introRest).toBe("Ses parcs invitent à la sérénité. C'est un lieu idéal.");
    expect(pilotIntro("Évreux", r).startsWith("Le home sitting à Évreux, c'est confier")).toBe(true);
  });
  it("tient sans intro en base", () => {
    const r = resolveCityV2("ville", "Ville", null);
    expect(r.cityLine).toBe("Sur Guardiens, vous publiez votre garde à Ville et les gardiens proches de chez vous postulent.");
    expect(r.introRest).toBeNull();
  });
  it("pose une FAQ de 5 questions, locale quand une source existe", () => {
    const generic = pilotFaq("Évreux", resolveCityV2("evreux", "Évreux", null));
    expect(generic).toHaveLength(5);
    expect(generic[2].q).toBe("Comment trouver un gardien à Évreux ?");
    const lyon = pilotFaq("Lyon", resolveCityV2("lyon", "Lyon", null));
    expect(lyon[2].q).toBe("Où promener un chien à Lyon ?");
    const strasbourg = pilotFaq("Strasbourg", resolveCityV2("strasbourg", "Strasbourg", null));
    expect(strasbourg).toHaveLength(6);
  });
  it("écrit les questions locales en phrases affirmatives, sans tiret long", () => {
    for (const [slug, v] of Object.entries(CITY_PILOT_V2)) {
      const texts = [v.cityLine, v.walkAnswer, ...(v.localFaq ?? []).flatMap((f) => [f.q, f.a])].filter(Boolean) as string[];
      for (const t of texts) {
        expect(t, slug).not.toMatch(/[—–]/);
        expect(t, slug).not.toMatch(/(?<![\p{L}])(?<!deux )pas(?![\p{L}])|(?<![\p{L}])(jamais|aucun|aucune|ne)(?![\p{L}])|(?<![\p{L}])n'|^Non(?![\p{L}])/u);
      }
    }
  });
});

describe("VIL2, corps éditorial sans doublon", () => {
  const md = [
    "Intro libre.",
    "## Pourquoi Évreux a besoin d'une plateforme de garde de proximité\nTexte local.",
    "## Comment fonctionne Guardiens à Évreux\nÉtapes.",
    "## Où promener votre chien à Évreux\nParcs.",
    "## Propriétaires à Évreux, ce que Guardiens vous offre\nBénéfices.",
    "## Qui sont les gardiens à Évreux\nProfils.",
    "## Combien ça coûte à Évreux\nGratuit.",
    "## Tarifs Guardiens : transparents et sans surprise\nPrix.",
    "## Notre histoire et notre engagement à Évreux\nHistoire.",
    "## Questions fréquentes des propriétaires à Évreux\n**Q ?** R.",
    "## En cas d'imprévu\nUrgence.",
    "## Les quartiers et environs de Évreux\nQuartiers.",
  ].join("\n\n");
  it("retire étapes, prix, FAQ, histoire, imprévus et profils, garde le local", () => {
    const out = trimCityEditorial(md) ?? "";
    expect(out).toContain("Intro libre.");
    expect(out).toContain("## Pourquoi Évreux");
    expect(out).toContain("## Où promener votre chien");
    expect(out).toContain("## Les quartiers et environs");
    for (const gone of ["Comment fonctionne", "ce que Guardiens vous offre", "Qui sont les gardiens", "Combien ça coûte", "Tarifs Guardiens", "Notre histoire", "Questions fréquentes", "En cas d'imprévu"]) {
      expect(out).not.toContain(gone);
    }
  });
  it("rend null sur un corps vide", () => {
    expect(trimCityEditorial(null)).toBeNull();
    expect(trimCityEditorial("## Questions fréquentes\nx")).toBeNull();
  });
});

describe("VIL2, branchement de CityPage", () => {
  const src = readFileSync("src/pages/CityPage.tsx", "utf8");
  it("rend le v2 sur le chemin statique et sur le chemin base", () => {
    expect(src).toMatch(/if \(cityData && isCityV2Active\(cityData\.slug\)\)/);
    expect(src).toMatch(/const dbV2 = isCityV2Active\(dbPage\.slug\)/);
    expect(src).toMatch(/<CitySchemaOrg city=\{cityData\} faqItems=\{v2Faq\} \/>/);
  });
});
