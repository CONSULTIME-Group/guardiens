
DROP POLICY IF EXISTS "Properties are readable via active sits" ON public.properties;
CREATE POLICY "Properties are readable via active sits"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.sits s
    WHERE s.property_id = properties.id
      AND s.status IN ('published'::sit_status, 'confirmed'::sit_status, 'in_progress'::sit_status, 'archived'::sit_status)
      AND s.moderation_hidden_at IS NULL
  )
);
