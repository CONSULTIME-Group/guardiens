-- Lot ASSO-1 (15/11/2026) : retour à la règle du 10/09/2026 pour les images des
-- associations, décision de Jérémie du 15/11/2026 (option B : « retour au 10/09,
-- logos et photos »). Repère : asso1_logos_photos_retour. Rejouable.
--
-- Le lot SEO1 (0095, 19/10/2026) servait photos et logo seulement avec un
-- accord reçu. Aucun accord n'est arrivé en 66 jours (11 fiches publiées,
-- 9 « requested », 2 « pending », 0 « granted ») : la liste et les fiches
-- n'affichaient que des initiales.
--
-- Règle rétablie : photos et logo sont servis tant que l'association n'a pas
-- refusé. Un refus (consent_status = 'refused') vide photos et logo
-- immédiatement. photos_authorized garde son sens (accord reçu : « granted »),
-- il pilote le badge « Fiche validée par l'association », le crédit des photos
-- et l'image de partage. Seules les expressions photos et logo_url changent ;
-- colonnes, ordre, jointures, filtre et droits sont ceux de pg_get_viewdef de
-- production du 15/11/2026.
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
        CASE
            WHEN a.consent_status = 'refused'::text THEN NULL::text
            ELSE a.logo_url
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

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.public_animal_associations FROM anon, authenticated;
