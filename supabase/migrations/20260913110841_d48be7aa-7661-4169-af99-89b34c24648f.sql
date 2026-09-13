-- profile_completion_missing : liste des criteres NON satisfaits du bareme de
-- completion. ATTENTION : toute modification de public._calculate_sitter_score
-- ou de public._calculate_owner_score doit etre repercutee ici a l'identique.
CREATE OR REPLACE FUNCTION public.profile_completion_missing(p_user_id uuid)
RETURNS TABLE(bareme text, champ text, libelle text, points integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role text;
  v_bareme text;
  v_first_name text; v_postal_code text; v_city text; v_country text;
  v_avatar text; v_bio text; v_identity_verified boolean;
  v_location_ok boolean;
  v_interests text[]; v_languages text[]; v_life_pace text;
  v_animal_types text[]; v_home_ambiance text[]; v_preferred_sitter_types text[];
  v_affinity_count integer := 0; v_affinity_score integer := 0;
  v_gallery_count integer;
  v_exists boolean;
BEGIN
  SELECT role::text, first_name, postal_code, city, country, avatar_url, bio, identity_verified
    INTO v_role, v_first_name, v_postal_code, v_city, v_country, v_avatar, v_bio, v_identity_verified
    FROM public.profiles WHERE id = p_user_id;

  IF v_role IS NULL THEN RETURN; END IF;

  IF v_role = 'sitter' THEN
    v_bareme := 'gardien';
  ELSIF v_role = 'owner' THEN
    v_bareme := 'proprietaire';
  ELSE
    IF public._calculate_owner_score(p_user_id) > public._calculate_sitter_score(p_user_id)
      THEN v_bareme := 'proprietaire';
      ELSE v_bareme := 'gardien';
    END IF;
  END IF;

  -- Parite avec les fonctions de score : un country vide vaut "inconnu", donc regle France.
  v_location_ok := (
    v_first_name IS NOT NULL AND v_first_name != '' AND (
      (COALESCE(NULLIF(v_country, ''), 'FR') = 'FR' AND v_postal_code IS NOT NULL AND v_postal_code != '')
      OR (COALESCE(NULLIF(v_country, ''), 'FR') != 'FR' AND v_city IS NOT NULL AND v_city != '')
    )
  );

  IF v_bareme = 'gardien' THEN
    IF NOT v_location_ok THEN
      RETURN QUERY SELECT v_bareme, 'localisation', 'Votre prénom et votre code postal', 15;
    END IF;
    IF v_avatar IS NULL OR v_avatar = '' THEN
      RETURN QUERY SELECT v_bareme, 'photo', 'Une photo de vous', 20;
    END IF;
    IF v_bio IS NULL OR length(v_bio) < 50 THEN
      RETURN QUERY SELECT v_bareme, 'bio', 'Une présentation d''au moins cinquante caractères', 15;
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND competences IS NOT NULL AND array_length(competences, 1) > 0
    ) INTO v_exists;
    IF NOT v_exists THEN
      RETURN QUERY SELECT v_bareme, 'competences', 'Vos compétences de gardien', 15;
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND lifestyle IS NOT NULL AND array_length(lifestyle, 1) > 0
    ) INTO v_exists;
    IF NOT v_exists THEN
      RETURN QUERY SELECT v_bareme, 'lifestyle', 'Votre rythme de vie', 10;
    END IF;
    SELECT count(*) INTO v_gallery_count FROM public.sitter_gallery WHERE user_id = p_user_id;
    IF v_gallery_count = 0 THEN
      RETURN QUERY SELECT v_bareme, 'galerie', 'Trois photos dans votre galerie', 10;
    ELSIF v_gallery_count < 3 THEN
      RETURN QUERY SELECT v_bareme, 'galerie', 'Trois photos dans votre galerie', 6;
    END IF;
    IF v_identity_verified IS NOT TRUE THEN
      RETURN QUERY SELECT v_bareme, 'identite', 'La vérification d''identité', 5;
    END IF;

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
    IF 10 - v_affinity_score > 0 THEN
      RETURN QUERY SELECT v_bareme, 'affinites',
        'Vos affinités, centres d''intérêt, langues, rythme, animaux acceptés', 10 - v_affinity_score;
    END IF;

  ELSE
    IF NOT v_location_ok THEN
      RETURN QUERY SELECT v_bareme, 'localisation', 'Votre prénom et votre code postal', 10;
    END IF;
    IF v_avatar IS NULL OR v_avatar = '' THEN
      RETURN QUERY SELECT v_bareme, 'photo', 'Une photo de vous', 10;
    END IF;
    IF v_bio IS NULL OR length(v_bio) < 50 THEN
      RETURN QUERY SELECT v_bareme, 'bio', 'Une présentation d''au moins cinquante caractères', 10;
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.owner_profiles
      WHERE user_id = p_user_id AND competences IS NOT NULL AND array_length(competences, 1) > 0
    ) INTO v_exists;
    IF NOT v_exists THEN
      RETURN QUERY SELECT v_bareme, 'competences', 'Vos compétences', 10;
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.pets p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE pr.user_id = p_user_id
    ) INTO v_exists;
    IF NOT v_exists THEN
      RETURN QUERY SELECT v_bareme, 'animal', 'Au moins un animal renseigné', 20;
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.properties
      WHERE user_id = p_user_id AND description IS NOT NULL AND length(description) >= 50
    ) INTO v_exists;
    IF NOT v_exists THEN
      RETURN QUERY SELECT v_bareme, 'logement',
        'La description de votre logement, cinquante caractères au moins', 10;
    END IF;
    SELECT EXISTS(SELECT 1 FROM public.owner_gallery WHERE user_id = p_user_id) INTO v_exists;
    IF NOT v_exists THEN
      RETURN QUERY SELECT v_bareme, 'galerie', 'Des photos de votre logement', 15;
    END IF;
    IF v_identity_verified IS NOT TRUE THEN
      RETURN QUERY SELECT v_bareme, 'identite', 'La vérification d''identité', 5;
    END IF;

    SELECT interests, languages, life_pace, home_ambiance, preferred_sitter_types
      INTO v_interests, v_languages, v_life_pace, v_home_ambiance, v_preferred_sitter_types
      FROM public.owner_profiles WHERE user_id = p_user_id;
    IF v_interests IS NOT NULL AND array_length(v_interests, 1) >= 3 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_languages IS NOT NULL AND array_length(v_languages, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_life_pace IS NOT NULL AND v_life_pace != '' THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_home_ambiance IS NOT NULL AND array_length(v_home_ambiance, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_preferred_sitter_types IS NOT NULL AND array_length(v_preferred_sitter_types, 1) > 0 THEN v_affinity_count := v_affinity_count + 1; END IF;
    IF v_affinity_count >= 3 THEN v_affinity_score := 10;
    ELSIF v_affinity_count = 2 THEN v_affinity_score := 6;
    ELSIF v_affinity_count = 1 THEN v_affinity_score := 3;
    ELSE v_affinity_score := 0; END IF;
    IF 10 - v_affinity_score > 0 THEN
      RETURN QUERY SELECT v_bareme, 'affinites',
        'Vos affinités, centres d''intérêt, langues, rythme, ambiance, type de gardien recherché', 10 - v_affinity_score;
    END IF;
  END IF;

  RETURN QUERY
    SELECT * FROM (SELECT 1 WHERE false) AS noop(x) WHERE false;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.profile_completion_missing(uuid) TO authenticated, service_role;