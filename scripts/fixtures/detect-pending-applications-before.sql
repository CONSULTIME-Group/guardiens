CREATE OR REPLACE FUNCTION public.detect_pending_applications()
 RETURNS TABLE(application_id uuid, sit_id uuid, sit_title text, sitter_id uuid, sitter_first_name text, owner_id uuid, owner_first_name text, owner_email text, hours_since_created integer, sit_start_date date, sit_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    a.id,
    a.sit_id,
    s.title,
    a.sitter_id,
    sitter.first_name,
    s.user_id,
    owner.first_name,
    owner.email,
    EXTRACT(EPOCH FROM (now() - a.created_at))::integer / 3600,
    s.start_date::date,
    s.status::text
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  JOIN profiles sitter ON sitter.id = a.sitter_id
  JOIN profiles owner ON owner.id = s.user_id
  WHERE a.status IN ('pending'::application_status, 'viewed'::application_status)
    AND a.created_at < now() - interval '48 hours'
    AND owner.email IS NOT NULL
    AND s.status IN ('published'::sit_status, 'confirmed'::sit_status, 'in_progress'::sit_status)
    AND COALESCE(s.end_date::date, s.start_date::date) >= current_date - 7
    AND NOT EXISTS (
      SELECT 1
      FROM conversations c
      JOIN messages m ON m.conversation_id = c.id
      WHERE c.sit_id = a.sit_id
        AND c.sitter_id = a.sitter_id
        AND m.sender_id = s.user_id
        AND COALESCE(m.is_system, false) = false
    );
$function$;
