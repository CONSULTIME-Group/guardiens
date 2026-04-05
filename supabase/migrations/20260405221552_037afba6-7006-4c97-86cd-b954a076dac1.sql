-- Resserrer la policy de lecture des guides de maison
-- Un gardien ne voit le guide QUE s'il est accepté sur un sit confirmé/en cours pour cette propriété
DROP POLICY IF EXISTS "Confirmed sitters can view house guide" ON house_guides;

CREATE POLICY "Confirmed sitters can view house guide"
  ON house_guides FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM sits s
      JOIN applications a ON a.sit_id = s.id
      WHERE s.property_id = house_guides.property_id
        AND a.sitter_id = auth.uid()
        AND a.status = 'accepted'
        AND s.status IN ('confirmed', 'in_progress')
        AND s.start_date <= (CURRENT_DATE + INTERVAL '1 day')
        AND s.end_date >= CURRENT_DATE
    )
  );