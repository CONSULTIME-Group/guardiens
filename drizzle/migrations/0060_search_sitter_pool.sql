-- Lot 1 recherche internationale : vivier complet des gardiens consultables,
-- filtre pays appliqué côté serveur AVANT toute pagination. Même population
-- que public_sitter_profiles x public_profiles (compte actif, prénom,
-- complétion >= 40), coordonnées approximées seulement (2 décimales).
CREATE OR REPLACE FUNCTION public.search_sitter_pool(p_country text DEFAULT NULL)
RETURNS TABLE(
  user_id uuid, country text, first_name text, avatar_url text, city text,
  postal_code text, profile_completion integer, identity_verified boolean,
  completed_sits_count integer, bio text, last_seen_at timestamptz,
  latitude_approx double precision, longitude_approx double precision,
  animal_types text[], has_vehicle boolean, is_available boolean,
  reply_median_minutes integer, sitter_type text, travels_with_children boolean,
  travels_with_own_animals boolean, competences text[], special_animal_skills text[],
  interests text[], experience_years text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT v.user_id, upper(trim(p.country)), pp.first_name, pp.avatar_url, pp.city,
    pp.postal_code, pp.profile_completion, pp.identity_verified,
    pp.completed_sits_count, pp.bio, pp.last_seen_at,
    pp.latitude_approx, pp.longitude_approx,
    v.animal_types, v.has_vehicle, v.is_available, v.reply_median_minutes,
    v.sitter_type, v.travels_with_children, v.travels_with_own_animals,
    v.competences, v.special_animal_skills, v.interests, v.experience_years
  FROM public.public_sitter_profiles v
  JOIN public.public_profiles pp ON pp.id = v.user_id
  JOIN public.profiles p ON p.id = v.user_id
  WHERE v.user_id IS DISTINCT FROM auth.uid()
    AND (p_country IS NULL OR upper(trim(p.country)) = upper(trim(p_country)))
  ORDER BY v.user_id
$$;

-- Comptes par pays sur exactement la même population que search_sitter_pool.
CREATE OR REPLACE FUNCTION public.search_sitter_country_counts()
RETURNS TABLE(country text, sitters integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT upper(trim(p.country)), count(*)::int
  FROM public.public_sitter_profiles v
  JOIN public.public_profiles pp ON pp.id = v.user_id
  JOIN public.profiles p ON p.id = v.user_id
  WHERE v.user_id IS DISTINCT FROM auth.uid()
    AND p.country IS NOT NULL AND trim(p.country) <> ''
  GROUP BY 1
  ORDER BY 2 DESC, 1
$$;

REVOKE ALL ON FUNCTION public.search_sitter_pool(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_sitter_country_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_sitter_pool(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_sitter_country_counts() TO anon, authenticated, service_role;