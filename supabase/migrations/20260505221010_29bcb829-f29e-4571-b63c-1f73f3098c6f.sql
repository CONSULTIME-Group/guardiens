CREATE OR REPLACE FUNCTION public.admin_top_message_users(_since timestamptz DEFAULT NULL, _limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_start timestamptz;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  v_start := COALESCE(_since, '1970-01-01'::timestamptz);

  SELECT jsonb_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT
      m.sender_id AS user_id,
      p.first_name,
      p.avatar_url,
      p.role::text AS role,
      count(*)::int AS message_count,
      count(DISTINCT m.conversation_id)::int AS conv_count,
      max(m.created_at) AS last_message_at
    FROM messages m
    LEFT JOIN profiles p ON p.id = m.sender_id
    WHERE m.created_at >= v_start
      AND NOT m.is_system
    GROUP BY m.sender_id, p.first_name, p.avatar_url, p.role
    ORDER BY count(*) DESC
    LIMIT _limit
  ) t;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_top_message_users(timestamptz, int) TO authenticated;