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
    AND s.status::text IN ('cancelled', 'archived', 'expired')
    AND s.updated_at < now() - make_interval(hours => p_grace_hours);

  IF v_ids IS NULL THEN
    PERFORM set_config('app.system_close', '', true);
    RETURN;
  END IF;

  -- public.applications ne possede pas de colonne updated_at : ne rien y ecrire.
  UPDATE public.applications a
  SET status = 'cancelled'::application_status
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
  WHERE a.id = ANY(v_ids);
END;
$function$;