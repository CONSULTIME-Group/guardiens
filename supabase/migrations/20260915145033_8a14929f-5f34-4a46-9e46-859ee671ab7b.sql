ALTER TABLE public.small_missions ADD COLUMN IF NOT EXISTS notify_after timestamptz NULL;

COMMENT ON COLUMN public.small_missions.notify_after IS 'Date a partir de laquelle la publication peut etre annoncee par email. NULL = diffusion immediate. Le premier projet d un porteur attend 12 heures.';

CREATE OR REPLACE FUNCTION public.set_projet_notify_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category::text = 'projet' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.small_missions m
      WHERE m.user_id = NEW.user_id
        AND m.category::text = 'projet'
        AND m.id <> NEW.id
    ) THEN
      NEW.notify_after := now() + interval '12 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_projet_notify_after ON public.small_missions;
CREATE TRIGGER trg_set_projet_notify_after
BEFORE INSERT ON public.small_missions
FOR EACH ROW EXECUTE FUNCTION public.set_projet_notify_after();

CREATE OR REPLACE FUNCTION public.admin_release_projet(_mission_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.small_missions
  SET notify_after = now()
  WHERE id = _mission_id AND category::text = 'projet';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_release_projet(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_release_projet(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_mutual_aid_funnel_metrics(p_period_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

  -- Les projets participatifs ont leurs propres indicateurs : ils sortent de
  -- l entraide partout, sinon les deux mesures deviennent illisibles.
  SELECT COUNT(*)::int INTO v_published
  FROM small_missions
  WHERE created_at >= v_start AND category::text <> 'projet';

  SELECT COUNT(DISTINCT m.id)::int INTO v_with_response
  FROM small_missions m
  JOIN small_mission_responses r ON r.mission_id = m.id
  WHERE m.created_at >= v_start AND m.category::text <> 'projet';

  SELECT COUNT(DISTINCT m.id)::int INTO v_with_accepted
  FROM small_missions m
  JOIN small_mission_responses r ON r.mission_id = m.id AND r.status = 'accepted'
  WHERE m.created_at >= v_start AND m.category::text <> 'projet';

  SELECT COUNT(*)::int INTO v_completed
  FROM small_missions
  WHERE created_at >= v_start AND status = 'completed' AND category::text <> 'projet';

  SELECT COUNT(DISTINCT m.id)::int INTO v_with_feedback
  FROM small_missions m
  JOIN mission_feedbacks f ON f.mission_id = m.id
  WHERE m.created_at >= v_start AND m.category::text <> 'projet';

  SELECT COUNT(*)::int INTO v_q_posted
  FROM community_questions
  WHERE created_at >= v_start;

  SELECT COUNT(DISTINCT q.id)::int INTO v_q_with_answer
  FROM community_questions q
  JOIN community_answers a ON a.question_id = q.id
  WHERE q.created_at >= v_start;

  WITH firsts AS (
    SELECT m.id,
      EXTRACT(EPOCH FROM (MIN(r.created_at) - m.created_at)) AS s
    FROM small_missions m
    JOIN small_mission_responses r ON r.mission_id = m.id
    WHERE m.created_at >= v_start AND m.category::text <> 'projet'
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