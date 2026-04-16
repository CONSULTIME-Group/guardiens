CREATE OR REPLACE FUNCTION public.get_user_email_for_notification(target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = target_user_id LIMIT 1;
$$;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION public.get_user_email_for_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_email_for_notification(uuid) TO authenticated;