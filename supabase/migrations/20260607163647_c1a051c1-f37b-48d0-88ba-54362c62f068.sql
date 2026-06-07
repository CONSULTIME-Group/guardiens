
ALTER TABLE public.small_missions ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_small_mission_view(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.small_missions
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = _mission_id
    AND (user_id IS DISTINCT FROM auth.uid() OR auth.uid() IS NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_small_mission_view(uuid) TO anon, authenticated;
