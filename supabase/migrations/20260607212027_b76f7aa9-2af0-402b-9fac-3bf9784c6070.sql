
ALTER TABLE public.sitter_profiles
  ADD COLUMN IF NOT EXISTS reply_median_minutes integer,
  ADD COLUMN IF NOT EXISTS reply_stats_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.refresh_sitter_reply_stats(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_median integer;
BEGIN
  -- Pour chaque conversation où le gardien participe,
  -- on cherche le 1er message du propriétaire dans les 30 derniers jours,
  -- puis la 1re réponse du gardien après ce message.
  WITH owner_msgs AS (
    SELECT m.conversation_id, MIN(m.created_at) AS first_owner_msg
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE c.sitter_id = p_user_id
      AND m.sender_id = c.owner_id
      AND m.is_system = false
      AND m.created_at >= now() - interval '30 days'
    GROUP BY m.conversation_id
  ),
  sitter_replies AS (
    SELECT om.conversation_id,
           om.first_owner_msg,
           MIN(m.created_at) AS first_sitter_reply
    FROM owner_msgs om
    JOIN public.messages m ON m.conversation_id = om.conversation_id
    WHERE m.sender_id = p_user_id
      AND m.is_system = false
      AND m.created_at > om.first_owner_msg
    GROUP BY om.conversation_id, om.first_owner_msg
  )
  SELECT (percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (first_sitter_reply - first_owner_msg)) / 60.0
          ))::int
  INTO v_median
  FROM sitter_replies;

  UPDATE public.sitter_profiles
  SET reply_median_minutes = v_median,
      reply_stats_updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_all_sitter_reply_stats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN SELECT user_id FROM public.sitter_profiles LOOP
    PERFORM public.refresh_sitter_reply_stats(r.user_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Premier calcul immédiat pour amorcer la donnée
SELECT public.refresh_all_sitter_reply_stats();
