
-- ============================================================================
-- Vague 32 : boucle gratitude entraide + funnel admin + pont vers garde
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) RPC admin : funnel entraide
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_mutual_aid_funnel_metrics(p_period_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start timestamptz := now() - (p_period_days || ' days')::interval;
  v_published integer := 0;
  v_with_response integer := 0;
  v_with_accepted integer := 0;
  v_completed integer := 0;
  v_with_feedback integer := 0;
  v_q_posted integer := 0;
  v_q_with_answer integer := 0;
  v_median_seconds numeric := NULL;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Missions publiées sur la période
  SELECT COUNT(*)::int INTO v_published
  FROM small_missions
  WHERE created_at >= v_start;

  -- Missions avec au moins 1 réponse (toute réponse, même retirée)
  SELECT COUNT(DISTINCT m.id)::int INTO v_with_response
  FROM small_missions m
  JOIN small_mission_responses r ON r.mission_id = m.id
  WHERE m.created_at >= v_start;

  -- Missions avec au moins 1 réponse acceptée
  SELECT COUNT(DISTINCT m.id)::int INTO v_with_accepted
  FROM small_missions m
  JOIN small_mission_responses r ON r.mission_id = m.id AND r.status = 'accepted'
  WHERE m.created_at >= v_start;

  -- Missions passées en completed
  SELECT COUNT(*)::int INTO v_completed
  FROM small_missions
  WHERE created_at >= v_start AND status = 'completed';

  -- Missions avec au moins 1 feedback laissé
  SELECT COUNT(DISTINCT m.id)::int INTO v_with_feedback
  FROM small_missions m
  JOIN mission_feedbacks f ON f.mission_id = m.id
  WHERE m.created_at >= v_start;

  -- Questions communauté
  SELECT COUNT(*)::int INTO v_q_posted
  FROM community_questions
  WHERE created_at >= v_start;

  SELECT COUNT(DISTINCT q.id)::int INTO v_q_with_answer
  FROM community_questions q
  JOIN community_answers a ON a.question_id = q.id
  WHERE q.created_at >= v_start;

  -- Temps médian publication → première réponse (secondes)
  WITH firsts AS (
    SELECT m.id,
      EXTRACT(EPOCH FROM (MIN(r.created_at) - m.created_at)) AS s
    FROM small_missions m
    JOIN small_mission_responses r ON r.mission_id = m.id
    WHERE m.created_at >= v_start
    GROUP BY m.id
  )
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY s) INTO v_median_seconds
  FROM firsts;

  RETURN jsonb_build_object(
    'period_days', p_period_days,
    'generated_at', now(),
    'missions', jsonb_build_object(
      'published', v_published,
      'with_response', v_with_response,
      'with_accepted', v_with_accepted,
      'completed', v_completed,
      'with_feedback', v_with_feedback,
      'rate_response', CASE WHEN v_published = 0 THEN NULL ELSE round((v_with_response::numeric / v_published) * 100, 1) END,
      'rate_accepted', CASE WHEN v_with_response = 0 THEN NULL ELSE round((v_with_accepted::numeric / v_with_response) * 100, 1) END,
      'rate_completed', CASE WHEN v_with_accepted = 0 THEN NULL ELSE round((v_completed::numeric / v_with_accepted) * 100, 1) END,
      'rate_feedback', CASE WHEN v_completed = 0 THEN NULL ELSE round((v_with_feedback::numeric / v_completed) * 100, 1) END,
      'rate_end_to_end', CASE WHEN v_published = 0 THEN NULL ELSE round((v_with_feedback::numeric / v_published) * 100, 1) END,
      'median_seconds_to_first_response', v_median_seconds
    ),
    'questions', jsonb_build_object(
      'posted', v_q_posted,
      'with_answer', v_q_with_answer,
      'rate_answered', CASE WHEN v_q_posted = 0 THEN NULL ELSE round((v_q_with_answer::numeric / v_q_posted) * 100, 1) END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_mutual_aid_funnel_metrics(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_mutual_aid_funnel_metrics(integer) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2) Nurturing sequence : helper-to-guard
-- ----------------------------------------------------------------------------
INSERT INTO nurturing_sequences (key, audience, description, enrollment_rule, anchor_field, active)
VALUES (
  'helper-to-guard',
  'all',
  'Reconnaît un coup de main donné en entraide, propose de découvrir les gardes proches. Un seul email, plafonné par le moteur.',
  '{"type": "helper_no_guard_activity", "min_age_days": 0, "window_days": 180}'::jsonb,
  'created_at',
  true
)
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  enrollment_rule = EXCLUDED.enrollment_rule,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO nurturing_steps (sequence_id, step_order, delay_hours, template_name, exit_condition)
SELECT id, 1, 0, 'helper-to-guard', '{"type": "has_guard_activity"}'::jsonb
FROM nurturing_sequences WHERE key = 'helper-to-guard'
ON CONFLICT (sequence_id, step_order) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  exit_condition = EXCLUDED.exit_condition,
  delay_hours = EXCLUDED.delay_hours;
