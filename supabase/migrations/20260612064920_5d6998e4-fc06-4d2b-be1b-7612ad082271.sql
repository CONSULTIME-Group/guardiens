-- Allow anon to read pets attached to published sits (public listing pages)
CREATE POLICY "Pets readable via published sits (anon)"
ON public.pets
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.properties p
    JOIN public.sits s ON s.property_id = p.id
    WHERE p.id = pets.property_id
      AND s.status = 'published'::sit_status
  )
);

GRANT SELECT ON public.pets TO anon;