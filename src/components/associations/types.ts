/** Formes partagées par les pages publiques et l'admin des associations. */

export interface AssociationPhoto {
  url: string;
  source_page_url?: string | null;
  alt?: string | null;
  hosting: "external" | "storage";
  original_url?: string | null;
}

export interface AssociationKeyFigure {
  value?: string | null;
  label?: string | null;
  year?: number | string | null;
  source_url?: string | null;
}

export interface AssociationPressItem {
  media?: string | null;
  title?: string | null;
  date?: string | null;
  url?: string | null;
}

export interface AssociationNeedDetail {
  need?: string | null;
  detail?: string | null;
  url?: string | null;
}

export interface PublicAssociation {
  id: string;
  slug: string;
  name: string;
  association_type: string;
  city: string;
  postal_code: string | null;
  departement_code: string;
  departement_name: string;
  departement_slug: string | null;
  species: string[];
  description: string;
  needs: string[];
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  donation_url: string | null;
  adoption_url: string | null;
  volunteer_url: string | null;
  photos: AssociationPhoto[];
  photo_credit: string | null;
  photos_authorized: boolean;
  verified_at: string;
  updated_at: string;
  logo_url: string | null;
  tagline: string | null;
  founded_year: number | null;
  key_figures: AssociationKeyFigure[];
  press: AssociationPressItem[];
  needs_details: AssociationNeedDetail[];
  siren: string | null;
  legal_form: string | null;
}

export const PUBLIC_ASSOCIATION_COLUMNS =
  "id, slug, name, association_type, city, postal_code, departement_code, departement_name, departement_slug, species, description, needs, website_url, facebook_url, instagram_url, donation_url, adoption_url, volunteer_url, photos, photo_credit, photos_authorized, verified_at, updated_at, logo_url, tagline, founded_year, key_figures, press, needs_details, siren, legal_form";

export const normalizePhotos = (value: unknown): AssociationPhoto[] =>
  Array.isArray(value)
    ? (value as AssociationPhoto[]).filter((p) => p && typeof p.url === "string" && p.url.length > 0)
    : [];

/** Tableau JSON tolérant : une valeur non tableau devient une liste vide. */
export const normalizeJsonArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value.filter(Boolean) as T[]) : [];

