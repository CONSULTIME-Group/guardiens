-- Lot 2 mobilité géographique : zones où le gardien accepte de se déplacer.
-- NULL = non renseignée (anciens profils), jamais un opt-in implicite.
CREATE OR REPLACE FUNCTION public.valid_travel_zones(z text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT z IS NULL OR (
    cardinality(z) BETWEEN 1 AND 40
    AND NOT EXISTS (
      SELECT 1 FROM unnest(z) t
      WHERE t IS NULL OR t !~ '^(local|world|country:[A-Z]{2}|continent:(AF|AS|EU|NA|OC|SA)|region:FR-[A-Z]{3})$'
    )
  )
$$;

ALTER TABLE public.sitter_profiles ADD COLUMN IF NOT EXISTS travel_zones text[] DEFAULT NULL;
ALTER TABLE public.sitter_profiles ADD CONSTRAINT sitter_profiles_travel_zones_valid CHECK (public.valid_travel_zones(travel_zones));
COMMENT ON COLUMN public.sitter_profiles.travel_zones IS
  'Zones de déplacement déclarées : local, region:FR-XXX, country:XX (ISO 3166-1), continent:AF|AS|EU|NA|OC|SA, world. NULL = non renseignée.';

CREATE OR REPLACE VIEW public.public_sitter_profiles AS
 SELECT s.user_id, s.motivation, s.sitter_type, s.accompanied_by, s.lifestyle, s.animal_types,
    s.has_vehicle, s.has_license, s.geographic_radius, s.min_stay_duration, s.is_available,
    s.competences, s.special_animal_skills, s.preferred_frequency, s.min_notice,
    s.preferred_environments, s.farm_animals_ok, s.own_animals, s.reply_median_minutes,
    s.travels_with_children, s.travels_with_own_animals, s.work_during_sit, s.availability_during,
    s.experience_years, s.languages, s.interests, s.life_pace, s.meeting_preference,
    s.travel_zones
   FROM sitter_profiles s
     JOIN profiles p ON p.id = s.user_id
  WHERE p.profile_completion >= 40;

-- « Peuvent venir ici » : résidents du pays de destination OU gardiens dont
-- une zone déclarée couvre la destination (jetons fournis par le client).
-- Même population que search_sitter_pool, coordonnées approximées.
CREATE OR REPLACE FUNCTION public.search_sitter_pool_mobile(p_country text, p_tokens text[])
RETURNS TABLE(
  user_id uuid, country text, first_name text, avatar_url text, city text,
  postal_code text, profile_completion integer, identity_verified boolean,
  completed_sits_count integer, bio text, last_seen_at timestamptz,
  latitude_approx double precision, longitude_approx double precision,
  animal_types text[], has_vehicle boolean, is_available boolean,
  reply_median_minutes integer, sitter_type text, travels_with_children boolean,
  travels_with_own_animals boolean, competences text[], special_animal_skills text[],
  interests text[], experience_years text, travel_zones text[], geographic_radius integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT v.user_id, upper(trim(p.country)), pp.first_name, pp.avatar_url, pp.city,
    pp.postal_code, pp.profile_completion, pp.identity_verified,
    pp.completed_sits_count, pp.bio, pp.last_seen_at,
    pp.latitude_approx, pp.longitude_approx,
    v.animal_types, v.has_vehicle, v.is_available, v.reply_median_minutes,
    v.sitter_type, v.travels_with_children, v.travels_with_own_animals,
    v.competences, v.special_animal_skills, v.interests, v.experience_years,
    v.travel_zones, v.geographic_radius
  FROM public.public_sitter_profiles v
  JOIN public.public_profiles pp ON pp.id = v.user_id
  JOIN public.profiles p ON p.id = v.user_id
  WHERE v.user_id IS DISTINCT FROM auth.uid()
    AND p_country IS NOT NULL
    AND (upper(trim(p.country)) = upper(trim(p_country))
         OR (v.travel_zones IS NOT NULL AND v.travel_zones && coalesce(p_tokens, '{}'::text[])))
  ORDER BY v.user_id
$$;

REVOKE ALL ON FUNCTION public.search_sitter_pool_mobile(text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_sitter_pool_mobile(text, text[]) TO anon, authenticated, service_role;