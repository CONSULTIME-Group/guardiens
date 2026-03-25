
-- Tighten INSERT policy: only system (trigger) should insert, but since triggers use SECURITY DEFINER they bypass RLS.
-- Replace the permissive policy with one that prevents direct user insertion of notifications for other users.
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Users can only insert their own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
