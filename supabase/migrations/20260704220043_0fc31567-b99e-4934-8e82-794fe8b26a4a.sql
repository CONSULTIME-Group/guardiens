DROP POLICY IF EXISTS "Authenticated can view relevant sits" ON public.sits;

CREATE POLICY "Authenticated can view relevant sits"
ON public.sits
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR status = ANY (ARRAY['published'::sit_status, 'confirmed'::sit_status, 'completed'::sit_status, 'cancelled'::sit_status, 'archived'::sit_status])
  OR (status = 'draft'::sit_status AND unpublished_at IS NOT NULL)
);