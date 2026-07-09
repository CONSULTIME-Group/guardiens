
-- community_questions : anon voit tout sauf latitude/longitude
REVOKE SELECT ON public.community_questions FROM anon;
GRANT SELECT (
  id, author_id, category, title, body, tags, city, status,
  accepted_answer_id, views_count, answers_count, helpful_count,
  reports_count, is_pinned, is_hidden, created_at, updated_at
) ON public.community_questions TO anon;

-- small_missions : anon voit tout sauf latitude/longitude
REVOKE SELECT ON public.small_missions FROM anon;
GRANT SELECT (
  id, user_id, title, description, category, exchange_offer, city, postal_code,
  date_needed, duration_estimate, status, created_at, updated_at, photos,
  mission_type, view_count, end_date, pet_species, pet_size, closed_at, close_reason
) ON public.small_missions TO anon;
