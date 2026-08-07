ALTER TABLE public.sit_notification_log
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'claimed',
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS release_reason text;

CREATE OR REPLACE FUNCTION public.claim_sit_notification(_user_id uuid, _source text, _sit_ids uuid[] DEFAULT '{}'::uuid[], _date date DEFAULT NULL::date)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date date := coalesce(_date, (now() AT TIME ZONE 'Europe/Paris')::date);
  v_key text;
  v_claimed boolean := false;
BEGIN
  v_key := 'sit-notification-' || _user_id::text || '-' || to_char(v_date, 'YYYY-MM-DD');

  INSERT INTO public.sit_notification_log (idempotency_key, user_id, notification_date, source, sit_ids, status)
  VALUES (v_key, _user_id, v_date, _source, coalesce(_sit_ids, '{}'), 'claimed')
  ON CONFLICT (idempotency_key) DO UPDATE
    SET source = EXCLUDED.source,
        sit_ids = EXCLUDED.sit_ids,
        status = 'claimed',
        released_at = NULL,
        release_reason = NULL
    WHERE public.sit_notification_log.status = 'released'
  RETURNING true INTO v_claimed;

  RETURN coalesce(v_claimed, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_sit_notification(_user_id uuid, _date date DEFAULT NULL::date, _reason text DEFAULT 'send_failed')
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.sit_notification_log
     SET status = 'released',
         released_at = now(),
         release_reason = coalesce(_reason, 'send_failed')
   WHERE idempotency_key = 'sit-notification-' || _user_id::text || '-' ||
         to_char(coalesce(_date, (now() AT TIME ZONE 'Europe/Paris')::date), 'YYYY-MM-DD')
     AND status <> 'released';
$function$;