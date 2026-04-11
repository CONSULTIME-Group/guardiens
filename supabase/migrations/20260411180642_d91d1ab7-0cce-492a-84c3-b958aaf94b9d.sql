DROP FUNCTION IF EXISTS public.complete_onboarding(text, text, text, text, text, date, text);

CREATE FUNCTION public.complete_onboarding(
  p_first_name text,
  p_avatar_url text,
  p_postal_code text,
  p_city text,
  p_bio text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_animal_experience text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_first_name IS NULL OR length(trim(p_first_name)) = 0 THEN
    RAISE EXCEPTION 'INVALID_FIRST_NAME';
  END IF;

  IF p_avatar_url IS NULL OR length(trim(p_avatar_url)) = 0 THEN
    RAISE EXCEPTION 'INVALID_AVATAR';
  END IF;

  IF p_postal_code IS NULL OR length(trim(p_postal_code)) = 0 THEN
    RAISE EXCEPTION 'INVALID_POSTAL_CODE';
  END IF;

  IF p_city IS NULL OR length(trim(p_city)) = 0 THEN
    RAISE EXCEPTION 'INVALID_CITY';
  END IF;

  IF p_date_of_birth IS NULL THEN
    RAISE EXCEPTION 'INVALID_DATE_OF_BIRTH';
  END IF;

  IF age(current_date, p_date_of_birth) < interval '18 years' THEN
    RAISE EXCEPTION 'UNDERAGE_USER';
  END IF;

  IF p_animal_experience IS NULL OR length(trim(p_animal_experience)) < 10 THEN
    RAISE EXCEPTION 'INVALID_ANIMAL_EXPERIENCE';
  END IF;

  IF length(trim(p_animal_experience)) > 300 THEN
    RAISE EXCEPTION 'ANIMAL_EXPERIENCE_TOO_LONG';
  END IF;

  UPDATE profiles
  SET 
    first_name = trim(p_first_name),
    avatar_url = p_avatar_url,
    postal_code = trim(p_postal_code),
    city = trim(p_city),
    bio = NULLIF(trim(coalesce(p_bio, '')), ''),
    date_of_birth = p_date_of_birth,
    animal_experience = trim(p_animal_experience),
    onboarding_completed = true
  WHERE id = auth.uid();

  RETURN true;
END;
$$;