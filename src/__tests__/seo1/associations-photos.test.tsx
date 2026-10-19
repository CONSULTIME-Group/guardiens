/**
 * Lot SEO1 (19/10/2026) : photos et logo d'une association affichés seulement
 * avec son accord (photos_authorized), initiales sinon, chargés avec la
 * politique de référent par défaut.
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
  it("sans accord : aucune photo, aucun logo", () => {
    expect(associationMedia({ ...base, photos_authorized: false })).toEqual({ photos: [], logoUrl: null });
    expect(associationMedia({ ...base, photos_authorized: null })).toEqual({ photos: [], logoUrl: null });
    expect(associationMedia(null)).toEqual({ photos: [], logoUrl: null });
  });
  it("avec accord : photos et logo", () => {
    const m = associationMedia({ ...base, photos_authorized: true });
    expect(m.photos).toHaveLength(1);
    expect(m.logoUrl).toBe(base.logo_url);
  });
});

describe("rendu public", () => {
  const renderHighlight = (photos_authorized: boolean) =>
    render(
      <MemoryRouter>
        <AssociationNeedsHighlight associations={[{ ...base, photos_authorized }]} />
      </MemoryRouter>,
    );

  it("sans accord : initiales, aucune image", () => {
    const { container, getByText } = renderHighlight(false);
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("RD")).toBeTruthy();
  });

  it("avec accord : logo chargé sans referrerpolicy", () => {
    const { container } = renderHighlight(true);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(base.logo_url);
    expect(img.hasAttribute("referrerpolicy")).toBe(false);
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

describe("vue public_animal_associations : migration préparée, non appliquée", () => {
  const path = "supabase/prepared-migrations/20261019122000_seo1_associations_photos_accord.sql";
  const sql = read(path);
  it("photos et logo servis seulement avec accord", () => {
    expect(sql).toMatch(/WHEN a\.consent_status = 'granted'::text THEN a\.photos\s+ELSE '\[\]'::jsonb/);
    expect(sql).toMatch(/WHEN a\.consent_status = 'granted'::text THEN a\.logo_url\s+ELSE NULL::text/);
    expect(sql).toContain("a.consent_status = 'granted'::text AS photos_authorized");
    expect(sql).toMatch(/^BEGIN;$/m);
  });
  it("aucun fichier drizzle ne l'applique", () => {
    expect(read("drizzle/migrations/meta/_journal.json")).not.toContain("seo1");
  });
});
