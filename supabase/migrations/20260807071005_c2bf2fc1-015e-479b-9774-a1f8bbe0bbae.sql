-- Point 4 : borne de pertinence des candidatures
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
    AND COALESCE(s.end_date::date, s.start_date::date) >= current_date - 7;
$function$;

-- Point 4 bis : brouillons, meme motif de filtre trop serre
CREATE OR REPLACE FUNCTION public.detect_stale_drafts()
 RETURNS TABLE(sit_id uuid, sit_title text, city text, start_date date, owner_id uuid, owner_first_name text, owner_email text, days_since_created integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.id,
    s.title,
    s.city,
    s.start_date::date,
    s.user_id,
    owner.first_name,
    owner.email,
    (EXTRACT(EPOCH FROM (now() - s.created_at))::integer / 86400)
  FROM sits s
  JOIN profiles owner ON owner.id = s.user_id
  WHERE s.status = 'draft'::sit_status
    AND s.created_at < now() - interval '48 hours'
    AND (
      s.start_date IS NULL
      OR COALESCE(s.end_date::date, s.start_date::date) >= current_date
    )
    AND owner.email IS NOT NULL
  ORDER BY s.created_at ASC;
$function$;

-- Point 5 : solde automatique des candidatures orphelines
-- Les deux garde-fous d'ecriture refusent une transition faite par le service
-- role (auth.uid() est nul). On ouvre une porte etroite, limitee a la mise en
-- 'cancelled' declenchee par le job de solde.
CREATE OR REPLACE FUNCTION public.applications_guard_status_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
BEGIN
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
$function$;

CREATE OR REPLACE FUNCTION public.enforce_application_status_transitions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_owner boolean;
  v_via_rpc text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
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
$function$;

CREATE OR REPLACE FUNCTION public.close_orphan_applications(p_grace_hours integer DEFAULT 24)
 RETURNS TABLE(application_id uuid, sit_id uuid, sit_title text, sit_status text, sitter_id uuid, sitter_first_name text, sitter_email text, owner_first_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ids uuid[];
BEGIN
  PERFORM set_config('app.system_close', '1', true);

  SELECT array_agg(a.id) INTO v_ids
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  WHERE a.status IN ('pending'::application_status, 'viewed'::application_status, 'discussing'::application_status)
    AND s.status IN ('cancelled'::sit_status, 'archived'::sit_status)
    AND s.updated_at < now() - make_interval(hours => p_grace_hours);

  IF v_ids IS NULL THEN
    PERFORM set_config('app.system_close', '', true);
    RETURN;
  END IF;

  UPDATE public.applications a
  SET status = 'cancelled'::application_status,
      updated_at = now()
  WHERE a.id = ANY(v_ids);

  PERFORM set_config('app.system_close', '', true);

  RETURN QUERY
  SELECT
    a.id,
    a.sit_id,
    s.title,
    s.status::text,
    a.sitter_id,
    sitter.first_name,
    sitter.email,
    owner.first_name
  FROM public.applications a
  JOIN public.sits s ON s.id = a.sit_id
  JOIN public.profiles sitter ON sitter.id = a.sitter_id
  JOIN public.profiles owner ON owner.id = s.user_id
  WHERE a.id = ANY(v_ids)
    AND sitter.email IS NOT NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.close_orphan_applications(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_orphan_applications(integer) TO service_role;