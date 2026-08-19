CREATE OR REPLACE FUNCTION public._calculate_sitter_score(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_score integer := 0;
  v_first_name text; v_postal_code text; v_city text; v_country text;
  v_avatar text; v_bio text; v_identity_verified boolean;
  v_has_competences boolean; v_has_lifestyle boolean;
  v_has_radius boolean; v_sitter_gallery_count integer;
  v_location_ok boolean;
  v_affinity_count integer := 0; v_affinity_score integer := 0;
  v_interests text[]; v_languages text[]; v_life_pace text; v_animal_types text[];
BEGIN
  SELECT first_name, postal_code, city, country, avatar_url, bio, identity_verified
    INTO v_first_name, v_postal_code, v_city, v_country, v_avatar, v_bio, v_identity_verified
    FROM public.profiles WHERE id = p_user_id;

  v_location_ok := (
    v_first_name IS NOT NULL AND v_first_name != '' AND (
      (COALESCE(v_country, 'FR') = 'FR' AND v_postal_code IS NOT NULL AND v_postal_code != '')
      OR (COALESCE(v_country, 'FR') != 'FR' AND v_city IS NOT NULL AND v_city != '')
    )
  );
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
  -- Galerie : 2 points dès la première photo, 5 points pour une galerie fournie (3 photos ou plus).
  SELECT count(*) INTO v_sitter_gallery_count FROM public.sitter_gallery WHERE user_id = p_user_id;
  IF v_sitter_gallery_count >= 3 THEN v_score := v_score + 5;
  ELSIF v_sitter_gallery_count >= 1 THEN v_score := v_score + 2; END IF;
  IF v_identity_verified THEN v_score := v_score + 5; END IF;

  SELECT interests, languages, life_pace, animal_types
    INTO v_interests, v_languages, v_life_pace, v_animal_types
    FROM public.sitter_profiles WHERE user_id = p_user_id;
  IF v_interests IS NOT NULL AND array_length(v_interests, 1) >= 3 THEN v_affinity_count := v_affinity_count + 1; END IF;
  IF v_languages IS NOT NULL AND array_length(v_languages, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
  IF v_life_pace IS NOT NULL AND v_life_pace != '' THEN v_affinity_count := v_affinity_count + 1; END IF;
  IF v_animal_types IS NOT NULL AND array_length(v_animal_types, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;

  IF v_affinity_count >= 3 THEN v_affinity_score := 10;
  ELSIF v_affinity_count = 2 THEN v_affinity_score := 6;
  ELSIF v_affinity_count = 1 THEN v_affinity_score := 3;
  ELSE v_affinity_score := 0; END IF;

  RETURN LEAST(100, v_score + v_affinity_score);
END;
$function$;

-- Recalcul immédiat : les profils avec 1 ou 2 photos passent à 2 points,
-- personne ne peut perdre de points (l'ancien barème donnait 0 ou 5).
DO $$
DECLARE
  v_profile record;
BEGIN
  FOR v_profile IN
    SELECT id FROM public.profiles WHERE role IN ('sitter', 'both')
  LOOP
    PERFORM public.calculate_profile_completion(v_profile.id);
  END LOOP;
END $$;