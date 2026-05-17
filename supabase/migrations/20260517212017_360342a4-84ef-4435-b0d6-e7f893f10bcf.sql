-- Étend public_profiles avec des coordonnées arrondies à 2 décimales
-- (~1,1 km de précision). Suffisant pour trier par distance sur des
-- rayons de 30-100 km, insuffisant pour géolocaliser une adresse précise.
-- Les coords brutes (profiles.latitude/longitude) restent privées (RLS).
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  first_name,
  city,
  avatar_url,
  bio,
  completed_sits_count,
  identity_verified,
  is_founder,
  postal_code,
  ROUND(latitude::numeric, 2)::double precision  AS latitude_approx,
  ROUND(longitude::numeric, 2)::double precision AS longitude_approx
FROM public.profiles
WHERE account_status = 'active'::text;