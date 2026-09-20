BEGIN;
-- Operator-only test audit. No source events or production queue jobs created.
CREATE TABLE public.push_test_attempts (
  request_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  finished_at timestamptz,
  outcome text NOT NULL DEFAULT 'attempting' CHECK (outcome IN ('attempting','accepted','rejected','unknown','skipped')),
  provider_status integer CHECK (provider_status BETWEEN 100 AND 599)
);
CREATE INDEX push_test_attempts_user_time ON public.push_test_attempts(user_id,created_at DESC);
ALTER TABLE public.push_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_test_attempts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_test_attempts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.push_test_attempts TO service_role;

CREATE FUNCTION public.push_claim_test(p_request_id uuid,p_user_id uuid,p_subscription_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_request_id IS NULL OR p_user_id IS NULL OR p_subscription_id IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('push-test:' || p_user_id::text,0));
  -- Same request is never replayed, even after a timeout or a process crash.
  IF EXISTS (SELECT 1 FROM push_test_attempts WHERE request_id=p_request_id)
     OR EXISTS (SELECT 1 FROM push_test_attempts WHERE user_id=p_user_id AND created_at>clock_timestamp()-interval '5 minutes')
  THEN RETURN false; END IF;
  PERFORM 1 FROM push_subscriptions WHERE id=p_subscription_id AND user_id=p_user_id
    AND enabled AND opt_in_messages FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO push_test_attempts(request_id,user_id,subscription_id)
    VALUES(p_request_id,p_user_id,p_subscription_id) ON CONFLICT DO NOTHING;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.push_claim_test(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.push_claim_test(uuid,uuid,uuid) TO service_role;
COMMIT;
