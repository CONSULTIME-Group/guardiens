-- 1. Guards: allow the automatic pending/viewed -> discussing transition
CREATE OR REPLACE FUNCTION public.applications_guard_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_owner uuid;
BEGIN
  IF coalesce(current_setting('app.auto_discussing', true), '') = '1' THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.quick_action', true), '') = '1' THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('app.system_close', true), '') = '1'
     AND NEW.status = 'cancelled'::application_status THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT s.user_id INTO v_owner FROM public.sits s WHERE s.id = OLD.sit_id;
    IF auth.uid() IS DISTINCT FROM v_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Only the sit owner can change application status';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.enforce_application_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  is_owner boolean;
  v_via_rpc text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF coalesce(current_setting('app.auto_discussing', true), '') = '1' THEN
    IF NEW.status = 'discussing'::application_status
       AND OLD.status IN ('pending'::application_status, 'viewed'::application_status) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'auto_discussing_forbidden_transition' USING ERRCODE = '42501';
  END IF;

  IF coalesce(current_setting('app.system_close', true), '') = '1' THEN
    IF NEW.status = 'cancelled'::application_status
       AND OLD.status IN ('pending'::application_status, 'viewed'::application_status, 'discussing'::application_status) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'system_close_forbidden_transition' USING ERRCODE = '42501';
  END IF;

  IF coalesce(current_setting('app.quick_action', true), '') = '1' THEN
    IF NEW.status = 'rejected'::application_status
       AND OLD.status IN ('pending'::application_status, 'viewed'::application_status, 'discussing'::application_status) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'quick_action_forbidden_transition' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.sits s
    WHERE s.id = NEW.sit_id AND s.user_id = auth.uid()
  ) INTO is_owner;

  IF is_owner THEN
    IF NEW.status = 'accepted'::application_status THEN
      v_via_rpc := current_setting('app.via_accept_rpc', true);
      IF v_via_rpc IS DISTINCT FROM '1' THEN
        RAISE EXCEPTION
          'must_use_accept_rpc: acceptez la candidature via la RPC accept_application'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    IF OLD.status = 'rejected'::application_status
       AND NEW.status <> 'pending'::application_status THEN
      RAISE EXCEPTION
        'invalid_transition_from_rejected: seule la reouverture (rejected -> pending) est autorisee'
        USING ERRCODE = '22023';
    END IF;

    RETURN NEW;
  END IF;

  IF auth.uid() = NEW.sitter_id THEN
    IF NEW.status IN ('cancelled'::application_status) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Sitters can only withdraw their application (status=cancelled).';
  END IF;

  RAISE EXCEPTION 'Not authorized to change application status.';
END;
$fn$;

-- 2. Trigger on messages: owner first non-system message => discussing
CREATE OR REPLACE FUNCTION public.mark_application_discussing_on_owner_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_sit uuid;
  v_sitter uuid;
BEGIN
  IF coalesce(NEW.is_system, false) THEN
    RETURN NEW;
  END IF;

  SELECT c.sit_id, c.sitter_id
    INTO v_sit, v_sitter
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id
    AND c.context_type = 'sit_application'::conversation_context
    AND c.owner_id = NEW.sender_id
    AND c.sit_id IS NOT NULL;

  IF v_sit IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.auto_discussing', '1', true);
  UPDATE public.applications a
     SET status = 'discussing'::application_status
   WHERE a.sit_id = v_sit
     AND a.sitter_id = v_sitter
     AND a.status IN ('pending'::application_status, 'viewed'::application_status);
  PERFORM set_config('app.auto_discussing', '', true);

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_mark_application_discussing ON public.messages;
CREATE TRIGGER trg_mark_application_discussing
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.mark_application_discussing_on_owner_message();

-- 3. Backfill of already inconsistent applications
DO $do$
BEGIN
  PERFORM set_config('app.auto_discussing', '1', true);
  UPDATE public.applications a
     SET status = 'discussing'::application_status
   WHERE a.status IN ('pending'::application_status, 'viewed'::application_status)
     AND EXISTS (
       SELECT 1
       FROM public.conversations c
       JOIN public.messages m ON m.conversation_id = c.id
       JOIN public.sits s ON s.id = a.sit_id
       WHERE c.sit_id = a.sit_id
         AND c.sitter_id = a.sitter_id
         AND c.context_type = 'sit_application'::conversation_context
         AND m.sender_id = s.user_id
         AND coalesce(m.is_system, false) = false
     );
  PERFORM set_config('app.auto_discussing', '', true);
END
$do$;

-- 4. Never nudge an owner who already replied
CREATE OR REPLACE FUNCTION public.detect_pending_applications()
RETURNS TABLE (
  application_id uuid,
  sit_id uuid,
  sit_title text,
  sitter_id uuid,
  sitter_first_name text,
  owner_id uuid,
  owner_first_name text,
  owner_email text,
  hours_since_created integer,
  sit_start_date date,
  sit_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
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
$fn$;

-- 5. Full application history for the sitter, draft content masked
CREATE OR REPLACE FUNCTION public.get_my_applications()
RETURNS TABLE (
  application_id uuid,
  status application_status,
  created_at timestamptz,
  viewed_at timestamptz,
  sit_id uuid,
  sit_status sit_status,
  sit_title text,
  sit_start_date date,
  sit_end_date date,
  sit_city text,
  owner_id uuid,
  cover_photo text,
  content_visible boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT
    a.id,
    a.status,
    a.created_at,
    a.viewed_at,
    s.id,
    s.status,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.title END,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.start_date::date END,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.end_date::date END,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL ELSE s.city END,
    s.user_id,
    CASE WHEN s.status = 'draft'::sit_status THEN NULL
         ELSE (SELECT p.photos[1] FROM properties p WHERE p.id = s.property_id) END,
    (s.status <> 'draft'::sit_status)
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  WHERE a.sitter_id = auth.uid()
  ORDER BY a.created_at DESC;
$fn$;

REVOKE ALL ON FUNCTION public.get_my_applications() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_applications() TO authenticated;