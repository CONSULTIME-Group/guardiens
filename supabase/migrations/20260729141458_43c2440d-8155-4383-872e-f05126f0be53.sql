CREATE OR REPLACE FUNCTION public.get_sitter_country_map()
RETURNS TABLE(user_id uuid, country text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT sp.user_id, upper(trim(p.country))
  FROM public.sitter_profiles sp
  JOIN public.profiles p ON p.id = sp.user_id
  WHERE p.country IS NOT NULL
    AND trim(p.country) <> ''
    AND COALESCE(p.profile_completion, 0) >= 40
$$;