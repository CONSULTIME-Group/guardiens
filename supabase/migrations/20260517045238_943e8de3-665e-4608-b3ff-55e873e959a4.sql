
CREATE TABLE IF NOT EXISTS public.ai_photo_analysis_quota (
  user_id UUID NOT NULL,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.ai_photo_analysis_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own AI quota"
ON public.ai_photo_analysis_quota
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy: only service role (edge function) can write.

CREATE OR REPLACE FUNCTION public.increment_photo_analysis_quota(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
  _new_count INTEGER;
BEGIN
  INSERT INTO public.ai_photo_analysis_quota (user_id, day, count, updated_at)
  VALUES (_user_id, _today, 1, now())
  ON CONFLICT (user_id, day)
  DO UPDATE SET count = ai_photo_analysis_quota.count + 1, updated_at = now()
  RETURNING count INTO _new_count;

  RETURN _new_count;
END;
$$;
