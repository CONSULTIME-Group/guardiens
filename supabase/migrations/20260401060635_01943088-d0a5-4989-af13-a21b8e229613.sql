
-- Correction 4: Add override columns to sits table
ALTER TABLE sits ADD COLUMN IF NOT EXISTS logement_override text;
ALTER TABLE sits ADD COLUMN IF NOT EXISTS animaux_override text;

-- Correction 6: Allow anonymous users to read published sits
CREATE POLICY "Published sits are publicly readable"
ON sits FOR SELECT
TO anon
USING (status = 'published');

-- Also allow anon to read related data for public listing page
CREATE POLICY "Pets are publicly readable via published sits"
ON pets FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM properties p
  JOIN sits s ON s.property_id = p.id
  WHERE p.id = pets.property_id AND s.status = 'published'
));

CREATE POLICY "Properties are publicly readable via published sits"
ON properties FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM sits s
  WHERE s.property_id = properties.id AND s.status = 'published'
));

CREATE POLICY "Profiles are publicly readable"
ON profiles FOR SELECT
TO anon
USING (true);
