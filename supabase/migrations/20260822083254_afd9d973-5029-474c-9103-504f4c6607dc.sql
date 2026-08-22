-- 1. Détection des discussions engagées mais jamais confirmées.
-- Le nudge existant (detect_pending_applications) exclut toute candidature où
-- le propriétaire a déjà écrit : c'est précisément le trou (échange de numéro
-- puis plus rien). Cette fonction cible l'inverse : les deux parties ont écrit,
-- silence depuis 48h, candidature toujours ouverte.
CREATE OR REPLACE FUNCTION public.detect_stalled_discussions()
RETURNS TABLE (
  application_id uuid,
  sit_id uuid,
  sit_title text,
  sitter_id uuid,
  sitter_first_name text,
  owner_id uuid,
  owner_first_name text,
  owner_email text,
  msg_count integer,
  hours_since_last_message integer,
  sit_start_date date,
  sit_status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.sit_id,
    s.title,
    a.sitter_id,
    sitter.first_name,
    s.user_id,
    owner.first_name,
    owner.email,
    COUNT(m.id)::integer,
    EXTRACT(EPOCH FROM (now() - max(m.created_at)))::integer / 3600,
    s.start_date::date,
    s.status::text
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  JOIN profiles sitter ON sitter.id = a.sitter_id
  JOIN profiles owner ON owner.id = s.user_id
  JOIN conversations c ON c.sit_id = a.sit_id AND c.sitter_id = a.sitter_id
  JOIN messages m ON m.conversation_id = c.id AND COALESCE(m.is_system, false) = false
  WHERE a.status IN ('pending'::application_status, 'viewed'::application_status, 'discussing'::application_status)
    AND owner.email IS NOT NULL
    AND s.status IN ('published'::sit_status, 'confirmed'::sit_status, 'in_progress'::sit_status)
    AND COALESCE(s.end_date::date, s.start_date::date) >= current_date - 7
  GROUP BY a.id, a.sit_id, s.title, a.sitter_id, sitter.first_name,
           s.user_id, owner.first_name, owner.email, s.start_date, s.status
  HAVING COUNT(m.id) FILTER (WHERE m.sender_id = s.user_id) >= 1
     AND COUNT(m.id) FILTER (WHERE m.sender_id = a.sitter_id) >= 1
     AND max(m.created_at) < now() - interval '48 hours';
$$;

REVOKE ALL ON FUNCTION public.detect_stalled_discussions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_stalled_discussions() TO service_role;

-- 2. Rattrapage unique : les accords signés côté propriétaire avant l'arrivée
-- du trigger n'ont jamais déclenché l'email gardien. On rejoue l'appel à
-- notify-accord-signed (idempotent : la notification in-app déjà insérée par
-- le rattrapage précédent ne sera pas dupliquée, seul l'email part).
DO $$
DECLARE
  v_service_key text;
  r record;
BEGIN
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE WARNING 'detect_stalled_discussions migration: vault key missing, rattrapage email non joué';
    RETURN;
  END IF;

  FOR r IN
    SELECT ga.garde_id, ga.user_id, ga.role
    FROM public.garde_accords ga
    WHERE ga.role = 'proprio'
      AND ga.accepted
      AND NOT EXISTS (
        SELECT 1 FROM public.garde_accords gs
        WHERE gs.garde_id = ga.garde_id
          AND gs.user_id <> ga.user_id
          AND gs.accepted
      )
  LOOP
    PERFORM net.http_post(
      url := 'https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/notify-accord-signed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'garde_id', r.garde_id,
        'signer_id', r.user_id,
        'signer_role', r.role
      )
    );
  END LOOP;
END $$;