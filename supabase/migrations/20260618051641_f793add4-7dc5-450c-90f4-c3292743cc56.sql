
ALTER TABLE public.pro_profiles ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_pro_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.pro_profiles
  SET view_count = view_count + 1
  WHERE slug = _slug AND status = 'approved';
$$;

GRANT EXECUTE ON FUNCTION public.increment_pro_view(text) TO anon, authenticated;
