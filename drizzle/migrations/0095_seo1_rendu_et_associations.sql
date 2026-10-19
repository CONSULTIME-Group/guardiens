-- Lot SEO1 (19/10/2026, arène « espace admin ») : schéma appliqué en production.
-- Reprend supabase/prepared-migrations/20261019120000_seo1_reserve_render_refus_exclus.sql
-- et 20261019122000_seo1_associations_photos_accord.sql, sans leurs BEGIN et COMMIT.

-- Lot SEO1 (19/10/2026) : les refus « monthly_budget_exceeded » sortent du
-- compte des 30 jours du consommateur de pré-rendu.
--
-- PRÉPARÉ, NON APPLIQUÉ. Lovable crée le fichier drizzle à l'application.
--
-- Constat (base de production, lecture seule, 19/10/2026) : sur 30 jours,
-- prerender_recache_log compte 19 659 lignes, dont 579 refus du détecteur
-- (source deploy-detector, ok = false, detail « monthly_budget_exceeded, ... »)
-- écrits depuis le 13/10 (jusqu'à 144 par jour) et 1 échec du consommateur.
-- Ces lignes ne consomment aucun rendu Prerender mais entraient dans le compte
-- `used` de seo_reserve_render, ce qui repoussait la reprise d'environ un jour.
--
-- Seule différence avec la définition en production (pg_get_functiondef du
-- 19/10/2026) : `AND ok` dans le calcul de `used`. Le compteur informatif
-- seo_render_budget.attempts garde sa définition. Même filtre côté détecteur :
-- supabase/functions/detect-deploy-and-mark-dirty/index.ts (deux lectures).

CREATE OR REPLACE FUNCTION public.seo_reserve_render(p_holder uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  m date := date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')::date;
  used integer;
BEGIN
  UPDATE public.seo_consumer_lease SET expires_at=clock_timestamp()+interval '5 minutes'
   WHERE singleton AND holder=p_holder AND expires_at>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'SEO consumer lease expired'; END IF;
  -- Lot SEO1 : seuls les rendus réussis comptent, les refus (ok = false) sortent du compte.
  SELECT count(*)::integer INTO used FROM public.prerender_recache_log
   WHERE created_at > clock_timestamp() - interval '30 days' AND ok;
  IF used >= 9900 THEN RETURN false; END IF;
  INSERT INTO public.seo_render_budget(month,attempts)
  SELECT m,count(*)::integer FROM public.prerender_recache_log
   WHERE created_at>=m::timestamp AT TIME ZONE 'UTC'
  ON CONFLICT(month) DO NOTHING;
  UPDATE public.seo_render_budget SET attempts=attempts+1 WHERE month=m;
  RETURN true;
END $function$;

-- Droits inchangés : la fonction reste réservée au rôle de service.
REVOKE ALL ON FUNCTION public.seo_reserve_render(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seo_reserve_render(uuid) TO service_role;


-- Contrôle après application (lecture seule) :
-- SELECT pg_get_functiondef('public.seo_reserve_render(uuid)'::regprocedure) ~ 'interval ''30 days'' AND ok';
-- SELECT count(*) FILTER (WHERE ok) AS rendus_comptes, count(*) FILTER (WHERE NOT ok) AS refus_hors_compte
--   FROM public.prerender_recache_log WHERE created_at > now() - interval '30 days';

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


-- Recette après application (lecture seule) :
-- SELECT count(*) FILTER (WHERE jsonb_array_length(photos) > 0 AND NOT photos_authorized) AS photos_sans_accord,
--        count(*) FILTER (WHERE logo_url IS NOT NULL AND NOT photos_authorized) AS logos_sans_accord
--   FROM public.public_animal_associations;   -> 0, 0
