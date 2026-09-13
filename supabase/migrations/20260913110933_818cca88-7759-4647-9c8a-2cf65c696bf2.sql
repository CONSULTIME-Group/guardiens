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
  v_rows jsonb := '[]'::jsonb;
BEGIN
  -- Chacun ne lit que son propre dossier. Les administrateurs et le
  -- service_role (auth.uid() nul) gardent l'acces complet.
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> p_user_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

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
      v_rows := v_rows || jsonb_build_object('champ','localisation','libelle','Votre prénom et votre code postal','points',15);
    END IF;
    IF v_avatar IS NULL OR v_avatar = '' THEN
      v_rows := v_rows || jsonb_build_object('champ','photo','libelle','Une photo de vous','points',20);
    END IF;
    IF v_bio IS NULL OR length(v_bio) < 50 THEN
      v_rows := v_rows || jsonb_build_object('champ','bio','libelle','Une présentation d''au moins cinquante caractères','points',15);
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND competences IS NOT NULL AND array_length(competences, 1) > 0
    ) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','competences','libelle','Vos compétences de gardien','points',15);
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND lifestyle IS NOT NULL AND array_length(lifestyle, 1) > 0
    ) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','lifestyle','libelle','Votre rythme de vie','points',10);
    END IF;
    SELECT count(*) INTO v_gallery_count FROM public.sitter_gallery WHERE user_id = p_user_id;
    IF v_gallery_count = 0 THEN
      v_rows := v_rows || jsonb_build_object('champ','galerie','libelle','Trois photos dans votre galerie','points',10);
    ELSIF v_gallery_count < 3 THEN
      v_rows := v_rows || jsonb_build_object('champ','galerie','libelle','Trois photos dans votre galerie','points',6);
    END IF;
    IF v_identity_verified IS NOT TRUE THEN
      v_rows := v_rows || jsonb_build_object('champ','identite','libelle','La vérification d''identité','points',5);
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
      v_rows := v_rows || jsonb_build_object('champ','affinites','libelle','Vos affinités, centres d''intérêt, langues, rythme, animaux acceptés','points',10 - v_affinity_score);
    END IF;

  ELSE
    IF NOT v_location_ok THEN
      v_rows := v_rows || jsonb_build_object('champ','localisation','libelle','Votre prénom et votre code postal','points',10);
    END IF;
    IF v_avatar IS NULL OR v_avatar = '' THEN
      v_rows := v_rows || jsonb_build_object('champ','photo','libelle','Une photo de vous','points',10);
    END IF;
    IF v_bio IS NULL OR length(v_bio) < 50 THEN
      v_rows := v_rows || jsonb_build_object('champ','bio','libelle','Une présentation d''au moins cinquante caractères','points',10);
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.owner_profiles
      WHERE user_id = p_user_id AND competences IS NOT NULL AND array_length(competences, 1) > 0
    ) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','competences','libelle','Vos compétences','points',10);
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.pets p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE pr.user_id = p_user_id
    ) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','animal','libelle','Au moins un animal renseigné','points',20);
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.properties
      WHERE user_id = p_user_id AND description IS NOT NULL AND length(description) >= 50
    ) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','logement','libelle','La description de votre logement, cinquante caractères au moins','points',10);
    END IF;
    SELECT EXISTS(SELECT 1 FROM public.owner_gallery WHERE user_id = p_user_id) INTO v_exists;
    IF NOT v_exists THEN
      v_rows := v_rows || jsonb_build_object('champ','galerie','libelle','Des photos de votre logement','points',15);
    END IF;
    IF v_identity_verified IS NOT TRUE THEN
      v_rows := v_rows || jsonb_build_object('champ','identite','libelle','La vérification d''identité','points',5);
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
      v_rows := v_rows || jsonb_build_object('champ','affinites','libelle','Vos affinités, centres d''intérêt, langues, rythme, ambiance, type de gardien recherché','points',10 - v_affinity_score);
    END IF;
  END IF;

  RETURN QUERY
    SELECT v_bareme, r.champ, r.libelle, r.points
    FROM jsonb_to_recordset(v_rows) AS r(champ text, libelle text, points integer)
    ORDER BY r.points DESC, r.champ;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.profile_completion_missing(uuid) TO authenticated, service_role;