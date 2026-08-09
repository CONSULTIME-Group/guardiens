-- Borne de confiance du suivi, identique à celle des ouvertures.
CREATE OR REPLACE FUNCTION public.email_tracking_start()
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT '2026-07-22T00:00:00Z'::timestamptz $$;

-- Réconciliation des clics captés par la route maison /go vers les compteurs.
CREATE OR REPLACE FUNCTION public.reconcile_email_click_events(p_message_id uuid DEFAULT NULL)
RETURNS TABLE(send_log_rows integer, mass_send_rows integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := public.email_tracking_start();
  v_log integer := 0;
  v_mass integer := 0;
BEGIN
  WITH agg AS (
    SELECT e.message_id::text AS message_id,
           min(e.created_at) AS first_at,
           max(e.created_at) AS last_at,
           count(*)::integer AS cnt,
           (array_agg(e.target_url ORDER BY e.created_at DESC)
              FILTER (WHERE e.target_url IS NOT NULL))[1] AS last_url
    FROM public.email_engagement_events e
    WHERE e.event_type = 'click'
      AND e.created_at >= v_start
      AND (p_message_id IS NULL OR e.message_id = p_message_id)
    GROUP BY 1
  ), upd AS (
    UPDATE public.email_send_log l
       SET first_clicked_at = LEAST(COALESCE(l.first_clicked_at, a.first_at), a.first_at),
           last_clicked_at  = GREATEST(COALESCE(l.last_clicked_at, a.last_at), a.last_at),
           click_count      = GREATEST(l.click_count, a.cnt),
           last_clicked_url = COALESCE(a.last_url, l.last_clicked_url)
      FROM agg a
     WHERE l.message_id = a.message_id
       AND (l.click_count < a.cnt
            OR l.first_clicked_at IS DISTINCT FROM LEAST(COALESCE(l.first_clicked_at, a.first_at), a.first_at)
            OR l.last_clicked_at IS DISTINCT FROM GREATEST(COALESCE(l.last_clicked_at, a.last_at), a.last_at))
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_log FROM upd;

  WITH agg AS (
    SELECT s.id,
           min(e.created_at) AS first_at,
           max(e.created_at) AS last_at,
           count(*)::integer AS cnt,
           (array_agg(e.target_url ORDER BY e.created_at DESC)
              FILTER (WHERE e.target_url IS NOT NULL))[1] AS last_url
    FROM public.mass_email_sends s
    JOIN public.email_send_log l ON l.resend_id = s.resend_id
    JOIN public.email_engagement_events e ON e.message_id::text = l.message_id
    WHERE e.event_type = 'click'
      AND e.created_at >= v_start
      AND s.resend_id IS NOT NULL
      AND (p_message_id IS NULL OR e.message_id = p_message_id)
    GROUP BY s.id
  ), upd AS (
    UPDATE public.mass_email_sends s
       SET first_clicked_at = LEAST(COALESCE(s.first_clicked_at, a.first_at), a.first_at),
           last_clicked_at  = GREATEST(COALESCE(s.last_clicked_at, a.last_at), a.last_at),
           click_count      = GREATEST(s.click_count, a.cnt),
           last_clicked_url = COALESCE(a.last_url, s.last_clicked_url)
      FROM agg a
     WHERE s.id = a.id
       AND (s.click_count < a.cnt
            OR s.first_clicked_at IS DISTINCT FROM LEAST(COALESCE(s.first_clicked_at, a.first_at), a.first_at)
            OR s.last_clicked_at IS DISTINCT FROM GREATEST(COALESCE(s.last_clicked_at, a.last_at), a.last_at))
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_mass FROM upd;

  RETURN QUERY SELECT v_log, v_mass;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_email_click_events(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_email_click_events(uuid) TO service_role;

-- Propagation immédiate à chaque clic capté.
CREATE OR REPLACE FUNCTION public.tg_email_click_reconcile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type = 'click' AND NEW.created_at >= public.email_tracking_start() THEN
    PERFORM public.reconcile_email_click_events(NEW.message_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_click_reconcile ON public.email_engagement_events;
CREATE TRIGGER trg_email_click_reconcile
AFTER INSERT ON public.email_engagement_events
FOR EACH ROW EXECUTE FUNCTION public.tg_email_click_reconcile();

-- Backfill historique, borné à la date de mise en service du suivi.
SELECT public.reconcile_email_click_events();

-- Vue de contrôle : taux de clic réel par gabarit.
CREATE OR REPLACE VIEW public.email_click_rates
WITH (security_invoker = on) AS
SELECT l.template_name,
       date_trunc('day', l.created_at)::date AS send_day,
       count(*)::integer AS sent,
       count(*) FILTER (WHERE l.first_opened_at IS NOT NULL)::integer AS opened,
       count(*) FILTER (WHERE l.first_clicked_at IS NOT NULL)::integer AS clicked,
       round(100.0 * count(*) FILTER (WHERE l.first_clicked_at IS NOT NULL) / NULLIF(count(*), 0), 2) AS click_rate_pct,
       round(100.0 * count(*) FILTER (WHERE l.first_clicked_at IS NOT NULL)
             / NULLIF(count(*) FILTER (WHERE l.first_opened_at IS NOT NULL), 0), 2) AS click_to_open_pct,
       sum(l.click_count)::integer AS total_clicks
FROM public.email_send_log l
WHERE l.status = 'sent'
  AND l.created_at >= public.email_tracking_start()
GROUP BY 1, 2;

-- Vue de contrôle : taux de clic réel par campagne de masse.
CREATE OR REPLACE VIEW public.mass_email_click_rates
WITH (security_invoker = on) AS
SELECT m.id AS mass_email_id,
       m.subject,
       m.dedupe_key,
       m.created_at,
       count(s.*)::integer AS recipients,
       count(s.*) FILTER (WHERE s.resend_id IS NOT NULL)::integer AS mapped_to_provider,
       count(s.*) FILTER (WHERE s.first_opened_at IS NOT NULL)::integer AS opened,
       count(s.*) FILTER (WHERE s.first_clicked_at IS NOT NULL)::integer AS clicked,
       round(100.0 * count(s.*) FILTER (WHERE s.first_clicked_at IS NOT NULL) / NULLIF(count(s.*), 0), 2) AS click_rate_pct,
       round(100.0 * count(s.*) FILTER (WHERE s.first_clicked_at IS NOT NULL)
             / NULLIF(count(s.*) FILTER (WHERE s.first_opened_at IS NOT NULL), 0), 2) AS click_to_open_pct,
       sum(s.click_count)::integer AS total_clicks
FROM public.mass_emails m
LEFT JOIN public.mass_email_sends s ON s.mass_email_id = m.id
GROUP BY m.id, m.subject, m.dedupe_key, m.created_at;

GRANT SELECT ON public.email_click_rates TO authenticated;
GRANT SELECT ON public.mass_email_click_rates TO authenticated;
GRANT SELECT ON public.email_click_rates TO service_role;
GRANT SELECT ON public.mass_email_click_rates TO service_role;