
DROP POLICY IF EXISTS "Pets readable via published sits" ON public.pets;

CREATE POLICY "Accepted sitters can read pets for their assignment"
ON public.pets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.sits s ON s.id = a.sit_id
    WHERE s.property_id = pets.property_id
      AND a.sitter_id = auth.uid()
      AND a.status = 'accepted'
  )
);

CREATE OR REPLACE VIEW public.public_pets
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.property_id,
  p.species,
  p.breed,
  p.name,
  p.age,
  p.photo_url,
  p.character,
  p.activity_level,
  p.alone_duration,
  p.walk_duration
FROM public.pets p
WHERE EXISTS (
  SELECT 1
  FROM public.sits s
  WHERE s.property_id = p.property_id
    AND s.status = 'published'
);

GRANT SELECT ON public.public_pets TO anon, authenticated;

CREATE POLICY "profiles_restrictive_own_or_admin"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role)
);
