ALTER TABLE public.animal_associations
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS founded_year int,
  ADD COLUMN IF NOT EXISTS key_figures jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS press jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS needs_details jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.animal_associations
  DROP CONSTRAINT IF EXISTS animal_associations_tagline_len;
ALTER TABLE public.animal_associations
  ADD CONSTRAINT animal_associations_tagline_len CHECK (tagline IS NULL OR char_length(tagline) <= 120);

COMMENT ON COLUMN public.animal_associations.key_figures IS 'Tableau JSON [{value, label, year, source_url}]';
COMMENT ON COLUMN public.animal_associations.press IS 'Tableau JSON [{media, title, date, url}], date AAAA-MM-JJ facultative';
COMMENT ON COLUMN public.animal_associations.needs_details IS 'Tableau JSON [{need, detail, url}], need parmi benevoles, familles_accueil, dons, materiel, autre';

CREATE OR REPLACE VIEW public.public_animal_associations AS
SELECT a.id,
    a.slug,
    a.name,
    a.association_type,
    a.city,
    a.postal_code,
    a.departement_code,
    d.nom AS departement_name,
    sdp.slug AS departement_slug,
    a.species,
    a.description,
    a.needs,
    a.website_url,
    a.facebook_url,
    a.instagram_url,
    a.donation_url,
    a.adoption_url,
    a.volunteer_url,
        CASE
            WHEN a.consent_status = 'refused'::text THEN '[]'::jsonb
            ELSE a.photos
        END AS photos,
    a.photo_credit,
    a.consent_status = 'granted'::text AS photos_authorized,
    a.verified_at,
    a.updated_at,
    a.logo_url,
    a.tagline,
    a.founded_year,
    a.key_figures,
    a.press,
    a.needs_details,
    a.siren,
    a.legal_form
   FROM public.animal_associations a
     JOIN public.departements d ON d.code = a.departement_code
     LEFT JOIN public.seo_department_pages sdp ON lower(sdp.department) = lower(d.nom) AND sdp.published = true
  WHERE a.status = 'published'::text;

GRANT SELECT ON public.public_animal_associations TO anon, authenticated;