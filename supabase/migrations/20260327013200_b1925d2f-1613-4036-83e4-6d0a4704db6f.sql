
-- Mission feedback table
CREATE TABLE public.mission_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.small_missions(id) ON DELETE CASCADE,
  giver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  positive boolean NOT NULL,
  badge_key text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mission_id, giver_id)
);

ALTER TABLE public.mission_feedbacks ENABLE ROW LEVEL SECURITY;

-- Users can insert feedback for missions they participated in
CREATE POLICY "Users can insert own feedback"
  ON public.mission_feedbacks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = giver_id);

-- Users can view feedback they gave or received, or admins
CREATE POLICY "Users can view related feedback"
  ON public.mission_feedbacks FOR SELECT TO authenticated
  USING (
    auth.uid() = giver_id 
    OR auth.uid() = receiver_id 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Anon can see feedback for public profiles
CREATE POLICY "Anon can view all feedback"
  ON public.mission_feedbacks FOR SELECT TO anon
  USING (true);
