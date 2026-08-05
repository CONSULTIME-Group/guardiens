CREATE TABLE IF NOT EXISTS public.sit_notification_claim_stats (
  day date NOT NULL DEFAULT (timezone('Europe/Paris', now()))::date,
  source text NOT NULL,
  granted integer NOT NULL DEFAULT 0,
  refused integer NOT NULL DEFAULT 0,
  held_by jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, source)
);

GRANT SELECT ON public.sit_notification_claim_stats TO authenticated;
GRANT ALL ON public.sit_notification_claim_stats TO service_role;

ALTER TABLE public.sit_notification_claim_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read claim stats"
ON public.sit_notification_claim_stats
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_claim_outcome(
  _source text,
  _granted integer DEFAULT 0,
  _refused integer DEFAULT 0,
  _held_by jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _day date := (timezone('Europe/Paris', now()))::date;
BEGIN
  INSERT INTO public.sit_notification_claim_stats AS s (day, source, granted, refused, held_by, updated_at)
  VALUES (_day, _source, GREATEST(_granted, 0), GREATEST(_refused, 0), COALESCE(_held_by, '{}'::jsonb), now())
  ON CONFLICT (day, source) DO UPDATE
  SET granted = s.granted + GREATEST(_granted, 0),
      refused = s.refused + GREATEST(_refused, 0),
      held_by = s.held_by || COALESCE(_held_by, '{}'::jsonb),
      updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_claim_outcome(text, integer, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_claim_outcome(text, integer, integer, jsonb) TO service_role;

CREATE OR REPLACE VIEW public.admin_sit_notification_claims_daily
WITH (security_invoker = true)
AS
WITH logged AS (
  SELECT (timezone('Europe/Paris', created_at))::date AS day,
         source,
         count(*)::integer AS logged_claims
  FROM public.sit_notification_log
  GROUP BY 1, 2
)
SELECT COALESCE(s.day, l.day) AS day,
       COALESCE(s.source, l.source) AS source,
       COALESCE(l.logged_claims, 0) AS creneaux_obtenus,
       COALESCE(s.granted, 0) AS reservations_accordees,
       COALESCE(s.refused, 0) AS reservations_refusees,
       CASE
         WHEN COALESCE(s.granted, 0) + COALESCE(s.refused, 0) = 0 THEN 0
         ELSE round(100.0 * COALESCE(s.refused, 0) / (COALESCE(s.granted, 0) + COALESCE(s.refused, 0)), 1)
       END AS taux_refus_pct,
       s.held_by
FROM public.sit_notification_claim_stats s
FULL OUTER JOIN logged l ON l.day = s.day AND l.source = s.source
ORDER BY 1 DESC, 2;

GRANT SELECT ON public.admin_sit_notification_claims_daily TO authenticated;