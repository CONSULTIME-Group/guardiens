-- 1. Colonne viewed_at
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

CREATE INDEX IF NOT EXISTS applications_sit_status_idx
  ON public.applications (sit_id, status);

-- 2. RPC idempotente pour marquer toutes les candidatures en attente d'un sit
--    comme "vues" par le propriétaire.
CREATE OR REPLACE FUNCTION public.mark_sit_applications_viewed(p_sit_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT user_id INTO v_owner_id FROM public.sits WHERE id = p_sit_id;
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'sit_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  WITH updated AS (
    UPDATE public.applications
       SET status = 'viewed'::application_status,
           viewed_at = COALESCE(viewed_at, now())
     WHERE sit_id = p_sit_id
       AND status = 'pending'::application_status
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_sit_applications_viewed(uuid) TO authenticated;

-- 3. Mise à jour de detect_pending_applications : inclure viewed comme "toujours sans réponse"
CREATE OR REPLACE FUNCTION public.detect_pending_applications()
RETURNS TABLE(
  application_id uuid,
  sit_id uuid,
  sit_title text,
  sitter_id uuid,
  sitter_first_name text,
  owner_id uuid,
  owner_first_name text,
  owner_email text,
  hours_since_created integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
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
    EXTRACT(EPOCH FROM (now() - a.created_at))::integer / 3600
  FROM applications a
  JOIN sits s ON s.id = a.sit_id
  JOIN profiles sitter ON sitter.id = a.sitter_id
  JOIN profiles owner ON owner.id = s.user_id
  WHERE a.status IN ('pending'::application_status, 'viewed'::application_status)
    AND a.created_at < now() - interval '48 hours'
    AND owner.email IS NOT NULL;
$$;