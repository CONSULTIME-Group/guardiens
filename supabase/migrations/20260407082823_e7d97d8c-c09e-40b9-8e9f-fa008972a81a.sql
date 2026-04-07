-- Remove the overly permissive anon SELECT policy on mission_feedbacks
DROP POLICY IF EXISTS "Anon can view all feedback" ON public.mission_feedbacks;
