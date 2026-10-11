CREATE OR REPLACE VIEW public.public_helpers AS
 SELECT p.id,
    p.first_name,
    p.avatar_url,
    p.city,
    (round((p.latitude)::numeric, 2))::double precision AS latitude_approx,
    (round((p.longitude)::numeric, 2))::double precision AS longitude_approx,
    p.helps_with,
    (array_cat(COALESCE(op.competences, '{}'::text[]), COALESCE(sp.competences, '{}'::text[])))[1:8] AS competences,
    ((p.last_seen_at AT TIME ZONE 'Europe/Paris'))::date AS last_active_on
   FROM public.profiles p
     LEFT JOIN public.sitter_profiles sp ON sp.user_id = p.id
     LEFT JOIN public.owner_profiles op ON op.user_id = p.id
  WHERE ((p.account_status = 'active'::text) AND (p.available_for_help = true) AND (p.first_name IS NOT NULL) AND (btrim(p.first_name) <> ''::text) AND (p.latitude IS NOT NULL) AND (p.longitude IS NOT NULL));

DO $migration$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.public_helpers;
  RAISE NOTICE 'Lot E3 : % personnes dans public_helpers', v_count;
  IF EXISTS (SELECT 1 FROM public.public_helpers GROUP BY id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Lot E3 : doublon dans public_helpers';
  END IF;
END;
$migration$;