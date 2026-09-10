/** Formes partagées par les pages publiques et l'admin des associations. */

export interface AssociationPhoto {
  url: string;
  source_page_url?: string | null;
  alt?: string | null;
  hosting: "external" | "storage";
  original_url?: string | null;
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
}

export const PUBLIC_ASSOCIATION_COLUMNS =
  "id, slug, name, association_type, city, postal_code, departement_code, departement_name, departement_slug, species, description, needs, website_url, facebook_url, instagram_url, donation_url, adoption_url, volunteer_url, photos, photo_credit, photos_authorized, verified_at, updated_at";

export const normalizePhotos = (value: unknown): AssociationPhoto[] =>
  Array.isArray(value)
    ? (value as AssociationPhoto[]).filter((p) => p && typeof p.url === "string" && p.url.length > 0)
    : [];
