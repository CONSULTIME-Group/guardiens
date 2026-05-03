
CREATE OR REPLACE FUNCTION public.is_account_empty(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_data boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND (
        COALESCE(NULLIF(first_name, ''), NULL) IS NOT NULL
        OR COALESCE(NULLIF(last_name, ''), NULL) IS NOT NULL
        OR COALESCE(NULLIF(bio, ''), NULL) IS NOT NULL
        OR COALESCE(NULLIF(avatar_url, ''), NULL) IS NOT NULL
        OR onboarding_minimal_completed = true
        OR onboarding_completed = true
        OR identity_verified = true
        OR profile_completion >= 20
      )
  ) INTO has_data;
  IF has_data THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.properties WHERE user_id = _user_id LIMIT 1) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.sits WHERE owner_id = _user_id LIMIT 1) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.applications WHERE sitter_id = _user_id LIMIT 1) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.messages WHERE sender_id = _user_id LIMIT 1) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.reviews WHERE reviewer_id = _user_id OR reviewee_id = _user_id LIMIT 1) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.small_missions WHERE creator_id = _user_id LIMIT 1) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id LIMIT 1) THEN RETURN false; END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_account_empty(uuid) TO authenticated;
