DROP POLICY IF EXISTS sitter_view_house_guide_during_sit ON public.house_guides;

CREATE POLICY sitter_view_house_guide_during_sit
ON public.house_guides
FOR SELECT
USING (
  (user_id = auth.uid())
  OR (EXISTS (
    SELECT 1
    FROM public.sits s
    JOIN public.applications a ON a.sit_id = s.id
    WHERE s.property_id = house_guides.property_id
      AND a.sitter_id = auth.uid()
      AND a.status = 'accepted'::application_status
      AND s.status = ANY (ARRAY['confirmed'::sit_status, 'in_progress'::sit_status])
      AND CURRENT_DATE >= s.start_date - INTERVAL '7 days'
      AND CURRENT_DATE <= s.end_date
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);