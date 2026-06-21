CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_score integer := 0;
  v_first_name text;
  v_postal_code text;
  v_city text;
  v_country text;
  v_avatar text;
  v_bio text;
  v_identity_verified boolean;
  v_has_competences boolean;
  v_has_lifestyle boolean;
  v_has_sitter_gallery boolean;
  v_has_pet boolean;
  v_has_property_desc boolean;
  v_has_radius boolean;
  v_has_owner_gallery boolean;
  v_has_owner_competences boolean;
  v_location_ok boolean;
  v_affinity_count integer := 0;
  v_affinity_score integer := 0;
  v_interests text[];
  v_languages text[];
  v_life_pace text;
  v_animal_types text[];
  v_home_ambiance text[];
  v_preferred_sitter_types text[];
BEGIN
  SELECT role, first_name, postal_code, city, country, avatar_url, bio, identity_verified
  INTO v_role, v_first_name, v_postal_code, v_city, v_country, v_avatar, v_bio, v_identity_verified
  FROM public.profiles WHERE id = p_user_id;

  IF v_role IS NULL THEN RETURN 0; END IF;

  v_location_ok := (
    v_first_name IS NOT NULL AND v_first_name != '' AND (
      (COALESCE(v_country, 'FR') = 'FR' AND v_postal_code IS NOT NULL AND v_postal_code != '')
      OR (COALESCE(v_country, 'FR') != 'FR' AND v_city IS NOT NULL AND v_city != '')
    )
  );

  IF v_role = 'owner' THEN
    IF v_location_ok THEN v_score := v_score + 10; END IF;
    IF v_avatar IS NOT NULL AND v_avatar != '' THEN v_score := v_score + 10; END IF;
    IF v_bio IS NOT NULL AND length(v_bio) >= 50 THEN v_score := v_score + 10; END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.owner_profiles
      WHERE user_id = p_user_id AND competences IS NOT NULL AND array_length(competences, 1) > 0
    ) INTO v_has_owner_competences;
    IF v_has_owner_competences THEN v_score := v_score + 10; END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.pets p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE pr.user_id = p_user_id
    ) INTO v_has_pet;
    IF v_has_pet THEN v_score := v_score + 20; END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.properties
      WHERE user_id = p_user_id AND description IS NOT NULL AND length(description) >= 50
    ) INTO v_has_property_desc;
    IF v_has_property_desc THEN v_score := v_score + 10; END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.owner_gallery WHERE user_id = p_user_id
    ) INTO v_has_owner_gallery;
    IF v_has_owner_gallery THEN v_score := v_score + 15; END IF;
    IF v_identity_verified THEN v_score := v_score + 5; END IF;

    -- Affinité (10%) : interests >=3, langues, rythme de vie, ambiance foyer, profil idéal
    SELECT interests, languages, life_pace, home_ambiance, preferred_sitter_types
      INTO v_interests, v_languages, v_life_pace, v_home_ambiance, v_preferred_sitter_types
      FROM public.owner_profiles WHERE user_id = p_user_id;
    v_affinity_count := 0;
    IF v_interests IS NOT NULL AND array_length(v_interests, 1) >= 3 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_languages IS NOT NULL AND array_length(v_languages, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_life_pace IS NOT NULL AND v_life_pace != '' THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_home_ambiance IS NOT NULL AND array_length(v_home_ambiance, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_preferred_sitter_types IS NOT NULL AND array_length(v_preferred_sitter_types, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;

  ELSE
    IF v_location_ok THEN v_score := v_score + 15; END IF;
    IF v_avatar IS NOT NULL AND v_avatar != '' THEN v_score := v_score + 15; END IF;
    IF v_bio IS NOT NULL AND length(v_bio) >= 50 THEN v_score := v_score + 10; END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND competences IS NOT NULL AND array_length(competences, 1) > 0
    ) INTO v_has_competences;
    IF v_has_competences THEN v_score := v_score + 15; END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND lifestyle IS NOT NULL AND array_length(lifestyle, 1) > 0
    ) INTO v_has_lifestyle;
    IF v_has_lifestyle THEN v_score := v_score + 10; END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND geographic_radius IS NOT NULL AND geographic_radius > 0
    ) INTO v_has_radius;
    IF v_has_radius THEN v_score := v_score + 15; END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_gallery WHERE user_id = p_user_id
    ) INTO v_has_sitter_gallery;
    IF v_has_sitter_gallery THEN v_score := v_score + 5; END IF;
    IF v_identity_verified THEN v_score := v_score + 5; END IF;

    -- Affinité (10%) : interests >=3, langues, rythme de vie, animaux
    SELECT interests, languages, life_pace, animal_types
      INTO v_interests, v_languages, v_life_pace, v_animal_types
      FROM public.sitter_profiles WHERE user_id = p_user_id;
    v_affinity_count := 0;
    IF v_interests IS NOT NULL AND array_length(v_interests, 1) >= 3 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_languages IS NOT NULL AND array_length(v_languages, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_life_pace IS NOT NULL AND v_life_pace != '' THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_animal_types IS NOT NULL AND array_length(v_animal_types, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
  END IF;

  -- Barème commun : 0=0, 1=3, 2=6, >=3=10
  IF v_affinity_count >= 3 THEN v_affinity_score := 10;
  ELSIF v_affinity_count = 2 THEN v_affinity_score := 6;
  ELSIF v_affinity_count = 1 THEN v_affinity_score := 3;
  ELSE v_affinity_score := 0; END IF;
  v_score := v_score + v_affinity_score;

  UPDATE public.profiles SET profile_completion = v_score WHERE id = p_user_id;

  RETURN v_score;
END;
$function$;