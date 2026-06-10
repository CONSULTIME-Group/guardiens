
-- 1) nurturing_sequences: restrict read to admins only
DROP POLICY IF EXISTS "Sequences readable" ON public.nurturing_sequences;
CREATE POLICY "Sequences readable by admins"
ON public.nurturing_sequences
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) pets: require authentication to read pets via published sits
DROP POLICY IF EXISTS "Pets readable via published sits" ON public.pets;
CREATE POLICY "Pets readable via published sits"
ON public.pets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM properties p
    JOIN sits s ON s.property_id = p.id
    WHERE p.id = pets.property_id
      AND s.status = 'published'::sit_status
  )
);
