-- Lot SEO1 (19/10/2026) : la vue publique des associations sert les photos et
-- le logo seulement quand l'association a donné son accord.
--
-- PRÉPARÉ, NON APPLIQUÉ. Lovable crée le fichier drizzle à l'application.
--
-- Constat (base de production, lecture seule, 19/10/2026) : 11 associations
-- publiées, 39 photos et 10 logos hébergés sur les sites des associations,
-- consent_status « requested » (9) ou « pending » (2), 0 « granted ». La vue
-- vidait les photos seulement sur un refus explicite (« refused ») : elle sert
-- donc aujourd'hui les 39 URL à anon et authenticated.
--
-- Après application : photos = '[]' et logo_url = NULL tant que
-- consent_status <> 'granted'. Le site applique déjà la même règle à
-- l'affichage (src/lib/associationMedia.ts, initiales à la place).
-- Seules les deux expressions photos et logo_url changent ; colonnes, ordre,
-- jointures, filtre et droits sont ceux de pg_get_viewdef du 19/10/2026.
BEGIN;

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
            WHEN a.consent_status = 'granted'::text THEN a.photos
            ELSE '[]'::jsonb
        END AS photos,
    a.photo_credit,
    a.consent_status = 'granted'::text AS photos_authorized,
    a.verified_at,
    a.updated_at,
        CASE
            WHEN a.consent_status = 'granted'::text THEN a.logo_url
            ELSE NULL::text
        END AS logo_url,
    a.tagline,
    a.founded_year,
    a.key_figures,
    a.press,
    a.needs_details,
    a.siren,
    a.legal_form
   FROM animal_associations a
     JOIN departements d ON d.code = a.departement_code
     LEFT JOIN seo_department_pages sdp ON lower(sdp.department) = lower(d.nom) AND sdp.published = true
  WHERE a.status = 'published'::text;

COMMIT;

-- Recette après application (lecture seule) :
-- SELECT count(*) FILTER (WHERE jsonb_array_length(photos) > 0 AND NOT photos_authorized) AS photos_sans_accord,
--        count(*) FILTER (WHERE logo_url IS NOT NULL AND NOT photos_authorized) AS logos_sans_accord
--   FROM public.public_animal_associations;   -> 0, 0
