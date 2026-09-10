CREATE TABLE public.animal_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  association_type text NOT NULL CHECK (association_type IN ('refuge','sanctuaire','familles_accueil','faune_sauvage','autre')),
  city text NOT NULL,
  postal_code text,
  departement_code text NOT NULL REFERENCES public.departements(code),
  species text[] NOT NULL DEFAULT '{}'::text[]
    CHECK (species <@ ARRAY['chiens','chats','equides','animaux_de_ferme','nac','oiseaux','faune_sauvage']::text[]),
  description text NOT NULL,
  needs text[] NOT NULL DEFAULT '{}'::text[]
    CHECK (needs <@ ARRAY['benevoles','familles_accueil','dons','materiel']::text[]),
  siren text,
  rna text,
  legal_form text,
  website_url text,
  facebook_url text,
  instagram_url text,
  donation_url text,
  adoption_url text,
  volunteer_url text,
  contact_email text,
  contact_page_url text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_credit text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  consent_status text NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending','requested','granted','refused')),
  consent_requested_at timestamptz,
  consent_granted_at timestamptz,
  consent_note text,
  verified_at date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.animal_associations TO authenticated;
GRANT ALL ON public.animal_associations TO service_role;

ALTER TABLE public.animal_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage animal associations"
ON public.animal_associations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_animal_associations_updated_at
BEFORE UPDATE ON public.animal_associations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_animal_associations_dept ON public.animal_associations (departement_code) WHERE status = 'published';
CREATE INDEX idx_animal_associations_status ON public.animal_associations (status);

CREATE VIEW public.public_animal_associations AS
SELECT
  a.id,
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
  CASE WHEN a.consent_status = 'refused' THEN '[]'::jsonb ELSE a.photos END AS photos,
  a.photo_credit,
  (a.consent_status = 'granted') AS photos_authorized,
  a.verified_at,
  a.updated_at
FROM public.animal_associations a
JOIN public.departements d ON d.code = a.departement_code
LEFT JOIN public.seo_department_pages sdp
  ON lower(sdp.department) = lower(d.nom) AND sdp.published = true
WHERE a.status = 'published';

GRANT SELECT ON public.public_animal_associations TO anon, authenticated;
