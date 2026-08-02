CREATE OR REPLACE FUNCTION public.get_email_pipeline_health(p_transactional_templates text[] DEFAULT '{}'::text[])
 RETURNS TABLE(last_run_at timestamp with time zone, last_run_age_seconds numeric, oldest_pending_age_seconds numeric, stuck_rate_limit boolean, retry_after_until timestamp with time zone, dlq_last_hour bigint, failure_rate_1h numeric, attempts_1h bigint, deferred_pending_total bigint, deferred_pending_over_2h bigint, deferred_pending_over_24h bigint, deferred_transactional_overdue_2h bigint, deferred_attempts_ge_3 bigint, deferred_oldest_age_seconds numeric, deferred_expired_24h bigint, deferred_abandoned_24h bigint, deferred_stale_rows jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
DECLARE
  _oldest timestamptz;
  _last_run timestamptz;
  _retry_until timestamptz;
  _sent bigint := 0;
  _failed bigint := 0;
  _dlq bigint := 0;
  _def_oldest timestamptz;
BEGIN
  SELECT s.last_run_at, s.retry_after_until
    INTO _last_run, _retry_until
    FROM public.email_send_state s WHERE s.id = 1;

  BEGIN
    SELECT MIN(enqueued_at) INTO _oldest FROM (
      SELECT enqueued_at FROM pgmq.q_auth_emails
      UNION ALL
      SELECT enqueued_at FROM pgmq.q_transactional_emails
    ) q;
  EXCEPTION WHEN undefined_table THEN
    _oldest := NULL;
  END;

  SELECT
    COUNT(*) FILTER (WHERE status = 'sent'),
    COUNT(*) FILTER (WHERE status IN ('failed','rate_limited')),
    COUNT(*) FILTER (WHERE status = 'dlq')
  INTO _sent, _failed, _dlq
  FROM public.email_send_log
  WHERE created_at >= now() - interval '1 hour';

  last_run_at := _last_run;
  last_run_age_seconds := CASE WHEN _last_run IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (now() - _last_run)) END;
  oldest_pending_age_seconds := CASE WHEN _oldest IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (now() - _oldest)) END;
  stuck_rate_limit := (_retry_until IS NOT NULL AND _retry_until > now() + interval '30 minutes');
  retry_after_until := _retry_until;
  dlq_last_hour := _dlq;
  attempts_1h := _sent + _failed;
  failure_rate_1h := CASE WHEN (_sent + _failed) = 0 THEN 0
    ELSE (_failed::numeric / (_sent + _failed)::numeric) END;

  -- File d'emails differes.
  -- Le retard se mesure sur scheduled_for depasse, pas sur l'anciennete
  -- d'enfilement : une ligne peut legitimement attendre plusieurs jours
  -- a cause du plafond de frequence.
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE q.scheduled_for < now() - interval '2 hours'),
    COUNT(*) FILTER (WHERE q.scheduled_for < now() - interval '24 hours'),
    COUNT(*) FILTER (
      WHERE q.scheduled_for < now() - interval '2 hours'
        AND q.template_name = ANY(p_transactional_templates)
    ),
    COUNT(*) FILTER (WHERE q.attempts >= 3),
    MIN(q.scheduled_for) FILTER (WHERE q.scheduled_for < now())
  INTO deferred_pending_total, deferred_pending_over_2h, deferred_pending_over_24h,
       deferred_transactional_overdue_2h, deferred_attempts_ge_3, _def_oldest
  FROM public.email_deferred_queue q
  WHERE q.status = 'pending';

  deferred_oldest_age_seconds := CASE WHEN _def_oldest IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (now() - _def_oldest)) END;

  -- Mesure sur first_enqueued_at : updated_at est reecrit par un trigger a
  -- chaque mise a jour de ligne, donc sensible aux operations de maintenance.
  SELECT COUNT(*) INTO deferred_expired_24h
  FROM public.email_deferred_queue q
  WHERE q.status = 'expired' AND q.first_enqueued_at >= now() - interval '24 hours';

  SELECT COUNT(*) INTO deferred_abandoned_24h
  FROM public.email_deferred_queue q
  WHERE q.status = 'abandoned' AND q.first_enqueued_at >= now() - interval '24 hours';

  -- Exemples pour le message d'alerte uniquement ; les compteurs ne
  -- dependent pas de cette liste plafonnee.
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'scheduled_for'), '[]'::jsonb)
  INTO deferred_stale_rows
  FROM (
    SELECT jsonb_build_object(
      'template_name', q.template_name,
      'recipient_email', q.recipient_email,
      'attempts', q.attempts,
      'defer_reason', q.defer_reason,
      'first_enqueued_at', q.first_enqueued_at,
      'scheduled_for', q.scheduled_for,
      'age_seconds', round(EXTRACT(EPOCH FROM (now() - q.scheduled_for)))
    ) AS x
    FROM public.email_deferred_queue q
    WHERE q.status = 'pending'
      AND q.scheduled_for < now() - interval '2 hours'
    ORDER BY q.scheduled_for ASC
    LIMIT 50
  ) s;

  RETURN NEXT;
END;
$function$;