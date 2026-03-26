
CREATE TABLE public.badge_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sit_id uuid NOT NULL REFERENCES public.sits(id) ON DELETE CASCADE,
  giver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (sit_id, giver_id, badge_key)
);

ALTER TABLE public.badge_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own badges" ON public.badge_attributions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = giver_id);

CREATE POLICY "Users can view all badges" ON public.badge_attributions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anon can view all badges" ON public.badge_attributions
  FOR SELECT TO anon
  USING (true);
