
-- Fix pets: drop broad SELECT, add owner-scoped SELECT
DROP POLICY IF EXISTS "Pets are viewable by authenticated users" ON pets;

CREATE POLICY "Owners can view their own pets"
ON pets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = pets.property_id
    AND properties.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all pets"
ON pets FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Fix properties: drop broad SELECT, add owner-scoped SELECT
DROP POLICY IF EXISTS "Properties are viewable by authenticated users" ON properties;

CREATE POLICY "Owners can view their own properties"
ON properties FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all properties"
ON properties FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));
