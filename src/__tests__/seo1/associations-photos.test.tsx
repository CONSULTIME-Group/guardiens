/**
 * Lot SEO1 (19/10/2026), règle remplacée par le lot ASSO-1 (15/11/2026, retour
 * au 10/09 voulu par Jérémie) : photos et logo d'une association s'affichent
 * tant qu'elle n'a pas refusé (la vue publique les vide sur un refus), initiales
 * seulement quand aucun logo n'existe, chargés avec la politique de référent
 * par défaut.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { associationMedia } from "@/lib/associationMedia";
import AssociationNeedsHighlight from "@/components/associations/AssociationNeedsHighlight";
import type { PublicAssociation } from "@/components/associations/types";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const photo = { url: "https://asso.example/photo.jpg", hosting: "external" as const };
const base = {
  id: "a1", slug: "refuge", name: "Refuge des Collines", association_type: "refuge", city: "Lyon",
  postal_code: "69001", departement_code: "69", departement_name: "Rhône", departement_slug: "rhone",
  species: [], description: "", needs: ["benevoles"], website_url: null, facebook_url: null,
  instagram_url: null, donation_url: null, adoption_url: null, volunteer_url: null,
  photos: [photo], photo_credit: "Refuge", verified_at: "2026-10-01", updated_at: "2026-10-01",
  logo_url: "https://asso.example/logo.png", tagline: null, founded_year: null, key_figures: [],
  press: [], needs_details: [{ need: "benevoles", detail: "Deux bénévoles le samedi" }], siren: null, legal_form: null,
} satisfies Omit<PublicAssociation, "photos_authorized">;

describe("associationMedia", () => {
  it("sans accord reçu : photos et logo servis par la vue sont affichés", () => {
    const m = associationMedia({ ...base, photos_authorized: false });
    expect(m.photos).toHaveLength(1);
    expect(m.logoUrl).toBe(base.logo_url);
    expect(associationMedia({ ...base, photos_authorized: null }).logoUrl).toBe(base.logo_url);
  });
  it("avec accord : photos et logo", () => {
    const m = associationMedia({ ...base, photos_authorized: true });
    expect(m.photos).toHaveLength(1);
    expect(m.logoUrl).toBe(base.logo_url);
  });
  it("refus (la vue sert photos vides et logo nul) : rien à afficher", () => {
    expect(associationMedia({ ...base, photos: [], logo_url: null, photos_authorized: false })).toEqual({ photos: [], logoUrl: null });
    expect(associationMedia(null)).toEqual({ photos: [], logoUrl: null });
  });
});

describe("rendu public", () => {
  const renderHighlight = (photos_authorized: boolean) =>
    render(
      <MemoryRouter>
        <AssociationNeedsHighlight associations={[{ ...base, photos_authorized }]} />
      </MemoryRouter>,
    );

  it("sans accord reçu : le logo s'affiche, sans referrerpolicy", () => {
    const { container } = renderHighlight(false);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(base.logo_url);
    expect(img.hasAttribute("referrerpolicy")).toBe(false);
  });

  it("avec accord : logo chargé sans referrerpolicy", () => {
    const { container } = renderHighlight(true);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(base.logo_url);
    expect(img.hasAttribute("referrerpolicy")).toBe(false);
  });

  it("sans logo connu : initiales, aucune image", () => {
    const { container, getByText } = render(
      <MemoryRouter>
        <AssociationNeedsHighlight associations={[{ ...base, logo_url: null, photos_authorized: false }]} />
      </MemoryRouter>,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("RD")).toBeTruthy();
  });

  it("aucun rendu public d'association ne pose referrerPolicy ni ne lit photos ou logo sans passer par l'accord", () => {
    for (const f of ["src/pages/AssociationDetail.tsx", "src/pages/AssociationsListing.tsx", "src/components/associations/AssociationNeedsHighlight.tsx"]) {
      const src = read(f);
      expect(src, f).not.toContain("referrerPolicy");
      expect(src, f).toContain("associationMedia(");
      expect(src, f).not.toMatch(/normalizePhotos\((data|association)\??\.photos\)/);
      expect(src, f).not.toMatch(/src=\{(data|association)\.logo_url\}/);
    }
  });
});

describe("vue public_animal_associations : règle du refus (lot ASSO-1)", () => {
  const sql = read("drizzle/migrations/0164_asso1_logos_photos_retour.sql");
  it("photos et logo servis sauf refus", () => {
    expect(sql).toMatch(/WHEN a\.consent_status = 'refused'::text THEN '\[\]'::jsonb\s+ELSE a\.photos/);
    expect(sql).toMatch(/WHEN a\.consent_status = 'refused'::text THEN NULL::text\s+ELSE a\.logo_url/);
  });
  it("photos_authorized garde le sens « accord reçu »", () => {
    expect(sql).toContain("a.consent_status = 'granted'::text AS photos_authorized");
  });
  it("0095 reste le fichier d'origine de SEO1, 0164 le remplace", () => {
    expect(read("drizzle/migrations/0095_seo1_rendu_et_associations.sql")).toContain("WHEN a.consent_status = 'granted'::text THEN a.logo_url");
    expect(read("scripts/db/production-contracts.json")).toContain("0164_asso1_logos_photos_retour.sql");
  });
});
