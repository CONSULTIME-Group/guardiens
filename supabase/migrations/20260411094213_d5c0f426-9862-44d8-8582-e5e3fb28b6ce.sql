CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_first_name text,
  p_avatar_url text,
  p_postal_code text,
  p_city text,
  p_bio text DEFAULT NULL
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

  UPDATE profiles
  SET 
    first_name = trim(p_first_name),
    avatar_url = p_avatar_url,
    postal_code = trim(p_postal_code),
    city = trim(p_city),
    bio = NULLIF(trim(coalesce(p_bio, '')), ''),
    onboarding_completed = true
  WHERE id = auth.uid();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(text, text, text, text, text)
TO authenticated;