
CREATE UNIQUE INDEX IF NOT EXISTS user_journeys_active_unique
  ON public.user_journeys (user_id, sequence_key)
  WHERE status = 'active';
