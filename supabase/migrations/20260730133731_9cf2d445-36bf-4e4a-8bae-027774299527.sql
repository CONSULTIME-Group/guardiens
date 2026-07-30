DROP POLICY "Authenticated can view relevant sits" ON public.sits;
CREATE POLICY "Authenticated can view relevant sits"
ON public.sits
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR (status = ANY (ARRAY['published'::sit_status, 'confirmed'::sit_status, 'completed'::sit_status, 'cancelled'::sit_status, 'archived'::sit_status]))
);

DROP POLICY "Owners can update their own sits" ON public.sits;
CREATE POLICY "Owners can update their own sits"
ON public.sits
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);