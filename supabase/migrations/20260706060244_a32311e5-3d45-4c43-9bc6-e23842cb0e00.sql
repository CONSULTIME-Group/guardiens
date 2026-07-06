
-- 1. Colonne opt-in digest mission
ALTER TABLE public.email_preferences
  ADD COLUMN IF NOT EXISTS new_mission_digest boolean NOT NULL DEFAULT true;

-- 2. File d'attente digest missions
CREATE TABLE IF NOT EXISTS public.mission_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.small_missions(id) ON DELETE CASCADE,
  distance_km numeric(6, 2),
  queued_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'skipped')),
  skip_reason text,
  UNIQUE (helper_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_mission_notif_queue_status
  ON public.mission_notification_queue (status, queued_at);
CREATE INDEX IF NOT EXISTS idx_mission_notif_queue_helper
  ON public.mission_notification_queue (helper_id, queued_at DESC);

GRANT SELECT ON public.mission_notification_queue TO authenticated;
GRANT ALL ON public.mission_notification_queue TO service_role;

ALTER TABLE public.mission_notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read mission queue" ON public.mission_notification_queue;
CREATE POLICY "Admins can read mission queue"
  ON public.mission_notification_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role manages mission queue" ON public.mission_notification_queue;
CREATE POLICY "Service role manages mission queue"
  ON public.mission_notification_queue FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Idempotence server-side des events mission
CREATE TABLE IF NOT EXISTS public.mission_event_idempotency (
  event_key text PRIMARY KEY,
  event_type text NOT NULL,
  mission_id uuid,
  target_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mission_event_idem_created
  ON public.mission_event_idempotency (created_at);

GRANT ALL ON public.mission_event_idempotency TO service_role;

ALTER TABLE public.mission_event_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages idempotency" ON public.mission_event_idempotency;
CREATE POLICY "Service role manages idempotency"
  ON public.mission_event_idempotency FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. Trigger: à chaque nouvelle mission open, enqueue les helpers éligibles ≤ 30 km
CREATE OR REPLACE FUNCTION public.enqueue_helpers_for_new_mission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_radius_km numeric := 30;
BEGIN
  IF NEW.status <> 'open' OR NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.mission_notification_queue (helper_id, mission_id, distance_km)
  SELECT
    p.id,
    NEW.id,
    ROUND(
      (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(NEW.latitude::double precision))
            * cos(radians(p.latitude::double precision))
            * cos(radians(p.longitude::double precision) - radians(NEW.longitude::double precision))
            + sin(radians(NEW.latitude::double precision))
            * sin(radians(p.latitude::double precision))
          ))
        )
      )::numeric,
      2
    ) AS distance_km
  FROM public.profiles p
  LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
  LEFT JOIN public.suppressed_emails se ON lower(se.email) = lower(p.email)
  WHERE p.id <> NEW.user_id
    AND p.email IS NOT NULL
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND COALESCE(p.profile_completion, 0) >= 40
    AND COALESCE(ep.new_mission_digest, true) = true
    AND COALESCE(ep.product_emails, true) = true
    AND se.email IS NULL
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(NEW.latitude::double precision))
          * cos(radians(p.latitude::double precision))
          * cos(radians(p.longitude::double precision) - radians(NEW.longitude::double precision))
          + sin(radians(NEW.latitude::double precision))
          * sin(radians(p.latitude::double precision))
        ))
      )
    ) <= v_radius_km
  ON CONFLICT (helper_id, mission_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_helpers_on_new_mission ON public.small_missions;
CREATE TRIGGER trg_notify_helpers_on_new_mission
  AFTER INSERT ON public.small_missions
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_helpers_for_new_mission();

-- 5. Helper d'idempotence appelable côté serveur (edge function via service role)
CREATE OR REPLACE FUNCTION public.claim_mission_event(
  _event_type text,
  _mission_id uuid,
  _target_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_inserted uuid;
BEGIN
  v_key := 'mission-event-' || _event_type
        || '-' || COALESCE(_mission_id::text, 'none')
        || '-' || COALESCE(_target_id::text, 'none')
        || '-' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');

  INSERT INTO public.mission_event_idempotency (event_key, event_type, mission_id, target_id)
  VALUES (v_key, _event_type, _mission_id, _target_id)
  ON CONFLICT (event_key) DO NOTHING
  RETURNING event_key INTO v_inserted;

  RETURN v_inserted IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_mission_event(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_mission_event(text, uuid, uuid) TO service_role;
