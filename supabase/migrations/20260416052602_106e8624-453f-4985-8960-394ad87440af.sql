CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_score integer := 0;
  v_first_name text;
  v_postal_code text;
  v_avatar text;
  v_bio text;
  v_identity_verified boolean;
  v_has_competences boolean;
  v_has_lifestyle boolean;
  v_has_sitter_gallery boolean;
  v_has_pet boolean;
  v_has_property_desc boolean;
  v_has_radius boolean;
  v_has_property_photos boolean;
  v_has_owner_competences boolean;
BEGIN
  -- Get profile basics
  SELECT role, first_name, postal_code, avatar_url, bio, identity_verified
  INTO v_role, v_first_name, v_postal_code, v_avatar, v_bio, v_identity_verified
  FROM public.profiles WHERE id = p_user_id;

  IF v_role IS NULL THEN RETURN 0; END IF;

  IF v_role = 'owner' THEN
    -- OWNER scoring (100 points total)
    -- Prénom + localisation: 10 pts
    IF v_first_name IS NOT NULL AND v_first_name != '' AND v_postal_code IS NOT NULL AND v_postal_code != '' THEN
      v_score := v_score + 10;
    END IF;
    -- Photo de profil: 20 pts
    IF v_avatar IS NOT NULL AND v_avatar != '' THEN v_score := v_score + 20; END IF;
    -- Bio min 50 chars: 10 pts
    IF v_bio IS NOT NULL AND length(v_bio) >= 50 THEN v_score := v_score + 10; END IF;
    -- Compétences ≥ 1: 10 pts
    SELECT EXISTS(
      SELECT 1 FROM public.owner_profiles
      WHERE user_id = p_user_id AND competences IS NOT NULL AND array_length(competences, 1) > 0
    ) INTO v_has_owner_competences;
    IF v_has_owner_competences THEN v_score := v_score + 10; END IF;
    -- Au moins 1 animal: 15 pts
    SELECT EXISTS(
      SELECT 1 FROM public.pets p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE pr.user_id = p_user_id
    ) INTO v_has_pet;
    IF v_has_pet THEN v_score := v_score + 15; END IF;
    -- Logement décrit min 50 chars: 15 pts
    SELECT EXISTS(
      SELECT 1 FROM public.properties
      WHERE user_id = p_user_id AND description IS NOT NULL AND length(description) >= 50
    ) INTO v_has_property_desc;
    IF v_has_property_desc THEN v_score := v_score + 15; END IF;
    -- Au moins 1 photo logement: 10 pts
    SELECT EXISTS(
      SELECT 1 FROM public.properties
      WHERE user_id = p_user_id AND photos IS NOT NULL AND array_length(photos, 1) > 0
    ) INTO v_has_property_photos;
    IF v_has_property_photos THEN v_score := v_score + 10; END IF;
    -- ID vérifiée: 10 pts
    IF v_identity_verified THEN v_score := v_score + 10; END IF;

  ELSE
    -- SITTER scoring (also for 'both' role)
    -- Prénom + localisation: 10 pts
    IF v_first_name IS NOT NULL AND v_first_name != '' AND v_postal_code IS NOT NULL AND v_postal_code != '' THEN
      v_score := v_score + 10;
    END IF;
    -- Photo de profil: 20 pts
    IF v_avatar IS NOT NULL AND v_avatar != '' THEN v_score := v_score + 20; END IF;
    -- Bio min 50 chars: 15 pts
    IF v_bio IS NOT NULL AND length(v_bio) >= 50 THEN v_score := v_score + 15; END IF;
    -- Compétences ≥ 1: 10 pts
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND competences IS NOT NULL AND array_length(competences, 1) > 0
    ) INTO v_has_competences;
    IF v_has_competences THEN v_score := v_score + 10; END IF;
    -- Style de vie ≥ 1: 10 pts
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND lifestyle IS NOT NULL AND array_length(lifestyle, 1) > 0
    ) INTO v_has_lifestyle;
    IF v_has_lifestyle THEN v_score := v_score + 10; END IF;
    -- Rayon géographique: 10 pts
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND geographic_radius IS NOT NULL AND geographic_radius > 0
    ) INTO v_has_radius;
    IF v_has_radius THEN v_score := v_score + 10; END IF;
    -- Au moins 1 photo galerie: 10 pts
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_gallery WHERE user_id = p_user_id
    ) INTO v_has_sitter_gallery;
    IF v_has_sitter_gallery THEN v_score := v_score + 10; END IF;
    -- ID vérifiée: 15 pts
    IF v_identity_verified THEN v_score := v_score + 15; END IF;
  END IF;

  -- Update the profile
  UPDATE public.profiles SET profile_completion = v_score WHERE id = p_user_id;

  RETURN v_score;
END;
$$;