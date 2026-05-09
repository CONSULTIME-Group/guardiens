
WITH failed_today AS (
  SELECT DISTINCT journey_id, MIN(step_order) - 1 AS prev_step
  FROM public.journey_step_log
  WHERE created_at >= '2026-05-09 12:00:00+00'
    AND created_at <  '2026-05-09 13:00:00+00'
    AND reason = 'send_failed_400'
  GROUP BY journey_id
)
UPDATE public.user_journeys uj
SET current_step = GREATEST(0, ft.prev_step),
    last_step_at = NULL
FROM failed_today ft
WHERE uj.id = ft.journey_id
  AND uj.status = 'active';

DELETE FROM public.journey_step_log
WHERE created_at >= '2026-05-09 12:00:00+00'
  AND created_at <  '2026-05-09 13:00:00+00'
  AND reason = 'send_failed_400';
