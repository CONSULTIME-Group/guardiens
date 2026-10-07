CREATE OR REPLACE FUNCTION public.push_renew_subscription(
  p_user_id uuid, p_subscription_id uuid, p_endpoint text, p_endpoint_host text, p_auth_key text, p_p256dh_key text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.push_subscriptions%ROWTYPE;
  v_other uuid;
BEGIN
  IF p_user_id IS NULL OR p_subscription_id IS NULL OR coalesce(p_endpoint,'') = ''
     OR coalesce(p_auth_key,'') = '' OR coalesce(p_p256dh_key,'') = '' THEN
    RETURN 'invalid_input';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('push_devices:' || p_user_id::text, 0));
  SELECT * INTO v_row FROM public.push_subscriptions WHERE id = p_subscription_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  -- Seule une adresse perdue côté service de push (404, 410) se renouvelle.
  -- Une désactivation par le membre supprime la ligne ou porte un autre motif.
  IF NOT v_row.enabled AND coalesce(v_row.disabled_reason, '') NOT IN ('http_404','http_410') THEN
    RETURN 'not_renewable';
  END IF;
  SELECT id INTO v_other FROM public.push_subscriptions WHERE endpoint = p_endpoint AND id <> p_subscription_id;
  IF v_other IS NOT NULL THEN
    RETURN 'endpoint_in_use';
  END IF;
  UPDATE public.push_subscriptions
     SET endpoint = p_endpoint, endpoint_host = p_endpoint_host, auth_key = p_auth_key, p256dh_key = p_p256dh_key,
         enabled = true, disabled_at = NULL, disabled_reason = NULL, updated_at = now()
   WHERE id = p_subscription_id;
  RETURN 'renewed';
END;
$$;
REVOKE ALL ON FUNCTION public.push_renew_subscription(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_renew_subscription(uuid, uuid, text, text, text, text) TO service_role;
COMMENT ON FUNCTION public.push_renew_subscription(uuid, uuid, text, text, text, text) IS 'Lot 0b : remplace l adresse d un abonnement du membre perdu en 404 ou 410, préférences opt_in conservées.';