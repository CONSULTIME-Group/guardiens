
CREATE POLICY "Users can see if blocked"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocked_id);
