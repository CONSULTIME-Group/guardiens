-- Allow authenticated users to view properties linked to active (published/confirmed/in_progress) sits.
-- The previous policy was restricted to anon, which prevented logged-in members
-- from seeing other owners' property photos in the search and detail pages.

DROP POLICY IF EXISTS "Properties are publicly readable via published sits" ON public.properties;

CREATE POLICY "Properties are readable via active sits"
ON public.properties
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sits s
    WHERE s.property_id = properties.id
      AND s.status IN ('published'::sit_status, 'confirmed'::sit_status, 'in_progress'::sit_status)
  )
);