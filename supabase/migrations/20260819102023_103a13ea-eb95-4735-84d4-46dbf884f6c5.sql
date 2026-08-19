DROP POLICY IF EXISTS "sitter_gallery_public_read" ON public.sitter_gallery;

CREATE OR REPLACE FUNCTION public.gallery_photo_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.sitter_gallery WHERE user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.gallery_photo_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gallery_photo_count(uuid) TO anon, authenticated;