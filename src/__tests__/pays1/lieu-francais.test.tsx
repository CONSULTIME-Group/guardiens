/**
 * Lot PAYS1 (24/11/2026) : un résident en France qui passe par « Je vis hors
 * de France » le voit tout de suite. Base du 24/11/2026 : 6 résidents en
 * France rangés dans un autre pays (Ecully 69000 en Belgique, Rezé 44400 au
 * Royaume-Uni, Saint-Julien-en-Genevois 74160 en Suisse, Marseille aux
 * Seychelles, Bordeaux en Irlande, 06100 en Albanie), et l'écran Utilisateurs
 * affichait « Hastière, 05540, Alpes-de-Haute-Provence, Belgique ».
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { departmentPrefix, matchFrenchPlace, placeKey } from "@/lib/frenchPlaceHint";
import { adminDeptLabel, FRENCH_COUNTRY_CODES } from "@/lib/admin/memberList";
import { useFrenchPlaceHint } from "@/hooks/useFrenchPlaceHint";
import { FrenchPlaceHint } from "@/components/arrival/FrenchPlaceHint";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";

describe("PAYS1 : un lieu français reconnu", () => {
  it("ville et code postal d'une même commune", () => {
    expect(matchFrenchPlace("Rezé", "44400", [{ nom: "Rezé" }])).toEqual({ city: "Rezé", postalCode: "44400" });
    expect(matchFrenchPlace("reze", "44400", [{ nom: "Rezé" }])).toEqual({ city: "Rezé", postalCode: "44400" });
    expect(matchFrenchPlace("St Julien en Genevois", "74160", [{ nom: "Archamps" }, { nom: "Saint-Julien-en-Genevois" }])?.city).toBe("Saint-Julien-en-Genevois");
    expect(matchFrenchPlace("Marseille 7e", "13007", [{ nom: "Marseille" }])?.city).toBe("Marseille");
  });

  it("code inexact : la commune du département donne son vrai code", () => {
    expect(matchFrenchPlace("Ecully", "69000", [], [{ nom: "Écully", codesPostaux: ["69130"] }])).toEqual({ city: "Écully", postalCode: "69130" });
  });

  it("vrais lieux étrangers : rien n'est proposé", () => {
    expect(matchFrenchPlace("Huesca", "22005", [])).toBeNull();
    expect(matchFrenchPlace("Barika", "06400", [{ nom: "Cannes" }])).toBeNull();
    expect(matchFrenchPlace("Tübingen", "72076", [])).toBeNull();
    expect(matchFrenchPlace("Bruxelles", "13001", [{ nom: "Marseille" }])).toBeNull();
    expect(matchFrenchPlace("Opwijk", "1745", [{ nom: "Opwijk" }])).toBeNull();
    expect(matchFrenchPlace("", "44400", [{ nom: "Rezé" }])).toBeNull();
  });

  it("département cherché pour la métropole seulement", () => {
    expect(departmentPrefix("69000")).toBe("69");
    expect(departmentPrefix("20000")).toBeNull();
    expect(departmentPrefix("97200")).toBeNull();
    expect(departmentPrefix("1745")).toBeNull();
    expect(placeKey("Saint-Étienne")).toBe(placeKey("St Etienne"));
  });
});

describe("PAYS1 : lecture de geo.api.gouv.fr", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  const Probe = ({ active, city, cp }: { active: boolean; city: string; cp: string }) => {
    const m = useFrenchPlaceHint(active, city, cp);
    return <p data-testid="probe">{m ? `${m.postalCode} ${m.city}` : "rien"}</p>;
  };

  it("code inconnu, puis recherche du nom dans le département", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      const body = url.includes("codePostal=69000") ? [] : [{ nom: "Écully", codesPostaux: ["69130"] }];
      return { ok: true, json: async () => body };
    }));
    render(<Probe active city="Ecully" cp="69000" />);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("69130 Écully"), { timeout: 2000 });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("codeDepartement=69");
  });

  it("mode France ou service injoignable : rien", async () => {
    const f = vi.fn(async () => { throw new Error("down"); });
    vi.stubGlobal("fetch", f);
    const { rerender } = render(<Probe active={false} city="Rezé" cp="44400" />);
    await new Promise((r) => setTimeout(r, 500));
    expect(f).not.toHaveBeenCalled();
    rerender(<Probe active city="Rezé" cp="44400" />);
    await waitFor(() => expect(f).toHaveBeenCalled(), { timeout: 2000 });
    expect(screen.getByTestId("probe").textContent).toBe("rien");
  });
});

describe("PAYS1 : « Oui, je vis en France » repasse le formulaire en France", () => {
  it("le champ code postal français revient, avec la commune officielle", async () => {
    const Form = () => {
      const [country, setCountry] = useState("BE");
      const [city, setCity] = useState("Rezé");
      const [cp, setCp] = useState("44400");
      return (
        <>
          <PostalCodeCityFields city={city} postalCode={cp} country={country} onChange={(v) => {
            if (v.city !== undefined) setCity(v.city);
            if (v.postal_code !== undefined) setCp(v.postal_code);
            if (v.country !== undefined) setCountry(v.country ?? "");
          }} />
          <FrenchPlaceHint match={country !== "FR" ? { city: "Rezé", postalCode: "44400" } : null} onLiveInFrance={(m) => { setCountry("FR"); setCity(m.city); setCp(m.postalCode); }} />
          <p data-testid="state">{country}</p>
        </>
      );
    };
    render(<Form />);
    expect(screen.getByText("44400 Rezé est en France. Vous vivez en France ?")).toBeTruthy();
    expect(screen.queryByLabelText("Code postal")).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Oui, je vis en France" })); });
    expect(screen.getByTestId("state").textContent).toBe("FR");
    expect((screen.getByLabelText("Code postal") as HTMLInputElement).value).toBe("44400");
    expect((screen.getByLabelText("Ville") as HTMLInputElement).value).toBe("Rezé");
    expect(screen.queryByTestId("french-place-hint")).toBeNull();
  });

  it("les deux écrans d'arrivée portent le contrôle sous le code postal étranger", () => {
    for (const p of ["src/pages/arrival/ArriveeVous.tsx", "src/pages/arrival/ArriveeVousGardien.tsx"]) {
      const s = readFileSync(p, "utf8");
      expect(s).toContain('useFrenchPlaceHint(country !== "FR", city, postalCode)');
      expect(s.indexOf("<FrenchPlaceHint")).toBeGreaterThan(s.indexOf('id="arrival-postal-abroad"'));
      // Le hook passe avant le retour anticipé (règle des hooks).
      expect(s.indexOf("useFrenchPlaceHint(")).toBeLessThan(s.indexOf("if (!user || loading) return null;"));
    }
  });
});

describe("PAYS1 : écran Utilisateurs de l'admin", () => {
  it("département pour la France et l'outre-mer seulement", () => {
    expect(adminDeptLabel("05540", "BE")).toBe("·");
    expect(adminDeptLabel("69000", "BE")).toBe("·");
    expect(adminDeptLabel("69130", "FR")).not.toBe("·");
    expect(adminDeptLabel("69130", null)).toBe(adminDeptLabel("69130", "FR"));
    expect(adminDeptLabel("98714", "PF")).not.toBe("·");
    expect(FRENCH_COUNTRY_CODES).toContain("FR");
  });

  it("le filtre département se limite aux profils de France", () => {
    const s = readFileSync("src/pages/admin/AdminUsers.tsx", "utf8");
    expect(s).toContain('query = query.in("country", FRENCH_COUNTRY_CODES);');
    expect(s).toContain("adminDeptLabel(user.postal_code, user.country)");
    expect(s).toContain("adminDeptLabel(u.postal_code, u.country)");
  });

  it("textes sans tiret cadratin ni demi-cadratin", () => {
    for (const p of ["src/components/arrival/FrenchPlaceHint.tsx", "src/lib/frenchPlaceHint.ts", "src/hooks/useFrenchPlaceHint.ts"]) {
      expect(readFileSync(p, "utf8")).not.toMatch(/[—–]/);
    }
  });
});
