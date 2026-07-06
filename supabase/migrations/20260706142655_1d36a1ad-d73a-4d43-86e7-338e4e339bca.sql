
-- ============================================================
-- Alma Pass 4 — alma_whisper_history + RPC helpers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.alma_whisper_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  whisper_type text NOT NULL,
  surface text NOT NULL,
  emitted_at timestamptz NOT NULL DEFAULT now(),
  dismissed_reason text,
  action_taken text,
  metadata jsonb,
  session_id text
);

GRANT SELECT, INSERT ON public.alma_whisper_history TO authenticated;
GRANT ALL ON public.alma_whisper_history TO service_role;

ALTER TABLE public.alma_whisper_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own whisper history"
  ON public.alma_whisper_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own whisper history"
  ON public.alma_whisper_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role manages whisper history"
  ON public.alma_whisper_history FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_alma_whisper_history_user_type_date
  ON public.alma_whisper_history(user_id, whisper_type, emitted_at DESC);

-- ------------------------------------------------------------
-- RPC: types blacklistés (3 dismiss volontaires en 30 jours)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_alma_blacklisted_types()
RETURNS TABLE(whisper_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT whisper_type
  FROM public.alma_whisper_history
  WHERE user_id = auth.uid()
    AND dismissed_reason = 'closed_manually'
    AND emitted_at > now() - interval '30 days'
  GROUP BY whisper_type
  HAVING count(*) >= 3;
$$;

GRANT EXECUTE ON FUNCTION public.get_alma_blacklisted_types() TO authenticated;

-- ------------------------------------------------------------
-- RPC: contexte annonce (vues, candidatures, tendance, owner)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sit_context_for_alma(_sit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_views_total int;
  v_views_last_week int;
  v_views_prev_week int;
  v_applications int;
  v_owner_id uuid;
  v_reply_median int;
  v_created timestamptz;
BEGIN
  SELECT owner_id, created_at INTO v_owner_id, v_created
  FROM public.sits WHERE id = _sit_id;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT count(*) INTO v_views_total
    FROM public.analytics_events
    WHERE event_name = 'sit_view' AND (properties->>'sit_id')::uuid = _sit_id;

  SELECT count(*) INTO v_views_last_week
    FROM public.analytics_events
    WHERE event_name = 'sit_view'
      AND (properties->>'sit_id')::uuid = _sit_id
      AND created_at > now() - interval '7 days';

  SELECT count(*) INTO v_views_prev_week
    FROM public.analytics_events
    WHERE event_name = 'sit_view'
      AND (properties->>'sit_id')::uuid = _sit_id
      AND created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days';

  SELECT count(*) INTO v_applications
    FROM public.applications WHERE sit_id = _sit_id;

  SELECT reply_median_minutes INTO v_reply_median
    FROM public.owner_profiles WHERE id = v_owner_id;

  RETURN jsonb_build_object(
    'found', true,
    'sit_id', _sit_id,
    'created_at', v_created,
    'view_count', v_views_total,
    'view_count_last_week', v_views_last_week,
    'view_count_prev_week', v_views_prev_week,
    'applications_count', v_applications,
    'owner_reply_median_minutes', v_reply_median
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sit_context_for_alma(uuid) TO authenticated;

-- ------------------------------------------------------------
-- RPC: contexte sitter vu par un owner (activité + réciprocité)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_sitter_context_for_alma(_sitter_id uuid, _owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed int;
  v_applications int;
  v_reply_median int;
  v_reciprocal_views int;
BEGIN
  SELECT count(*) INTO v_completed
    FROM public.sits
    WHERE assigned_sitter_id = _sitter_id AND status = 'completed';

  SELECT count(*) INTO v_applications
    FROM public.applications WHERE sitter_id = _sitter_id;

  SELECT reply_median_minutes INTO v_reply_median
    FROM public.sitter_profiles WHERE id = _sitter_id;

  SELECT count(*) INTO v_reciprocal_views
    FROM public.analytics_events ae
    JOIN public.sits s ON s.id = (ae.properties->>'sit_id')::uuid
    WHERE ae.event_name = 'sit_view'
      AND ae.user_id = _sitter_id
      AND s.owner_id = _owner_id
      AND ae.created_at > now() - interval '7 days';

  RETURN jsonb_build_object(
    'sitter_id', _sitter_id,
    'completed_sits', v_completed,
    'applications_count', v_applications,
    'reply_median_minutes', v_reply_median,
    'reciprocal_views_last_7d', v_reciprocal_views
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sitter_context_for_alma(uuid, uuid) TO authenticated;

-- ------------------------------------------------------------
-- RPC: retour d'absence longue
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dormant_recovery_context(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_seen timestamptz;
  v_days int;
  v_new_sits int;
BEGIN
  SELECT last_seen_at INTO v_last_seen
    FROM public.profiles WHERE id = _user_id;

  IF v_last_seen IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  v_days := EXTRACT(DAY FROM now() - v_last_seen)::int;

  SELECT count(*) INTO v_new_sits
    FROM public.sits
    WHERE status = 'published'
      AND created_at > v_last_seen;

  RETURN jsonb_build_object(
    'found', true,
    'days_since_last_seen', v_days,
    'new_sits_since_last_seen', v_new_sits
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dormant_recovery_context(uuid) TO authenticated;
