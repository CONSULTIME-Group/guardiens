/**
 * Lot G2 : un lieu étranger n'apparaît jamais en France. Constat du 26/10/2026
 * (comptes actifs) : 26 profils au pays étranger avec un département français
 * (Tübingen 72076 dans la Sarthe, Rio de Janeiro 13000 dans les
 * Bouches-du-Rhône), 9 profils au pays étranger avec un point en métropole,
 * des profils au pays France avec une ville étrangère (Casablanca 20220).
 * Un contrôle strict ville / code postal aurait écarté 57 vrais habitants
 * (Cherbourg 50100, Évian 74500, Lyon 69100).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cityMatchesCommunes,
  foreignPointDecision,
  isFrenchScopeCountry,
  isNearMetropolitanFrance,
} from "../../../supabase/functions/_shared/profile-geocode-rules";
import { communeNamesForPostal, pointIsInFrance } from "../../../supabase/functions/_shared/geocode-official-fr";
import { placeStatusMessage } from "@/lib/placeStatus";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
const profileRow: { place_status: string | null } = { place_status: null };
vi.mock("@/lib/myProfile", () => ({ fetchMyProfile: async () => ({ data: profileRow, error: null }) }));
import PlaceMismatchNotice from "@/components/profile/PlaceMismatchNotice";

const ok = (body: unknown) => (async () => ({ ok: true, json: async () => body })) as unknown as typeof fetch;

describe("règles de lieu (lot G2)", () => {
  it("périmètre français : France, vide et outre-mer", () => {
    for (const c of ["FR", "fr", "", null, "France", "PF", "GP", "RE", "NC"]) expect(isFrenchScopeCountry(c as string)).toBe(true);
    for (const c of ["BE", "DE", "ES", "BR", "MA", "GB"]) expect(isFrenchScopeCountry(c)).toBe(false);
  });
  it("commune du code postal : accents, St, arrondissements", () => {
    expect(cityMatchesCommunes("Ecully", ["Écully"])).toBe(true);
    expect(cityMatchesCommunes("St Didier au Mont d'Or", ["Saint-Didier-au-Mont-d'Or"])).toBe(true);
    expect(cityMatchesCommunes("Lyon 3e", ["Lyon"])).toBe(true);
    expect(cityMatchesCommunes("Paris 15", ["Paris"])).toBe(true);
    expect(cityMatchesCommunes("Marseille 13e arrondissement", ["Marseille"])).toBe(true);
    expect(cityMatchesCommunes("Casablanca", ["L'Île-Rousse", "Algajola"])).toBe(false);
    expect(cityMatchesCommunes("Lyonnais", ["Lyon"])).toBe(false);
  });
  it("pays étranger : seul un point dans une commune française est refusé", () => {
    expect(foreignPointDecision("BE", true)).toBe("reject");
    expect(foreignPointDecision("BE", false)).toBe("keep");
    expect(foreignPointDecision("BE", null)).toBe("keep");
    expect(foreignPointDecision("FR", true)).toBe("not_applicable");
    expect(foreignPointDecision("GP", true)).toBe("not_applicable");
  });
  it("le cadre large ne décide jamais seul : Tübingen, Bruxelles et Huesca y sont", () => {
    expect(isNearMetropolitanFrance(48.52, 9.05)).toBe(true);
    expect(isNearMetropolitanFrance(50.85, 4.35)).toBe(true);
    expect(isNearMetropolitanFrance(42.14, -0.41)).toBe(true);
    expect(isNearMetropolitanFrance(45.74, -70.69)).toBe(false);
  });
});

describe("base officielle des communes (lot G2)", () => {
  it("communes d'un code postal, code inconnu, service injoignable", async () => {
    await expect(communeNamesForPostal("50100", ok([{ nom: "Cherbourg-en-Cotentin" }]))).resolves.toEqual(["Cherbourg-en-Cotentin"]);
    await expect(communeNamesForPostal("75000", ok([]))).resolves.toEqual([]);
    await expect(communeNamesForPostal("50100", (async () => { throw new Error("down"); }) as unknown as typeof fetch)).resolves.toBeNull();
    await expect(communeNamesForPostal("1000", ok([{ nom: "x" }]))).resolves.toEqual([]);
  });
  it("point dans une commune française : oui, non, sans réponse", async () => {
    await expect(pointIsInFrance(47.17, -1.56, ok([{ nom: "Rezé" }]))).resolves.toBe(true);
    await expect(pointIsInFrance(48.52, 9.05, ok([]))).resolves.toBe(false);
    await expect(pointIsInFrance(48.52, 9.05, (async () => ({ ok: false, json: async () => [] })) as unknown as typeof fetch)).resolves.toBeNull();
  });
});

describe("bandeau du profil (lot G2)", () => {
  const mount = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PlaceMismatchNotice />
    </QueryClientProvider>,
  );
  it("textes sans tiret cadratin ni demi-cadratin", () => {
    for (const s of ["country_mismatch", "foreign_city"]) {
      const m = placeStatusMessage(s);
      expect(m).not.toBeNull();
      expect(`${m!.title} ${m!.body}`).not.toMatch(/[–—]/);
    }
    expect(placeStatusMessage(null)).toBeNull();
    expect(placeStatusMessage("autre")).toBeNull();
  });
  it("affiché seulement quand le lieu est incohérent", async () => {
    profileRow.place_status = "foreign_city";
    mount();
    expect(await screen.findByTestId("place-mismatch-notice")).toHaveTextContent("Votre ville ne correspond pas");
  });
  it("rien sans incohérence", async () => {
    profileRow.place_status = null;
    const { container } = mount();
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[data-testid="place-mismatch-notice"]')).toBeNull();
  });
});

describe("branchements (lot G2)", () => {
  const sql = readFileSync("drizzle/migrations/0109_g2_lieux_etrangers.sql", "utf8");
  const fn = readFileSync("supabase/functions/geocode-profile/index.ts", "utf8");
  const fields = readFileSync("src/components/profile/PostalCodeCityFields.tsx", "utf8");
  it("département seulement pour la France, outre-mer en 97x ou 98x, trigger sur le pays", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.profile_departement_code(p_postal text, p_country text)");
    expect(sql).toContain("BEFORE INSERT OR UPDATE OF postal_code, country ON public.profiles");
    expect(sql).toMatch(/IF v_code !~ '\^9\[78\]' THEN\s+RETURN NULL;/);
  });
  it("aucune décision par le seul cadre : la migration rappelle geocode-profile", () => {
    expect(sql).not.toMatch(/SET latitude = NULL/);
    expect(sql).toContain("functions/v1/geocode-profile");
  });
  it("geocode-profile interroge la base officielle avant de retirer un point", () => {
    expect(fn).toContain("pointIsInFrance(");
    expect(fn).toContain('"country_mismatch"');
    expect(fn).toContain('"foreign_city"');
    expect(fn).toContain('.is("place_status", null)');
  });
  it("« Je vis à l'étranger » efface le point posé par le code postal", () => {
    expect(fields).toMatch(/postal_code: "", country: [^\n]*latitude: null, longitude: null/);
  });
});

describe("propagation aux annonces (lot G2 bis)", () => {
  it("le département recalculé suit sur les annonces au changement de code postal ou de pays", () => {
    const sql = readFileSync("drizzle/migrations/0110_g2b_propagation_departement.sql", "utf8");
    expect(sql).toContain("AFTER UPDATE OF postal_code, country, departement_code ON public.profiles");
  });
});
