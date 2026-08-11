-- 1. unpublish_sit(uuid, text) : ajoute unpublished_at = now(). Rien d'autre ne change.
CREATE OR REPLACE FUNCTION public.unpublish_sit(p_sit_id uuid, p_reason text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_end_date date;
  v_cancelled integer := 0;
  v_reason text := NULLIF(btrim(coalesce(p_reason, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  SELECT user_id, status::text, end_date
    INTO v_owner, v_status, v_end_date
  FROM public.sits
  WHERE id = p_sit_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'SIT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_owner <> v_uid AND NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0001';
  END IF;

  IF v_status <> 'published' THEN
    RAISE EXCEPTION 'INVALID_STATUS:%', v_status USING ERRCODE = 'P0001';
  END IF;

  IF v_end_date IS NOT NULL AND v_end_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'SIT_ENDED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.sits
     SET status = 'draft',
         last_unpublished_reason = COALESCE(v_reason, last_unpublished_reason),
         unpublished_at = now()
   WHERE id = p_sit_id;

  WITH cancelled_apps AS (
    UPDATE public.applications
       SET status = 'cancelled'
     WHERE sit_id = p_sit_id
       AND status IN ('pending', 'viewed', 'discussing')
    RETURNING 1
  )
  SELECT count(*) INTO v_cancelled FROM cancelled_apps;

  RETURN v_cancelled;
END;
$function$;

-- 2. Surcharge héritée à un seul argument : aucun appelant dans src/ ni dans
--    supabase/functions/ ne l'utilise, elle perdait silencieusement le motif.
DROP FUNCTION IF EXISTS public.unpublish_sit(uuid);

-- 3. Rattrapage. APPROXIMATION assumée : l'horodatage exact de dépublication
--    n'a jamais été écrit, on retient updated_at comme meilleure estimation
--    disponible, uniquement quand un motif existe et que la date manque.
UPDATE public.sits
   SET unpublished_at = updated_at
 WHERE status = 'draft'
   AND last_unpublished_reason IS NOT NULL
   AND unpublished_at IS NULL;