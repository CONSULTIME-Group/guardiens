-- One provider submission owner per canonical member email intent.
-- No lease stealing: after an ambiguous provider result, retrying could duplicate mail.
CREATE TABLE public.member_email_send_claims (
  claim_key text PRIMARY KEY CHECK (claim_key ~ '^[0-9a-f]{64}$'),
  owner_token uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('sending', 'sent', 'retryable', 'uncertain')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_email_send_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.member_email_send_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.member_email_send_claims TO service_role;

CREATE FUNCTION public.acquire_member_email_send_claim(p_claim_key text, p_owner_token uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_state text;
BEGIN
  IF p_claim_key IS NULL OR p_claim_key !~ '^[0-9a-f]{64}$' OR p_owner_token IS NULL THEN
    RAISE EXCEPTION 'invalid send claim' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.member_email_send_claims AS existing (claim_key, owner_token, state)
  VALUES (p_claim_key, p_owner_token, 'sending')
  ON CONFLICT (claim_key) DO UPDATE
    SET owner_token = EXCLUDED.owner_token, state = 'sending', updated_at = now()
    WHERE existing.state = 'retryable'
  RETURNING state INTO v_state;
  IF FOUND THEN RETURN 'acquired'; END IF;
  SELECT state INTO v_state FROM public.member_email_send_claims WHERE claim_key = p_claim_key;
  RETURN CASE WHEN v_state = 'sent' THEN 'sent' WHEN v_state = 'uncertain' THEN 'uncertain' ELSE 'busy' END;
END;
$$;

CREATE FUNCTION public.finish_member_email_send_claim(p_claim_key text, p_owner_token uuid, p_outcome text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('sent', 'retryable', 'uncertain') THEN
    RAISE EXCEPTION 'invalid send outcome' USING ERRCODE = '22023';
  END IF;
  UPDATE public.member_email_send_claims SET state = p_outcome, updated_at = now()
    WHERE claim_key = p_claim_key AND owner_token = p_owner_token AND state = 'sending';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_member_email_send_claim(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_member_email_send_claim(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_member_email_send_claim(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_member_email_send_claim(text, uuid, text) TO service_role;
