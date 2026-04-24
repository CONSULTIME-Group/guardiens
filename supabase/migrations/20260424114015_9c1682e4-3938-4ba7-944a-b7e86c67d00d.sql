DROP POLICY IF EXISTS "Pets are publicly readable via published sits" ON public.pets;

CREATE POLICY "Pets readable via published sits"
ON public.pets
FOR SELECT
TO public, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM properties p
    JOIN sits s ON s.property_id = p.id
    WHERE p.id = pets.property_id
      AND s.status = 'published'
  )
);