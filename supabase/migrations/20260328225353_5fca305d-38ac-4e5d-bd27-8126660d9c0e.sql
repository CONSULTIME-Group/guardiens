
-- Function to calculate profile completion rate
CREATE OR REPLACE FUNCTION public.calculate_profile_completion(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_score integer := 0;
  v_avatar text;
  v_bio text;
  v_identity_verified boolean;
  v_has_sitter_gallery boolean;
  v_has_owner_gallery boolean;
  v_has_pet boolean;
  v_has_property_desc boolean;
  v_has_animal_types boolean;
  v_has_radius boolean;
  v_has_property_photos boolean;
BEGIN
  -- Get profile basics
  SELECT role, avatar_url, bio, identity_verified
  INTO v_role, v_avatar, v_bio, v_identity_verified
  FROM public.profiles WHERE id = p_user_id;

  IF v_role IS NULL THEN RETURN 0; END IF;

  IF v_role = 'owner' THEN
    -- OWNER scoring (100 points total)
    -- Photo de profil: 15 pts
    IF v_avatar IS NOT NULL AND v_avatar != '' THEN v_score := v_score + 15; END IF;
    -- Bio min 50 chars: 10 pts
    IF v_bio IS NOT NULL AND length(v_bio) >= 50 THEN v_score := v_score + 10; END IF;
    -- Au moins 1 animal: 20 pts
    SELECT EXISTS(
      SELECT 1 FROM public.pets p
      JOIN public.properties pr ON pr.id = p.property_id
      WHERE pr.user_id = p_user_id
    ) INTO v_has_pet;
    IF v_has_pet THEN v_score := v_score + 20; END IF;
    -- Logement décrit min 50 chars: 20 pts
    SELECT EXISTS(
      SELECT 1 FROM public.properties
      WHERE user_id = p_user_id AND description IS NOT NULL AND length(description) >= 50
    ) INTO v_has_property_desc;
    IF v_has_property_desc THEN v_score := v_score + 20; END IF;
    -- Email vérifié (always true if they can log in): 20 pts
    v_score := v_score + 20;
    -- Au moins 1 photo logement: 15 pts
    SELECT EXISTS(
      SELECT 1 FROM public.properties
      WHERE user_id = p_user_id AND photos IS NOT NULL AND array_length(photos, 1) > 0
    ) INTO v_has_property_photos;
    IF v_has_property_photos THEN v_score := v_score + 15; END IF;

  ELSE
    -- SITTER scoring (also for 'both' role, use sitter weights)
    -- Photo de profil: 15 pts
    IF v_avatar IS NOT NULL AND v_avatar != '' THEN v_score := v_score + 15; END IF;
    -- Bio min 50 chars: 15 pts
    IF v_bio IS NOT NULL AND length(v_bio) >= 50 THEN v_score := v_score + 15; END IF;
    -- Animaux acceptés (au moins 1): 10 pts
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND animal_types IS NOT NULL AND array_length(animal_types, 1) > 0
    ) INTO v_has_animal_types;
    IF v_has_animal_types THEN v_score := v_score + 10; END IF;
    -- Mobilité/rayon renseigné: 10 pts
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_profiles
      WHERE user_id = p_user_id AND geographic_radius IS NOT NULL AND geographic_radius > 0
    ) INTO v_has_radius;
    IF v_has_radius THEN v_score := v_score + 10; END IF;
    -- Email vérifié: 20 pts
    v_score := v_score + 20;
    -- Au moins 1 photo galerie: 15 pts
    SELECT EXISTS(
      SELECT 1 FROM public.sitter_gallery WHERE user_id = p_user_id
    ) INTO v_has_sitter_gallery;
    IF v_has_sitter_gallery THEN v_score := v_score + 15; END IF;
    -- ID vérifiée: 15 pts
    IF v_identity_verified THEN v_score := v_score + 15; END IF;
  END IF;

  -- Update the profile
  UPDATE public.profiles SET profile_completion = v_score WHERE id = p_user_id;

  RETURN v_score;
END;
$$;

-- Trigger function for profiles table
CREATE OR REPLACE FUNCTION public.trigger_recalc_completion_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.calculate_profile_completion(NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger function for related tables (sitter_profiles, owner_profiles, etc.)
CREATE OR REPLACE FUNCTION public.trigger_recalc_completion_related()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.calculate_profile_completion(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Trigger function for pets (needs to go through properties)
CREATE OR REPLACE FUNCTION public.trigger_recalc_completion_pets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.properties WHERE id = NEW.property_id;
  IF v_user_id IS NOT NULL THEN
    PERFORM public.calculate_profile_completion(v_user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for properties
CREATE OR REPLACE FUNCTION public.trigger_recalc_completion_properties()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.calculate_profile_completion(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_recalc_completion_profiles
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url
    OR OLD.bio IS DISTINCT FROM NEW.bio
    OR OLD.identity_verified IS DISTINCT FROM NEW.identity_verified
    OR OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.trigger_recalc_completion_profiles();

CREATE TRIGGER trg_recalc_completion_sitter_profiles
  AFTER INSERT OR UPDATE ON public.sitter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_completion_related();

CREATE TRIGGER trg_recalc_completion_owner_profiles
  AFTER INSERT OR UPDATE ON public.owner_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_completion_related();

CREATE TRIGGER trg_recalc_completion_sitter_gallery
  AFTER INSERT OR DELETE ON public.sitter_gallery
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_completion_related();

CREATE TRIGGER trg_recalc_completion_owner_gallery
  AFTER INSERT OR DELETE ON public.owner_gallery
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_completion_related();

CREATE TRIGGER trg_recalc_completion_pets
  AFTER INSERT OR DELETE ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_completion_pets();

CREATE TRIGGER trg_recalc_completion_properties
  AFTER UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalc_completion_properties();
