CREATE TABLE IF NOT EXISTS public.email_deep_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  target_path text NOT NULL,
  template_name text,
  message_id uuid,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_deep_link_tokens_user_idx ON public.email_deep_link_tokens (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_deep_link_tokens_consumed_idx ON public.email_deep_link_tokens (consumed_at);

GRANT ALL ON public.email_deep_link_tokens TO service_role;

ALTER TABLE public.email_deep_link_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deep_link_tokens_admin_read"
ON public.email_deep_link_tokens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.create_email_deep_link(
  p_email text,
  p_target_path text,
  p_conversation_id uuid DEFAULT NULL,
  p_template_name text DEFAULT NULL,
  p_message_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_token text;
BEGIN
  IF p_email IS NULL OR p_target_path IS NULL OR left(p_target_path, 1) <> '/' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_conversation_id IS NOT NULL THEN
    PERFORM 1 FROM public.conversations c
      WHERE c.id = p_conversation_id
        AND (c.owner_id = v_user_id OR c.sitter_id = v_user_id);
    IF NOT FOUND THEN
      RETURN NULL;
    END IF;
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.email_deep_link_tokens
    (token, user_id, conversation_id, target_path, template_name, message_id, expires_at)
  VALUES
    (v_token, v_user_id, p_conversation_id, p_target_path, p_template_name, p_message_id, now() + interval '24 hours');

  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_email_deep_link(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_email text;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{40,128}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT * INTO r FROM public.email_deep_link_tokens WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF r.consumed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'consumed', 'target_path', r.target_path);
  END IF;

  IF r.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired', 'target_path', r.target_path);
  END IF;

  IF r.conversation_id IS NOT NULL THEN
    PERFORM 1 FROM public.conversations c
      WHERE c.id = r.conversation_id
        AND (c.owner_id = r.user_id OR c.sitter_id = r.user_id);
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
    END IF;
  END IF;

  UPDATE public.email_deep_link_tokens
     SET consumed_at = now()
   WHERE id = r.id AND consumed_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'consumed', 'target_path', r.target_path);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = r.user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'email', v_email,
    'target_path', r.target_path,
    'template_name', r.template_name,
    'message_id', r.message_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_email_deep_link(text, text, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_email_deep_link(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_email_deep_link(text, text, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_email_deep_link(text) TO service_role;