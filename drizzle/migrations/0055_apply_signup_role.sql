CREATE OR REPLACE FUNCTION public.apply_signup_role(p_role public.user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _meta_role text;
  _created timestamptz;
BEGIN
  IF _uid IS NULL OR p_role IS NULL THEN
    RETURN false;
  END IF;
  SELECT raw_user_meta_data ->> 'role' INTO _meta_role FROM auth.users WHERE id = _uid;
  IF _meta_role IN ('owner','sitter','both') THEN
    RETURN false;
  END IF;
  SELECT created_at INTO _created FROM public.profiles WHERE id = _uid;
  IF _created IS NULL OR _created < now() - interval '30 minutes' THEN
    RETURN false;
  END IF;
  UPDATE public.profiles SET role = p_role WHERE id = _uid;
  IF p_role IN ('sitter','both') THEN
    INSERT INTO public.sitter_profiles (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  IF p_role IN ('owner','both') THEN
    INSERT INTO public.owner_profiles (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_signup_role(public.user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_signup_role(public.user_role) TO authenticated;
COMMENT ON FUNCTION public.apply_signup_role(public.user_role) IS 'Lot 0 : applique le rôle choisi avant une inscription Google, profil de moins de 30 minutes, sans rôle en métadonnées.';