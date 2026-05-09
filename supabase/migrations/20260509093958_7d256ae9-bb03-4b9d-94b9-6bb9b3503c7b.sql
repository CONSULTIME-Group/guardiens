
CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  product_emails boolean NOT NULL DEFAULT true,
  digest_emails boolean NOT NULL DEFAULT true,
  alert_emails boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own email prefs" ON public.email_preferences;
CREATE POLICY "Users view own email prefs"
  ON public.email_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own email prefs" ON public.email_preferences;
CREATE POLICY "Users insert own email prefs"
  ON public.email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own email prefs" ON public.email_preferences;
CREATE POLICY "Users update own email prefs"
  ON public.email_preferences FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_email_preferences_updated_at ON public.email_preferences;
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lookup by email (for service-side gating). SECURITY DEFINER so service-role
-- bypasses RLS but no extra exposure to anon (anon still needs the email which
-- it already has). We restrict EXECUTE to authenticated + service_role.
CREATE OR REPLACE FUNCTION public.get_email_preferences_by_email(p_email text)
RETURNS TABLE(user_id uuid, product_emails boolean, digest_emails boolean, alert_emails boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         COALESCE(ep.product_emails, true),
         COALESCE(ep.digest_emails, true),
         COALESCE(ep.alert_emails, true)
  FROM public.profiles p
  LEFT JOIN public.email_preferences ep ON ep.user_id = p.id
  WHERE lower(p.email) = lower(p_email)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_email_preferences_by_email(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_email_preferences_by_email(text) TO authenticated, service_role;

-- Authenticated user upserts their own prefs in one call
CREATE OR REPLACE FUNCTION public.upsert_my_email_preferences(
  p_product boolean,
  p_digest boolean,
  p_alert boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  INSERT INTO public.email_preferences (user_id, product_emails, digest_emails, alert_emails)
  VALUES (auth.uid(), COALESCE(p_product, true), COALESCE(p_digest, true), COALESCE(p_alert, true))
  ON CONFLICT (user_id) DO UPDATE
    SET product_emails = EXCLUDED.product_emails,
        digest_emails = EXCLUDED.digest_emails,
        alert_emails = EXCLUDED.alert_emails,
        updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_my_email_preferences(boolean, boolean, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.upsert_my_email_preferences(boolean, boolean, boolean) TO authenticated;

-- Allow handle-email-unsubscribe (service role) to update via email_unsubscribe_tokens lookup
CREATE OR REPLACE FUNCTION public.set_email_preferences_by_token(
  p_token text,
  p_product boolean,
  p_digest boolean,
  p_alert boolean
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_user_id uuid;
BEGIN
  SELECT email INTO v_email
  FROM public.email_unsubscribe_tokens
  WHERE token = p_token;

  IF v_email IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_user_id FROM public.profiles WHERE lower(email) = lower(v_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.email_preferences (user_id, product_emails, digest_emails, alert_emails)
  VALUES (v_user_id, COALESCE(p_product, true), COALESCE(p_digest, true), COALESCE(p_alert, true))
  ON CONFLICT (user_id) DO UPDATE
    SET product_emails = EXCLUDED.product_emails,
        digest_emails = EXCLUDED.digest_emails,
        alert_emails = EXCLUDED.alert_emails,
        updated_at = now();
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_email_preferences_by_token(text, boolean, boolean, boolean) FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.set_email_preferences_by_token(text, boolean, boolean, boolean) TO service_role;
