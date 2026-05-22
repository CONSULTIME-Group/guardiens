
-- 1. small_missions: restrict authenticated SELECT to open missions or owner
DROP POLICY IF EXISTS "Authenticated can read open missions" ON public.small_missions;

CREATE POLICY "Authenticated can read open or own missions"
ON public.small_missions
FOR SELECT
TO authenticated
USING (status = 'open'::small_mission_status OR auth.uid() = user_id);

-- 2. email_deferred_queue: explicit admin-only SELECT (defense in depth)
DROP POLICY IF EXISTS "Admins can read email queue" ON public.email_deferred_queue;

CREATE POLICY "Admins can read email queue"
ON public.email_deferred_queue
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
