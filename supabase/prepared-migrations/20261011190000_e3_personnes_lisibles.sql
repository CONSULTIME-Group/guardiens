-- Lot E3 (11/10/2026) : personnes lisibles sur la page Entraide.
-- Plan : claude/plan-lots-entraide-et-notifications-push-11-octobre-2026.md.
--
-- public_helpers gagne deux colonnes, ajoutées en fin de vue (les colonnes
-- existantes ne bougent pas, les droits anon et authenticated sont gardés) :
-- - competences : savoir-faire du profil propriétaire (choisis pour l'entraide)
--   puis du profil gardien, 8 au plus (la carte en montre 4). Déjà publics par public_sitter_profiles
--   et public_owner_profiles.
-- - last_active_on : jour de la dernière activité (heure de Paris), moins
--   précis que public_profiles.last_seen_at, déjà public.
-- Aucune ligne ajoutée ni retirée : même filtre qu'avant.

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
