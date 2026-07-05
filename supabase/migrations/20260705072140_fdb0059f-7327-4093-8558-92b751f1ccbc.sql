CREATE TABLE IF NOT EXISTS public.small_mission_response_thanks (
  response_id uuid NOT NULL REFERENCES public.small_mission_responses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (response_id, user_id)
);

GRANT SELECT ON public.small_mission_response_thanks TO anon, authenticated;
GRANT INSERT, DELETE ON public.small_mission_response_thanks TO authenticated;

ALTER TABLE public.small_mission_response_thanks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read thanks"
  ON public.small_mission_response_thanks
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Logged users thank others"
  ON public.small_mission_response_thanks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.small_mission_responses r
      WHERE r.id = response_id AND r.responder_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove own thanks"
  ON public.small_mission_response_thanks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger : maj helpful_count
CREATE OR REPLACE FUNCTION public.tg_sync_response_helpful_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.small_mission_responses
       SET helpful_count = helpful_count + 1
     WHERE id = NEW.response_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.small_mission_responses
       SET helpful_count = GREATEST(helpful_count - 1, 0)
     WHERE id = OLD.response_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_response_helpful_count ON public.small_mission_response_thanks;
CREATE TRIGGER trg_sync_response_helpful_count
  AFTER INSERT OR DELETE ON public.small_mission_response_thanks
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_response_helpful_count();