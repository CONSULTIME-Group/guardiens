-- Lot J2-B : pilotage d'Alma. Colonnes nullables ajoutées, aucune ligne existante réécrite.
ALTER TABLE public.alma_conversations
  ADD COLUMN IF NOT EXISTS classification jsonb,
  ADD COLUMN IF NOT EXISTS proposed_action jsonb,
  ADD COLUMN IF NOT EXISTS chips jsonb,
  ADD COLUMN IF NOT EXISTS page_path text;

COMMENT ON COLUMN public.alma_conversations.classification IS 'Lot J2-B : intent, frustration 0-3, bug_suspected, bug_item, churn, unanswered, source (model|patterns).';
COMMENT ON COLUMN public.alma_conversations.proposed_action IS 'Lot J2-B : action cliquable proposée {label, path, reason}.';

CREATE INDEX IF NOT EXISTS idx_alma_conversations_user_created ON public.alma_conversations (user_id, created_at DESC);

-- Retour utile / pas utile
CREATE TABLE public.alma_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.alma_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value text NOT NULL CHECK (value IN ('useful', 'not_useful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.alma_feedback TO authenticated;
GRANT ALL ON public.alma_feedback TO service_role;
ALTER TABLE public.alma_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members rate their own Alma answers" ON public.alma_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.alma_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );
CREATE POLICY "Members change their own Alma rating" ON public.alma_feedback
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members read their own Alma rating" ON public.alma_feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins read Alma ratings" ON public.alma_feedback
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Rejeu du jeu de non-régression
CREATE TABLE public.alma_replay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  total integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT, INSERT ON public.alma_replay_runs TO authenticated;
GRANT ALL ON public.alma_replay_runs TO service_role;
ALTER TABLE public.alma_replay_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read replay runs" ON public.alma_replay_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins store replay runs" ON public.alma_replay_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND run_by = auth.uid());

-- Action à 10 minutes : chemin ouvert, ou publication, candidature, réponse.
CREATE OR REPLACE FUNCTION public.alma_answer_acted(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.alma_conversations c
    WHERE c.id = p_conversation_id AND c.user_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.analytics_events e
        WHERE e.user_id = c.user_id
          AND e.created_at > c.created_at AND e.created_at <= c.created_at + interval '10 minutes'
          AND (
            (e.event_type = 'page_view' AND c.proposed_action ? 'path'
              AND e.metadata->>'path' = split_part(c.proposed_action->>'path', '?', 1))
            OR e.event_type IN ('sit_publish_succeeded', 'application_submitted', 'mission_response_submitted_from_modal', 'answer_submit')
          )
      )
      OR EXISTS (SELECT 1 FROM public.applications a WHERE a.sitter_id = c.user_id AND a.created_at > c.created_at AND a.created_at <= c.created_at + interval '10 minutes')
      OR EXISTS (SELECT 1 FROM public.small_missions m WHERE m.user_id = c.user_id AND m.created_at > c.created_at AND m.created_at <= c.created_at + interval '10 minutes')
      OR EXISTS (SELECT 1 FROM public.small_mission_responses r WHERE r.responder_id = c.user_id AND r.created_at > c.created_at AND r.created_at <= c.created_at + interval '10 minutes')
      OR EXISTS (SELECT 1 FROM public.community_answers q WHERE q.author_id = c.user_id AND q.created_at > c.created_at AND q.created_at <= c.created_at + interval '10 minutes')
    )
  );
$$;
REVOKE ALL ON FUNCTION public.alma_answer_acted(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alma_answer_acted(uuid) TO service_role;

-- Taux d'action à 10 minutes, par type d'action et par registre (admin).
CREATE OR REPLACE FUNCTION public.admin_alma_action_rate(p_days integer DEFAULT 30)
RETURNS TABLE (action_reason text, register text, answers bigint, acted bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT coalesce(c.proposed_action->>'reason', 'aucune') AS action_reason,
         coalesce(c.register, 'inconnu') AS register,
         count(*)::bigint AS answers,
         count(*) FILTER (WHERE public.alma_answer_acted(c.id))::bigint AS acted
  FROM public.alma_conversations c
  WHERE c.created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
    AND c.answer IS NOT NULL
    AND NOT public.has_role(c.user_id, 'admin')
  GROUP BY 1, 2
  ORDER BY 3 DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_alma_action_rate(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_alma_action_rate(integer) TO authenticated, service_role;

-- Synthèse hebdomadaire (email du lundi, service seulement).
CREATE OR REPLACE FUNCTION public.alma_weekly_summary(p_since timestamptz DEFAULT now() - interval '7 days')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH real AS (
    SELECT c.* FROM public.alma_conversations c
    WHERE c.created_at >= p_since AND c.answer IS NOT NULL AND c.user_id IS NOT NULL
      AND NOT public.has_role(c.user_id, 'admin')
  )
  SELECT jsonb_build_object(
    'conversations', (SELECT count(*) FROM real),
    'chips', (SELECT count(*) FROM real WHERE question IN ('Je postule', 'Comment se passe une garde ?', 'Comment se passe une garde, côté gardien ?', 'Comment se passe une garde, côté propriétaire ?', 'Un coup de main près de chez moi', 'Par où je commence ?', 'Qu''est-ce qui manque à mon profil ?')),
    'with_action', (SELECT count(*) FROM real WHERE proposed_action IS NOT NULL),
    'acted', (SELECT count(*) FROM real WHERE proposed_action IS NOT NULL AND public.alma_answer_acted(real.id)),
    'rated', (SELECT count(*) FROM public.alma_feedback f JOIN real r ON r.id = f.conversation_id),
    'not_useful', (SELECT count(*) FROM public.alma_feedback f JOIN real r ON r.id = f.conversation_id WHERE f.value = 'not_useful'),
    'signals', (SELECT coalesce(jsonb_object_agg(signal_type, n), '{}'::jsonb) FROM (
        SELECT signal_type, count(*) n FROM public.admin_signals
        WHERE signal_type LIKE 'alma\_%' AND detected_at >= p_since GROUP BY 1) s),
    'unanswered', (SELECT coalesce(jsonb_agg(q), '[]'::jsonb) FROM (
        SELECT left(question, 160) q FROM real
        WHERE (classification->>'unanswered')::boolean IS TRUE
        ORDER BY created_at DESC LIMIT 3) u)
  );
$$;
REVOKE ALL ON FUNCTION public.alma_weekly_summary(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alma_weekly_summary(timestamptz) TO service_role;