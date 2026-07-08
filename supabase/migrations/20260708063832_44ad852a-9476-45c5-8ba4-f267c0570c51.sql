DROP POLICY IF EXISTS "Authenticated can view relevant sits" ON public.sits;
CREATE POLICY "Authenticated can view relevant sits" ON public.sits
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (status = ANY (ARRAY['published'::sit_status, 'confirmed'::sit_status, 'completed'::sit_status, 'cancelled'::sit_status, 'archived'::sit_status]))
);